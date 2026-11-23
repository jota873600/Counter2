// @ts-nocheck
/**
 * Servidor multiplayer autoritativo (WebSocket em /game-ws).
 * - Identidade (ID de 6 caracteres + nome), amigos com pedidos, status online/em partida.
 * - Salas com código, modo 1v1–4v4, mapa/tema, dificuldade dos bots, times, "pronto", convites.
 * - Partida: Sim a 30 Hz, comandos dos clientes com reconciliação, bot substitui quem sai.
 * Anexado ao servidor HTTP do Next.js interceptando 'upgrade' (mesma porta).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { Sim } from '../game/shared/sim';
import { TICK } from '../game/shared/weapons';
import { clampSkin } from '../game/shared/skins';

// DATA_DIR permite apontar para um disco/volume persistente na hospedagem (amigos e IDs ficam salvos ali).
const DATA = path.join(process.env.DATA_DIR || path.join(process.cwd(), '.data'), 'social.json');
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOTNAMES = ['Alfa', 'Bravo', 'Cobra', 'Delta', 'Eco', 'Fênix', 'Gamma', 'Hélix'];

const users = new Map(); // id -> {id,name,friends:Set,inc:Set,out:Set,room:null}
const conns = new Map(); // id -> conn
const rooms = new Map(); // code -> room
let saveT = null;

function genId(set, len) {
  for (;;) {
    let s = '';
    for (let i = 0; i < len; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    if (!set.has(s)) return s;
  }
}
function load() {
  try {
    const j = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    for (const u of j.users || []) users.set(u.id, { id: u.id, name: u.name, friends: new Set(u.friends), inc: new Set(u.inc), out: new Set(u.out), room: null });
  } catch { /* primeira execução */ }
}
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(DATA), { recursive: true });
      fs.writeFileSync(DATA, JSON.stringify({ users: [...users.values()].map((u) => ({ id: u.id, name: u.name, friends: [...u.friends], inc: [...u.inc], out: [...u.out] })) }));
    } catch { /* ignora falhas de disco */ }
  }, 500);
}
const send = (ws, o) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch { /* socket fechado */ } };
const sendTo = (id, o) => { const c = conns.get(id); if (c) send(c.ws, o); };
const err = (ws, msg) => send(ws, { t: 'err', msg });

function status(id) {
  if (!conns.has(id)) return 'offline';
  const u = users.get(id);
  const r = u && u.room && rooms.get(u.room);
  return r ? (r.state === 'playing' ? 'match' : 'lobby') : 'online';
}
function sendSocial(id) {
  const u = users.get(id);
  if (!u) return;
  const mk = (i) => ({ id: i, name: (users.get(i) || {}).name || i, st: status(i) });
  sendTo(id, { t: 'social', friends: [...u.friends].map(mk), inc: [...u.inc].map(mk), out: [...u.out].map(mk) });
}
function notifyFriends(id) { const u = users.get(id); if (u) for (const f of u.friends) if (conns.has(f)) sendSocial(f); }

/* ---------------- Salas ---------------- */
function roomView(r) {
  return { code: r.code, mode: r.mode, theme: r.theme, diff: r.diff, size: r.size, host: r.host, state: r.state,
    players: [...r.members.values()].map((m) => ({ id: m.id, name: m.name, team: m.team, ready: m.ready, host: m.id === r.host, off: m.disc ? 1 : 0 })) };
}
function broadcastRoom(r) {
  const v = roomView(r);
  for (const m of r.members.values()) if (!m.disc) sendTo(m.id, { t: 'room', room: v });
  for (const m of r.members.values()) sendSocial(m.id);
}
function toRoom(r, o) { for (const m of r.members.values()) if (!m.disc) sendTo(m.id, o); }

function joinRoom(conn, r) {
  const u = users.get(conn.id);
  if (r.members.has(conn.id)) return;
  if (r.state === 'playing') return err(conn.ws, 'Partida em andamento nesta sala');
  if (r.members.size >= r.mode * 2) return err(conn.ws, 'Sala cheia');
  leaveRoom(conn.id, true);
  const cnt = [0, 0];
  for (const m of r.members.values()) cnt[m.team]++;
  const team = cnt[0] <= cnt[1] ? 0 : 1;
  r.members.set(conn.id, { id: conn.id, name: u.name, team, ready: false, disc: false, skin: u.skin | 0 });
  u.room = r.code;
  broadcastRoom(r);
  toRoom(r, { t: 'chat', sys: 1, text: `${u.name} entrou na sala` });
}

function leaveRoom(id, silent) {
  const u = users.get(id);
  if (!u || !u.room) return;
  const r = rooms.get(u.room);
  u.room = null;
  if (!r) return;
  const m = r.members.get(id);
  if (r.state === 'playing' && r.sim) {
    const p = r.sim.players.get(id);
    if (p) { p.bot = true; p.name = p.name + ' (bot)'; }
  }
  r.members.delete(id);
  if (!silent) sendTo(id, { t: 'room', room: null });
  const humans = [...r.members.values()].filter((x) => !x.disc);
  if (!humans.length && r.state === 'lobby') { rooms.delete(r.code); return; }
  if (!humans.length && r.state === 'playing') { r.emptyAt = Date.now(); }
  if (r.host === id && humans.length) r.host = humans[0].id;
  if (m) toRoom(r, { t: 'chat', sys: 1, text: `${m.name} saiu da sala` });
  broadcastRoom(r);
  sendSocial(id);
}

function startMatch(r) {
  const cnt = [[], []];
  for (const m of r.members.values()) cnt[m.team].push(m);
  if (!cnt[0].length && !cnt[1].length) return;
  const sim = new Sim({ mode: r.mode, diff: r.diff, theme: r.theme, limit: r.size === 'auto' ? 0 : r.size });
  let b = 0;
  for (let t = 0; t < 2; t++) {
    for (const m of cnt[t]) sim.addPlayer({ id: m.id, name: m.name, team: t, bot: false, skin: m.skin });
    for (let i = cnt[t].length; i < r.mode; i++) sim.addPlayer({ id: `bot${t}${i}`, name: `Bot ${BOTNAMES[b++ % BOTNAMES.length]}`, team: t, bot: true });
  }
  sim.start();
  r.sim = sim; r.state = 'playing'; r.emptyAt = 0;
  for (const m of r.members.values()) m.ready = false;
  toRoom(r, { t: 'start', cfg: { mode: r.mode, theme: r.theme, limit: sim.limit, diff: r.diff } });
  r.timer = setInterval(() => tickRoom(r), 1000 / TICK);
  broadcastRoom(r);
}

function tickRoom(r) {
  const sim = r.sim;
  if (!sim) return;
  sim.tick(1 / TICK);
  for (const m of r.members.values()) {
    if (m.disc) continue;
    const c = conns.get(m.id);
    if (c) send(c.ws, { t: 'snap', ...sim.snapshot(m.id), ts: Date.now() });
  }
  sim.drainEvents();
  if (sim.over && sim.time >= sim.phaseEnd) {
    clearInterval(r.timer); r.sim = null; r.state = 'lobby';
    for (const m of r.members.values()) { m.ready = false; m.disc = false; }
    toRoom(r, { t: 'matchend' });
    broadcastRoom(r);
  } else if (r.emptyAt && Date.now() - r.emptyAt > 30000) {
    clearInterval(r.timer); rooms.delete(r.code);
    for (const m of r.members.values()) { const u = users.get(m.id); if (u) u.room = null; }
  }
}

/* ---------------- Mensagens ---------------- */
function onMessage(conn, raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (m.t === 'ping') return send(conn.ws, { t: 'pong', ts: m.ts });
  if (m.t === 'hello') return hello(conn, m);
  if (!conn.id) return;
  const u = users.get(conn.id);
  const r = u.room && rooms.get(u.room);
  switch (m.t) {
    case 'cmds': if (r && r.sim && Array.isArray(m.c)) r.sim.queueCmds(conn.id, m.c.slice(0, 8)); break;
    case 'act': if (r && r.sim && m.a) r.sim.action(conn.id, m); break;
    case 'name': {
      const nm = String(m.name || '').trim().slice(0, 16);
      if (nm) { u.name = nm; save(); notifyFriends(conn.id); sendSocial(conn.id); if (r) broadcastRoom(r); }
      break;
    }
    case 'skin': {
      u.skin = clampSkin(m.skin);
      const mem = r && r.members.get(u.id); if (mem) mem.skin = u.skin;
      break;
    }
    case 'friend': return friendOp(conn, u, m);
    case 'room': return roomOp(conn, u, r, m);
    case 'chat': {
      const text = String(m.text || '').slice(0, 140).trim();
      if (!text || !r) return;
      const sender = r.members.get(conn.id);
      if (r.sim && m.team && sender) {
        for (const x of r.members.values()) if (x.team === sender.team) sendTo(x.id, { t: 'chat', from: u.name, team: sender.team, tm: 1, text });
      } else toRoom(r, { t: 'chat', from: u.name, team: sender ? sender.team : 0, text });
      break;
    }
  }
}

function hello(conn, m) {
  let id = String(m.id || '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(id)) id = genId(users, 6);
  let u = users.get(id);
  const nm = String(m.name || '').trim().slice(0, 16) || 'Jogador';
  if (!u) { u = { id, name: nm, friends: new Set(), inc: new Set(), out: new Set(), room: null }; users.set(id, u); }
  else u.name = nm;
  u.skin = clampSkin(m.skin);
  const old = conns.get(id);
  if (old && old !== conn) { try { old.ws.close(4000, 'Conectado em outro lugar'); } catch { /* */ } }
  conn.id = id; conns.set(id, conn);
  save();
  send(conn.ws, { t: 'welcome', id, name: u.name });
  // Reconexão a partida em andamento
  const r = u.room && rooms.get(u.room);
  if (r) {
    const mem = r.members.get(id);
    if (mem) {
      mem.disc = false;
      if (r.sim) {
        const p = r.sim.players.get(id);
        if (p) { p.bot = false; p.name = u.name; p.q = []; }
        r.emptyAt = 0;
        send(conn.ws, { t: 'start', cfg: { mode: r.mode, theme: r.theme, limit: r.sim.limit, diff: r.diff }, re: 1 });
      }
      send(conn.ws, { t: 'room', room: roomView(r) });
    }
  } else u.room = null;
  sendSocial(id); notifyFriends(id);
}

function friendOp(conn, u, m) {
  const find = (q) => {
    q = String(q || '').trim();
    if (!q) return null;
    const up = q.toUpperCase();
    if (users.has(up)) return users.get(up);
    const low = q.toLowerCase();
    let hit = null;
    for (const x of users.values()) if (x.name.toLowerCase() === low) { if (!hit || conns.has(x.id)) hit = x; }
    return hit;
  };
  if (m.op === 'add') {
    const o = find(m.who);
    if (!o) return err(conn.ws, 'Jogador não encontrado (confira o ID ou o nome)');
    if (o.id === u.id) return err(conn.ws, 'Você não pode adicionar a si mesmo');
    if (u.friends.has(o.id)) return err(conn.ws, 'Vocês já são amigos');
    if (u.inc.has(o.id)) { u.inc.delete(o.id); o.out.delete(u.id); u.friends.add(o.id); o.friends.add(u.id); }
    else { u.out.add(o.id); o.inc.add(u.id); }
    send(conn.ws, { t: 'info', msg: u.friends.has(o.id) ? `${o.name} agora é seu amigo!` : `Pedido enviado para ${o.name}` });
    if (conns.has(o.id) && !u.friends.has(o.id)) sendTo(o.id, { t: 'info', msg: `${u.name} (${u.id}) quer ser seu amigo` });
  } else if (m.op === 'accept') {
    const id = String(m.who).toUpperCase(), o = users.get(id);
    if (!o || !u.inc.has(id)) return;
    u.inc.delete(id); o.out.delete(u.id); u.friends.add(id); o.friends.add(u.id);
    sendTo(id, { t: 'info', msg: `${u.name} aceitou seu pedido de amizade` });
  } else if (m.op === 'decline') {
    const id = String(m.who).toUpperCase(), o = users.get(id);
    u.inc.delete(id); if (o) o.out.delete(u.id);
  } else if (m.op === 'remove') {
    const id = String(m.who).toUpperCase(), o = users.get(id);
    u.friends.delete(id); u.out.delete(id); if (o) { o.friends.delete(u.id); o.inc.delete(u.id); }
    if (o) sendSocial(id);
  }
  save(); sendSocial(u.id);
  const o = users.get(String(m.who || '').toUpperCase()) || find(m.who);
  if (o) sendSocial(o.id);
}

function roomOp(conn, u, r, m) {
  switch (m.op) {
    case 'create': {
      leaveRoom(u.id, true);
      const code = genId(rooms, 5);
      const mode = Math.max(1, Math.min(4, m.mode | 0 || 2));
      const nr = { code, mode, theme: m.theme === 'dusk' ? 'dusk' : 'day', diff: Math.max(0, Math.min(2, m.diff ?? 1)), size: 'auto', host: u.id, state: 'lobby', members: new Map(), sim: null, timer: null };
      rooms.set(code, nr);
      nr.members.set(u.id, { id: u.id, name: u.name, team: 0, ready: true, disc: false, skin: u.skin | 0 });
      u.room = code;
      broadcastRoom(nr);
      break;
    }
    case 'join': {
      const rr = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!rr) return err(conn.ws, 'Sala não encontrada. Confira o código.');
      joinRoom(conn, rr);
      break;
    }
    case 'leave': leaveRoom(u.id); break;
    default: {
      if (!r) return err(conn.ws, 'Você não está em uma sala');
      const me = r.members.get(u.id);
      if (m.op === 'team' && r.state === 'lobby') {
        const t = m.team ? 1 : 0, n = [...r.members.values()].filter((x) => x.team === t && x.id !== u.id).length;
        if (n >= r.mode) return err(conn.ws, 'Time cheio');
        me.team = t;
      } else if (m.op === 'ready') me.ready = !me.ready;
      else if (m.op === 'config' && r.host === u.id && r.state === 'lobby') {
        const mode = Math.max(1, Math.min(4, m.mode | 0 || r.mode));
        const cnt = [0, 0];
        for (const x of r.members.values()) cnt[x.team]++;
        if (Math.max(...cnt) > mode) return err(conn.ws, 'Há jogadores demais em um time para este modo');
        r.mode = mode; r.theme = m.theme === 'dusk' ? 'dusk' : 'day'; r.diff = Math.max(0, Math.min(2, m.diff ?? r.diff));
        r.size = [24, 32, 40].includes(m.size) ? m.size : 'auto';
      } else if (m.op === 'start' && r.host === u.id && r.state === 'lobby') {
        const notReady = [...r.members.values()].filter((x) => x.id !== u.id && !x.ready);
        if (notReady.length) return err(conn.ws, `Aguardando: ${notReady.map((x) => x.name).join(', ')}`);
        return startMatch(r);
      } else if (m.op === 'invite') {
        const t = String(m.who || '').toUpperCase();
        if (!u.friends.has(t)) return err(conn.ws, 'Esse jogador não é seu amigo');
        if (!conns.has(t)) return err(conn.ws, 'Seu amigo está offline');
        const tu = users.get(t);
        if (tu.room) return err(conn.ws, 'Seu amigo já está em uma sala');
        sendTo(t, { t: 'invite', from: { id: u.id, name: u.name }, code: r.code });
        return send(conn.ws, { t: 'info', msg: `Convite enviado para ${tu.name}` });
      } else if (m.op === 'kick' && r.host === u.id && m.who !== u.id) {
        const t = String(m.who);
        if (r.members.has(t)) { sendTo(t, { t: 'err', msg: 'Você foi removido da sala' }); leaveRoom(t); return; }
      }
      broadcastRoom(r);
    }
  }
}

function onClose(conn) {
  if (!conn.id || conns.get(conn.id) !== conn) return;
  conns.delete(conn.id);
  const u = users.get(conn.id);
  if (u && u.room) {
    const r = rooms.get(u.room);
    if (r && r.state === 'playing' && r.sim) {
      const mem = r.members.get(conn.id), p = r.sim.players.get(conn.id);
      if (mem) mem.disc = true;
      if (p) { p.bot = true; p.ai = null; }
      toRoom(r, { t: 'chat', sys: 1, text: `${u.name} desconectou — um bot assumiu` });
      if (![...r.members.values()].some((x) => !x.disc)) r.emptyAt = Date.now();
      broadcastRoom(r);
    } else leaveRoom(conn.id, true);
  }
  notifyFriends(conn.id);
}

export function startGameServer() {
  if (globalThis.__gameWss) return;
  load();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  globalThis.__gameWss = wss;
  wss.on('connection', (ws) => {
    const conn = { ws, id: null };
    ws.on('message', (d) => onMessage(conn, d.toString()));
    ws.on('close', () => onClose(conn));
    ws.on('error', () => { /* tratado no close */ });
  });
  // Intercepta upgrades em /game-ws para qualquer http.Server (inclusive o do Next.js)
  const orig = http.Server.prototype.emit;
  http.Server.prototype.emit = function (ev, req, socket, head) {
    if (ev === 'upgrade' && req && req.url && req.url.startsWith('/game-ws')) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
      return true;
    }
    return orig.apply(this, arguments);
  };
  console.log('[game] servidor multiplayer pronto em /game-ws');
}
