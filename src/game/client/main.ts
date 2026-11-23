// @ts-nocheck
/**
 * Orquestração do cliente: telas (menu/lobby/jogo), loop principal, predição + reconciliação do jogador local,
 * interpolação das entidades remotas, tratamento de eventos do servidor (tiros, acertos, explosões),
 * câmera (primeira pessoa/espectador), HUD, áudio e entrada.
 */
import * as THREE from 'three';
import { Engine } from './world';
import { FX } from './fx';
import { ViewModel } from './viewmodel';
import { buildCharacter, setCharWeapon, animateCharacter, buildWeapon, MAT } from './models';
import { GameAudio } from './audio';
import { Input } from './input';
import { TouchControls } from './touch';
import { HUD, key, TEAM } from './ui';
import { Menus } from './menus';
import { NetClient, LocalTransport } from './net';
import { settings, saveSettings, bindLabel, loadIdentity, saveIdentity } from './settings';
import { getMap } from '../shared/map';
import { movePlayer, eyeH, losClear } from '../shared/physics';
import { W, PL } from '../shared/weapons';
import { CSS } from './styles';
import { clampSkin } from '../shared/skins';

const R2D = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TEAM_COL = [0x3a7bd5, 0xe8832a], SLEEVE = [0x3d6fb0, 0xc2702a];
const SCOPE = [0.3, 0.11];
const SLOTS = { slot1: 'primary', slot2: 'secondary', slot3: 'knife', slot4: 'grenade', slot5: 'medkit' };
const PHN = { buy: 'COMPRA', live: 'AÇÃO', roundEnd: 'FIM DO ROUND', matchEnd: 'FIM DE JOGO', lobby: '...' };
const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
const kindOf = (id) => { const w = W[id]; return !w ? 'gun' : w.slot === 'knife' ? 'knife' : w.slot === 'grenade' || w.slot === 'medkit' ? 'nade' : 'gun'; };

export function startApp(root) { return new App(root); }

class App {
  constructor(root) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root.id = 'game-root'; root.innerHTML = '<canvas id="gc"></canvas>';
    this.root = root; this.canvas = root.querySelector('#gc');
    this.audio = new GameAudio(); this.audio.setVolume(settings.volume);
    this.identity = loadIdentity();
    if (!this.identity.name) { this.identity.name = 'Jogador' + Math.floor(Math.random() * 900 + 100); saveIdentity(this.identity); }
    this.engine = new Engine(this.canvas, settings.quality);
    this.fx = new FX(this.engine.scene, this.engine);
    this.vm = new ViewModel(this.engine.vmScene, this.engine.vmCam, (n) => this.audio.play(n));
    this.net = new NetClient((m) => this.onNet(m), (s) => { this.menus.setStatus(s); this.netStatus(s); });
    this.hud = new HUD(root, this);
    this.menus = new Menus(root, this);
    this.input = new Input(this.canvas, {
      onAction: (a, e) => this.onAction(a, e), onLockChange: (l) => this.onLockChange(l), onLockFail: (r) => this.onLockFail(r),
      onMode: (m) => this.onMode(m), onWheel: (d) => this.onWheel(d), capture: null,
    });
    this.touch = new TouchControls(root, this.input, { onAction: (a) => this.onAction(a) });
    this.screen = 'menu'; this.modals = 0; this.chatOpen = false; this.transport = null;
    this.social = { friends: [], inc: [], out: [] }; this.room = null; this.dropMeshes = new Map(); this.nadeMeshes = new Map();
    this.last = performance.now(); this.fpsT = 0; this.fpsN = 0; this.fps = 0;
    this.ids = this.identity.id;
    this.net.connect({ id: this.identity.id, name: this.identity.name, skin: clampSkin(settings.skin) });
    addEventListener('keydown', (e) => { if (e.code === 'Escape') this.onEscape(); });
    this.menus.main();
    if (this.input.effectiveMode() === 'kbm' && !settings.helpSeen) this.hud.showHelp(true);
    this.onMode(this.input.effectiveMode());
    addEventListener('pointerdown', () => this.audio.init(), { once: false });
    addEventListener('keydown', () => this.audio.init());
    requestAnimationFrame((t) => this.frame(t));
  }

  netStatus(s) {
    if (this.screen !== 'game' || this.transport !== this.net) return;
    if (s === 'closed') this.hud.toast('Conexão perdida. Tentando reconectar… (um bot assume seu lugar se demorar)', 'e', 5000);
    else if (s === 'open') this.hud.toast('Reconectado ao servidor');
  }
  saveSettings() { saveSettings(); }
  applySettings(k) {
    if (k === 'quality') this.engine.setQuality(settings.quality);
    if (k === 'volume') this.audio.setVolume(settings.volume);
  }
  onMode(m) {
    this.hud.buildKeybar();
    if (this.screen === 'game') {
      if (m === 'touch') this.hud.lockOverlay(null);
      else if (!this.input.active() && !this.modals) this.hud.lockOverlay('continue');
    }
  }

  /* ---------------- Modais e Pointer Lock ---------------- */
  beforeModal() { this.modals++; if (this.screen === 'game') { this.input.exitLock(); this.hud.lockOverlay(null); } }
  afterModal() {
    this.modals = Math.max(0, this.modals - 1);
    if (this.screen === 'game' && this.modals === 0 && this.input.effectiveMode() !== 'touch') {
      this.hud.lockOverlay('continue'); this.input.requestLock(); // tecla/clique de fechar conta como gesto do usuário
    }
  }
  onLockChange(locked) {
    if (this.screen !== 'game') return;
    if (locked) { this.hud.lockOverlay(null); document.body.style.cursor = 'none'; }
    else { document.body.style.cursor = ''; if (this.modals === 0 && this.input.effectiveMode() !== 'touch') this.hud.lockOverlay(this.input.fallback && !this.input.fallbackActive ? 'fail' : 'continue', this.failReason); }
  }
  onLockFail(reason) { this.failReason = reason; if (this.screen === 'game' && this.modals === 0) this.hud.lockOverlay('fail', reason); }
  onEscape() {
    if (this.screen === 'game' && this.input.fallbackActive && !this.input.locked && !this.modals && !this.hud.shopOpen && !this.chatOpen) { this.input.exitLock(); this.hud.lockOverlay('fail', this.failReason); return; }
    if (this.chatOpen) return this.closeChat();
    if (this.hud.shopOpen) return this.closeShop();
    if (this.hud.helpOpen()) return this.hud.showHelp(false);
    const s = document.querySelector('.set'); if (s) { s.querySelector('[data-x=close]').click(); }
  }
  openFullscreenOrTab() {
    const el = document.documentElement, inFrame = window.self !== window.top;
    try { if (el.requestFullscreen) el.requestFullscreen().then(() => setTimeout(() => this.input.requestLock(), 150)).catch(() => {}); } catch { /* */ }
    if (inFrame || !el.requestFullscreen) window.open(location.href, '_blank');
  }
  onWheel(d) { if (this.screen === 'game' && W[this.you && this.you.wid] && W[this.you.wid].scope) this.zoom = d > 0 ? 0 : 1; }

  /* ---------------- Rede ---------------- */
  roomCmd(o) { if (!this.net.send({ t: 'room', ...o })) this.hud.toast('Sem conexão com o servidor. Tente novamente em instantes.', 'e'); }
  setSkin(i) { settings.skin = clampSkin(i); saveSettings(); this.net.send({ t: 'skin', skin: settings.skin }); }
  setName(n) { n = n.trim().slice(0, 16); if (!n) return; this.identity.name = n; saveIdentity(this.identity); this.net.send({ t: 'name', name: n }); }

  onNet(m) {
    switch (m.t) {
      case 'welcome': this.identity.id = m.id; this.identity.name = m.name; saveIdentity(this.identity); { const c = document.querySelector('[data-x=id]'); if (c) c.textContent = m.id; } break;
      case 'social': this.social = m; this.menus.friends(); break;
      case 'info': this.hud.toast(m.msg); break;
      case 'err': this.hud.toast(m.msg, 'e', 4200); this.audio.play('deny'); break;
      case 'room':
        this.room = m.room;
        if (this.screen !== 'game') { if (m.room) this.menus.lobby(); else { this.menus.screen = ''; this.menus.main(); } }
        break;
      case 'invite': {
        const d = this.hud.toastHtml(`<span><b>${m.from.name}</b> convidou você para uma sala</span><button class="btn ok sm">Entrar</button>`, 'inv', 20000);
        d.querySelector('button').onclick = () => { this.roomCmd({ op: 'join', code: m.code }); d.remove(); };
        this.audio.play('ui'); break;
      }
      case 'start': if (this.screen !== 'game') this.beginMatch(this.net, this.identity.id, m.cfg); break;
      case 'snap': this.onSnap(m); break;
      case 'chat': {
        const txt = m.sys ? `<i>${m.text}</i>` : `<b class="t${m.team}">${m.from}${m.tm ? ' (time)' : ''}:</b> ${String(m.text).replace(/</g, '&lt;')}`;
        if (this.screen === 'game') this.hud.chatLine(txt); else this.menus.lobbyChat(txt, m.sys ? 'sys' : '');
        break;
      }
      case 'matchend': if (this.screen === 'game') this.leaveGame(); break;
    }
  }

  startOffline(cfg) {
    this.audio.init();
    const t = new LocalTransport(cfg, this.identity.name, (m) => this.onNet(m), clampSkin(settings.skin));
    this.beginMatch(t, 'LOCAL', { theme: cfg.theme, limit: t.limit });
  }

  beginMatch(transport, myId, cfg) {
    this.audio.init();
    this.transport = transport; this.myId = myId; this.screen = 'game';
    document.body.classList.add('in-game'); this.menus.show(false);
    this.map = getMap(cfg.limit);
    this.engine.loadMap(this.map, cfg.theme); this.fx.initPhysics(this.map); this.hud.buildMinimap(this.map);
    this.snaps = []; this.chars = new Map(); this.me = null; this.pending = []; this.out = []; this.seq = 0; this.acc = 0; this.sendT = 0;
    this.you = null; this.world = null; this.phase = 'buy'; this.yaw = 0; this.pitch = 0; this.punch = [0, 0]; this.zoom = 0; this.rlLatch = false; this.jumpUntil = 0;
    this.dmg = 0; this.deadT = 0; this.spectate = null; this.ys = 0; this.spotted = new Set(); this.spotT = 0; this.rd = 0; this.lastCur = ''; this.dyaw = 0; this.dpitch = 0; this.myTeam = 0;
    this.modals = this.hud.helpOpen() ? 1 : 0;
    this.hud.chatLine('<i>Dica: Enter abre o chat rápido.</i>');
    if (this.input.effectiveMode() === 'kbm' && !this.input.locked) this.hud.lockOverlay('play');
    if (this.input.effectiveMode() === 'kbm' && !settings.helpSeen && !this.hud.helpOpen()) this.hud.showHelp(true);
  }

  leaveGame() {
    this.input.exitLock(); this.hud.lockOverlay(null); this.hud.openShop(false); this.hud.scoreboard(false);
    for (const c of this.chars.values()) this.engine.scene.remove(c.obj);
    for (const m of [...this.dropMeshes.values(), ...this.nadeMeshes.values()]) this.engine.scene.remove(m);
    this.dropMeshes.clear(); this.nadeMeshes.clear();
    if (this.transport && this.transport.disconnect) this.transport.disconnect();
    this.transport = null; this.screen = 'menu'; this.modals = 0; this.vm.root.visible = false;
    document.body.classList.remove('in-game'); document.body.style.cursor = '';
    this.menus.show(true); this.menus.screen = ''; if (this.room) this.menus.lobby(); else this.menus.main();
  }
  quitMatch() { if (this.transport === this.net) this.roomCmd({ op: 'leave' }); this.room = this.transport === this.net ? null : this.room; this.leaveGame(); }

  /* ---------------- Ações do jogador ---------------- */
  act(o) { if (this.transport) this.transport.act(o); }
  onAction(a, e) {
    if (a === 'chatsend') { if (this.screen === 'game' && this.chatOpen) this.sendChat(); return; }
    if (a === 'help') { this.hud.showHelp(!this.hud.helpOpen()); return; }
    if (this.screen !== 'game') return;
    if (a === 'chat') { if (!this.chatOpen && !this.modals) this.openChat(); return; }
    if (a === 'shop') { if (this.hud.shopOpen) this.closeShop(); else if (!this.modals) this.openShop(); return; }
    if (this.modals || !this.input.active()) return;
    if (a === 'jumpTap') { this.jumpUntil = performance.now() + 140; return; }
    if (a === 'jump' && this.you && !this.you.al) { this.cycleSpectate(); return; }
    if (a === 'reload') { this.rlLatch = true; return; }
    if (SLOTS[a]) return this.act({ a: 'sel', w: SLOTS[a] });
    if (a === 'grenade') return this.act({ a: 'sel', w: 'grenade' });
    if (a === 'prev') return this.act({ a: 'sel', w: 'prev' });
    if (a === 'medkit') return this.act({ a: 'med' });
    if (a === 'use') return this.act({ a: 'use' });
    if (a === 'drop') return this.act({ a: 'drop' });
  }
  openShop() { this.beforeModal(); this.hud.openShop(true); this.audio.play('ui'); }
  closeShop() { if (!this.hud.shopOpen) return; this.hud.openShop(false); this.afterModal(); }
  openChat() { this.chatOpen = true; this.beforeModal(); this.hud.chatIn.classList.remove('hide'); this.hud.chatIn.value = ''; setTimeout(() => this.hud.chatIn.focus(), 0); }
  closeChat() { this.chatOpen = false; this.hud.chatIn.classList.add('hide'); this.hud.chatIn.blur(); this.afterModal(); }
  sendChat() { const t = this.hud.chatIn.value.trim(); if (t) this.transport.chat(t, true); this.closeChat(); }

  buy(item) {
    const y = this.you; if (!y) return;
    const d = W[item] || { price: item === 'vest' ? 650 : item === 'vesthelm' ? (y.ar >= 100 ? 350 : 1000) : 0 };
    const deny = (msg) => { this.audio.play('deny'); this.hud.toast(msg, 'e', 1800); this.hud.shopFeedback(item, false); };
    if (!y.al) return deny('Você está morto');
    if (this.phase !== 'buy') return deny('Compras só na fase de compra');
    if (y.mo < d.price) return deny('Dinheiro insuficiente');
    this.act({ a: 'buy', item });
  }

  cycleSpectate() {
    const ps = this.world.ps.filter((p) => p.al && p.i !== this.myId);
    const mates = ps.filter((p) => p.t === this.myTeam), list = mates.length ? mates : ps;
    if (!list.length) { this.spectate = null; return; }
    const i = list.findIndex((p) => p.i === this.spectate);
    this.spectate = list[(i + 1) % list.length].i;
  }

  /* ---------------- Snapshots ---------------- */
  onSnap(m) {
    if (this.screen !== 'game' || !m.world) return;
    const w = m.world, you = m.you;
    const idx = new Map(w.ps.map((p) => [p.i, p]));
    this.snaps.push({ rt: performance.now(), w, idx }); if (this.snaps.length > 30) this.snaps.shift();
    this.world = w; this.you = you; this.phase = w.ph;
    const mine = idx.get(this.myId); if (mine) this.myTeam = mine.t;
    this.others = w.ps.filter((p) => p.i !== this.myId).map((p) => ({ x: p.x, y: p.y, z: p.z, alive: !!p.al }));
    if (you) {
      const frozen = w.ph === 'buy' || w.ph === 'lobby' || w.ph === 'matchEnd';
      if (!this.me) { this.me = { ...you.st, cr: you.st.cr, g: !!you.st.g }; this.yaw = w.sd[this.myTeam] === 0 ? Math.PI : 0; this.ys = you.st.y; }
      const s = you.st; Object.assign(this.me, { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, g: !!s.g, cr: s.cr });
      if (you.al) {
        this.pending = this.pending.filter((c) => c.seq > you.ack);
        const mods = { spdMul: you.spd, frozen };
        for (const c of this.pending) movePlayer(this.map, this.me, c, c.dt, this.others, mods);
      }
    }
    for (const e of m.ev || []) this.event(e, w);
    if (w.ph === 'matchEnd' && w.rem <= 0 && this.transport && this.transport !== this.net) this.leaveGame();
  }

  /* ---------------- Eventos ---------------- */
  event(e, w) {
    const me = this.myId, cam = this.engine.camera, A = this.audio;
    const camP = cam.position;
    switch (e.t) {
      case 'shot': {
        const w0 = e.w, ends = e.e;
        if (e.id === me) {
          this.vm.fire(w0); A.play('shot:' + w0); this.engine.shake += 0.01;
          const f = new THREE.Vector3(); cam.getWorldDirection(f); const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
          const o = camP.clone().addScaledVector(f, 0.8).addScaledVector(r, 0.12).add(new THREE.Vector3(0, -0.1, 0));
          this.fx.muzzle(o.toArray(), f.toArray());
          if (w0 !== 'shotgun' && w0 !== 'sniper') this.fx.casing(camP.clone().addScaledVector(f, 0.4).addScaledVector(r, 0.15).add(new THREE.Vector3(0, -0.05, 0)).toArray(), r.toArray());
          ends.slice(0, 4).forEach((x) => this.fx.tracer(o.toArray(), x));
        } else {
          const to = new THREE.Vector3(...ends[0]), o = new THREE.Vector3(...e.o), d = to.clone().sub(o).normalize();
          A.play('shot:' + w0, e.o, 1);
          const mo = o.clone().addScaledVector(d, 0.7).add(new THREE.Vector3(0, -0.15, 0));
          this.fx.muzzle(mo.toArray(), d.toArray());
          ends.slice(0, 3).forEach((x) => this.fx.tracer(mo.toArray(), x));
          const c = this.chars.get(e.id); if (c) { c.obj.userData.flashT = 0.06; c.kick = 0.18; }
        }
        ends.forEach((x) => { if (x[6] === 0) this.fx.impact([x[0], x[1], x[2]], [x[3], x[4], x[5]]); });
        break;
      }
      case 'hit': {
        const p = e.p;
        if (settings.blood) { const dx = p[0] - e.f[0], dz = p[2] - e.f[1], l = Math.hypot(dx, dz) || 1; this.fx.blood(p, [dx / l, 0, dz / l], e.k ? 14 : 6); }
        if (e.a === me) {
          this.hud.hit(e.k ? 'kill' : e.h ? 'head' : '');
          A.play(e.k ? 'kill' : e.h ? 'headshot' : e.ar && !e.hp ? 'armorhit' : 'hit');
          if (e.hp > 0 || !e.ar) this.hud.number(p, e.hp, e.k ? 'kill' : e.h ? 'head' : '');
          if (e.ar > 0) this.hud.number([p[0], p[1] - 0.15, p[2]], '🛡' + e.ar, 'armor');
        }
        if (e.v === me) {
          const mp = this.me || { x: 0, z: 0 };
          const rel = Math.atan2(-(e.f[0] - mp.x), -(e.f[1] - mp.z)) - this.yaw;
          this.hud.dmgDir(-rel); this.engine.shake += Math.min(0.5, e.hp * 0.006); this.dmg = Math.min(0.85, this.dmg + e.hp / 70);
          A.play('hurt');
        }
        break;
      }
      case 'kill':
        this.hud.killfeed(e, me);
        if (e.v === me) { A.play('death'); this.deadT = 0; this.deathPos = this.me ? { x: this.me.x, y: this.me.y, z: this.me.z } : null; this.spectate = null; this.hud.openShop(false); }
        break;
      case 'boom': {
        const d = camP.distanceTo(new THREE.Vector3(...e.p));
        if (e.k === 'frag') { this.fx.explosion(e.p); A.play('boom', e.p, 1.2); this.engine.shake += clamp(1 - d / 30, 0, 1) * 1.1; }
        else { this.fx.flashBang(e.p); A.play('flashboom', e.p); }
        break;
      }
      case 'smoke': this.fx.smoke(e.p, e.d); A.play('smoke', e.p); break;
      case 'bounce': A.play('bounce', e.p, 0.7); break;
      case 'throw': if (e.id === me) { this.vm.throwNade(); A.play('throw'); } else { const p = w.ps.find((x) => x.i === e.id); if (p) A.play('throw', [p.x, p.y + 1.5, p.z], 0.7); } break;
      case 'knife': if (e.id === me) { this.vm.swing(!!e.h); A.play('knife'); if (e.hit) setTimeout(() => A.play('knifehit'), 120); } else { const c = this.chars.get(e.id); if (c) c.kick = 0.4; const p = w.ps.find((x) => x.i === e.id); if (p) A.play('knife', [p.x, p.y + 1.2, p.z], 0.8); } break;
      case 'rl': if (e.v !== me) { const p = w.ps.find((x) => x.i === e.v); if (p) A.play('magout', [p.x, p.y + 1.2, p.z], 0.8); } break;
      case 'buy':
        if (e.v === me) {
          if (e.ok) { A.play('buy'); this.hud.shopFeedback(e.item, true); this.hud.toast(`Comprado: ${(W[e.item] || { name: e.item === 'vest' ? 'Colete' : 'Colete + Capacete' }).name}  −$${e.price}`, '', 1600); }
          else { A.play('deny'); this.hud.toast(e.msg, 'e', 2200); this.hud.shopFeedback(e.item || '', false); }
        }
        break;
      case 'pickup': if (e.v === me) A.play('pickup'); break;
      case 'med': if (e.v === me) A.play('heal'); break;
      case 'medcancel': if (e.v === me) this.hud.toast('Kit médico cancelado!', 'e', 1600); break;
      case 'meddone': if (e.v === me) this.hud.toast('Cura concluída'); break;
      case 'empty': if (e.v === me) A.play('empty'); break;
      case 'flashed': if (e.v === me) A.ring(Math.min(5, e.d * 1.4)); break;
      case 'rstart':
        this.hud.msg(`Round ${e.rd}`, e.half ? 'Troca de lados!' : 'Fase de compra'); A.play('beep'); this.fx.clearDecals();
        this.pending = []; this.pitch = 0; this.spectate = null; this.deadT = 0; this.rd = e.rd; this.vm.setWeapon(''); this.vm.target = '';
        this.yaw = w.sd[this.myTeam] === 0 ? Math.PI : 0;
        if (e.half) this.hud.toast('Fim do primeiro tempo: times trocam de lado e a economia é reiniciada');
        break;
      case 'live': this.hud.msg('Fase de ação', 'Eliminem o time adversário'); A.play('beep'); this.closeShop(); break;
      case 'rend': {
        const won = e.w === this.myTeam;
        if (e.over) this.hud.msg(won ? 'VITÓRIA!' : 'DERROTA', `Placar final ${e.sc[0]} × ${e.sc[1]}`, 9000);
        else this.hud.msg(won ? 'Round vencido!' : 'Round perdido', `${e.sc[0]} × ${e.sc[1]}`, 3500);
        A.play(won ? 'roundwin' : 'roundlose'); break;
      }
    }
  }

  /* ---------------- Interpolação ---------------- */
  interp() {
    const S = this.snaps; if (!S.length) return null;
    const rt = performance.now() - 100, last = S[S.length - 1];
    if (rt >= last.rt || S.length < 2) return last.w.ps;
    let a = S[0], b = S[1];
    for (let i = S.length - 1; i > 0; i--) if (S[i - 1].rt <= rt) { a = S[i - 1]; b = S[i]; break; }
    const k = clamp((rt - a.rt) / Math.max(1, b.rt - a.rt), 0, 1);
    return b.w.ps.map((p) => {
      const q = a.idx.get(p.i); if (!q) return p;
      return { ...p, x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k, z: q.z + (p.z - q.z) * k, yw: angLerp(q.yw, p.yw, k), pt: q.pt + (p.pt - q.pt) * k, cr: q.cr + (p.cr - q.cr) * k };
    });
  }

  /* ---------------- Loop ---------------- */
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.fpsT += dt; this.fpsN++; if (this.fpsT > 0.5) { this.fps = Math.round(this.fpsN / this.fpsT); this.fpsT = 0; this.fpsN = 0; }
    try {
      if (this.screen === 'game' && this.transport) { this.transport.update(dt); this.gameFrame(dt); }
      else { this.engine.camera.position.set(0, 20, 0); }
      this.engine.render(dt);
    } catch (err) { console.error(err); }
    requestAnimationFrame((t) => this.frame(t));
  }

  stepCmd(dt, active) {
    const you = this.you, inp = active && you.al;
    const [f, s] = inp ? this.input.axis() : [0, 0];
    const cmd = { seq: ++this.seq, dt, f, s, j: inp && (this.input.isDown('jump') || performance.now() < this.jumpUntil), c: inp && (this.input.isDown('crouch') || this.input.touch.crouch), w: inp && this.input.isDown('walk'),
      yaw: this.yaw, pitch: this.pitch, fire: inp && this.input.fire(), aim: inp && this.input.aim(), rl: this.rlLatch };
    this.rlLatch = false;
    if (!you.al) return;
    const frozen = this.phase === 'buy' || this.phase === 'lobby' || this.phase === 'matchEnd';
    movePlayer(this.map, this.me, cmd, dt, this.others, { spdMul: you.spd, frozen });
    this.pending.push(cmd); if (this.pending.length > 90) this.pending.shift();
    this.out.push(cmd);
  }

  gameFrame(dt) {
    const w = this.world, you = this.you, eng = this.engine, cam = eng.camera;
    if (!w || !you || !this.me) return;
    const active = this.input.active() && this.modals === 0;
    const fovScale = cam.fov / settings.fov;
    const [dy, dp] = this.input.consumeLook(dt, fovScale);
    this.dyaw = 0; this.dpitch = 0;
    if (active && you.al) { this.yaw -= dy; this.pitch = clamp(this.pitch - dp, -89 * R2D, 89 * R2D); this.dyaw = -dy / Math.max(dt, 1e-3) * 0.016; this.dpitch = -(-dp) / Math.max(dt, 1e-3) * 0.016; }
    // Comandos a 60 Hz
    this.acc += dt; let n = 0;
    while (this.acc >= 1 / 60 && n < 6) { this.acc -= 1 / 60; n++; this.stepCmd(1 / 60, active); }
    if (n === 6) this.acc = 0;
    this.sendT += dt;
    if (this.sendT >= 0.033 && this.out.length) { this.transport.sendCmds(this.out.splice(0, 8)); this.sendT = 0; }
    const me = this.me, wd = W[you.wid] || W.knife;
    // Recuo visual (punch do servidor, suavizado)
    this.punch[0] += (you.pu[0] - this.punch[0]) * Math.min(1, dt * 28); this.punch[1] += (you.pu[1] - this.punch[1]) * Math.min(1, dt * 28);
    // Entidades remotas
    const ip = this.interp() || w.ps;
    this.updateChars(ip, dt);
    this.updateProps(w, dt);
    // Câmera
    const alive = !!you.al, speed = Math.hypot(me.vx, me.vz);
    let eyePos, yawV, pitchV, roll = 0;
    if (alive) {
      if (Math.abs(me.y - this.ys) < 0.7) this.ys += (me.y - this.ys) * Math.min(1, dt * 16); else this.ys = me.y;
      eyePos = [me.x, this.ys + eyeH(me), me.z];
      yawV = this.yaw - this.punch[0] * R2D; pitchV = this.pitch + this.punch[1] * R2D;
      roll = -this.input.axis()[1] * 0.012 * Math.min(1, speed / 6);
    } else {
      this.deadT += dt;
      const tgt = this.spectate && ip.find((p) => p.i === this.spectate && p.al);
      if (this.deadT > 1.6) { if (!tgt) this.cycleSpectate(); }
      if (tgt && this.deadT > 1.6) { eyePos = [tgt.x, tgt.y + eyeH(tgt), tgt.z]; yawV = tgt.yw; pitchV = tgt.pt; }
      else { const dpn = this.deathPos || me, k = Math.min(1, this.deadT / 0.9); eyePos = [dpn.x, dpn.y + 1.6 - 1.3 * k, dpn.z]; yawV = this.yaw; pitchV = this.pitch - 0.5 * k; roll = 0.6 * k; }
    }
    // FOV / mira
    const aimWanted = active && alive && this.input.aim() && (wd.slot === 'primary' || wd.slot === 'secondary') && you.rlp < 0;
    const sprint = alive && speed > 5 && this.input.axis()[0] > 0.5 && !aimWanted && !this.input.isDown('walk') && me.g;
    const adsF = wd.scope ? SCOPE[this.zoom || 0] : wd.ads || 0.85;
    const fovT = settings.fov * (1 + (adsF - 1) * this.vm.ads);
    cam.fov += (fovT - cam.fov) * Math.min(1, dt * 14); cam.updateProjectionMatrix();
    // Tremor
    eng.shake = Math.max(0, eng.shake * Math.exp(-dt * 6) - dt * 0.02);
    const sh = Math.min(1.2, eng.shake);
    cam.position.set(eyePos[0] + (Math.random() - 0.5) * sh * 0.05, eyePos[1] + (Math.random() - 0.5) * sh * 0.05, eyePos[2] + (Math.random() - 0.5) * sh * 0.05);
    cam.rotation.set(pitchV + (Math.random() - 0.5) * sh * 0.04, yawV + (Math.random() - 0.5) * sh * 0.04, roll + (Math.random() - 0.5) * sh * 0.03, 'YXZ');
    // Viewmodel
    const spectating = !alive;
    if (this.lastCur !== you.wid) this.lastCur = you.wid;
    this.vm.setTeam(SLEEVE[this.myTeam]);
    this.vm.update(dt, { wid: spectating ? '' : you.wid, ads: aimWanted, speed, grounded: me.g, cr: me.cr, sprint, dyaw: this.dyaw, dpitch: this.dpitch, rlp: you.rlp, mdp: you.mdp, dead: spectating, scoped: !!wd.scope });
    this.engine.vmCam.fov = 58; this.engine.vmCam.updateProjectionMatrix();
    // Passos locais
    if (alive && me.g && speed > 2.2 && !this.input.isDown('walk') && me.cr < 0.5) { this.stepD = (this.stepD || 0) + speed * dt; if (this.stepD > 1.9) { this.stepD = 0; this.audio.play('step', null, 0.5); } }
    if (alive && this.lastG === false && me.g) { this.audio.play('land', null, 0.7); this.fx.dust([me.x, me.y, me.z], 5); }
    this.lastG = me.g;
    // FX e áudio
    this.fx.update(dt, cam, innerHeight); this.audio.setListener(cam.position.x, cam.position.y, cam.position.z, yawV);
    // Pós-processamento (dano / flash)
    this.dmg = Math.max(0, this.dmg - dt * 0.9);
    const low = you.hp < 30 && alive ? 0.2 + 0.1 * Math.sin(performance.now() / 180) : 0;
    eng.grade.uniforms.uDamage.value = Math.min(1, this.dmg + low);
    eng.grade.uniforms.uFlash.value = clamp(you.bl / 1.0, 0, 1) * 0.97;
    this.updateHud(w, you, wd, ip, aimWanted, dt, alive);
    this.hud.tickNumbers(dt, cam);
  }

  /* ---------------- Personagens e props ---------------- */
  updateChars(ps, dt) {
    const sc = this.engine.scene;
    for (const p of ps) {
      if (p.i === this.myId && p.al) { const c0 = this.chars.get(p.i); if (c0) c0.obj.visible = false; continue; }
      let c = this.chars.get(p.i);
      if (!c) { const obj = buildCharacter(TEAM_COL[p.t], p.sk); sc.add(obj); c = { obj, sh: p.sh, kick: 0, stepD: 0 }; this.chars.set(p.i, c); }
      c.obj.visible = !(this.spectate === p.i && !this.you.al && this.deadT > 1.6);
      c.obj.position.set(p.x, p.y, p.z);
      if (p.al) setCharWeapon(c.obj, p.cu);
      if (p.sh !== c.sh) { c.sh = p.sh; }
      c.kick = Math.max(0, c.kick - dt * 1.5);
      animateCharacter(c.obj, dt, { speed: p.sp, grounded: !!p.g, cr: p.cr, pitch: p.pt, yaw: p.yw, kind: kindOf(p.cu), helm: p.hm, armor: p.ar, alive: !!p.al, dv: p.dv || [0, 0], kick: -c.kick });
      if (p.i !== this.myId && p.al && p.g && p.sp > 2.4 && !p.sl && p.cr < 0.5) { c.stepD += p.sp * dt; if (c.stepD > 2.0) { c.stepD = 0; this.audio.play('step', [p.x, p.y, p.z], 0.8); } }
    }
  }

  updateProps(w, dt) {
    const sc = this.engine.scene, t = performance.now() / 1000;
    const seen = new Set();
    for (const d of w.dr) {
      seen.add(d.i);
      let m = this.dropMeshes.get(d.i);
      if (!m) { m = buildWeapon(d.w).g; m.scale.setScalar(1.2); sc.add(m); this.dropMeshes.set(d.i, m); }
      m.position.set(d.x, d.y + 0.25 + Math.sin(t * 2 + d.i) * 0.04, d.z); m.rotation.set(0.0, t * 0.8 + d.i, 0.3);
    }
    for (const [id, m] of this.dropMeshes) if (!seen.has(id)) { sc.remove(m); this.dropMeshes.delete(id); }
    const sn = new Set();
    for (const g of w.gr) {
      sn.add(g.i);
      let m = this.nadeMeshes.get(g.i);
      if (!m) { m = buildWeapon(g.ty).g; m.scale.setScalar(1.3); sc.add(m); this.nadeMeshes.set(g.i, m); m.position.set(g.x, g.y, g.z); }
      m.position.lerp(new THREE.Vector3(g.x, g.y, g.z), Math.min(1, dt * 25)); m.rotation.x += dt * 8; m.rotation.z += dt * 5;
    }
    for (const [id, m] of this.nadeMeshes) if (!sn.has(id)) { sc.remove(m); this.nadeMeshes.delete(id); }
  }

  /* ---------------- HUD ---------------- */
  updateHud(w, you, wd, ip, aimWanted, dt, alive) {
    const hud = this.hud, touch = this.input.effectiveMode() === 'touch';
    const K = (a, name) => (touch ? name : key(a));
    this.spotT -= dt;
    if (this.spotT <= 0) {
      this.spotT = 0.25; this.spotted.clear();
      const mates = w.ps.filter((p) => p.t === this.myTeam && p.al);
      for (const e of w.ps) {
        if (e.t === this.myTeam || !e.al) continue;
        for (const m of mates) if (Math.hypot(m.x - e.x, m.z - e.z) < 45 && losClear(this.map, m.x, m.y + 1.5, m.z, e.x, e.y + 1, e.z)) { this.spotted.add(e.i); break; }
      }
    }
    const al = [0, 0]; for (const p of w.ps) if (p.al) al[p.t]++;
    const rem = Math.ceil(w.rem), tm = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`;
    const gap = (Math.tan(you.spr * R2D) / Math.tan(this.engine.camera.fov * R2D / 2)) * (innerHeight / 2) + 2;
    const isGun = wd.slot === 'primary' || wd.slot === 'secondary';
    const cnt = wd.slot === 'grenade' ? you.inv[wd.id] : wd.slot === 'medkit' ? you.inv.medkit : -1;
    const scoped = !!wd.scope && this.vm.ads > 0.92 && alive;
    let spec = '';
    if (!alive && this.deadT > 1.6 && this.spectate) { const p = w.ps.find((x) => x.i === this.spectate); if (p) spec = `Assistindo: <b>${p.n}</b>`; }
    hud.update({ hp: you.hp, ar: you.ar, hm: you.hm, mo: you.mo, wn: wd.name + (cnt >= 0 ? ` ×${cnt}` : ''), mag: isGun ? you.am[0] : -1, res: you.am[1], rl: you.rlp >= 0,
      sc: w.sc, al, tm, ph: PHN[w.ph] || '', rd: `Round ${w.rd}/15`, gap, scoped, dead: !alive, fixed: this.input.fallbackActive, spec,
      fps: settings.fps ? `${this.fps} FPS<br>${this.transport === this.net ? this.net.ping + ' ms' : 'offline'}` : (this.transport === this.net ? `${this.net.ping} ms` : '') });
    hud.medbar(you.mdp);
    const m = this.me;
    // Dicas contextuais
    let hint = '';
    if (!alive) hint = this.spectate || this.deadT > 1.6 ? `${K('jump', 'Toque')} Trocar de espectador` : '';
    else {
      const near = w.dr.find((d) => Math.hypot(d.x - m.x, d.z - m.z) < 2.2 && Math.abs(d.y - m.y) < 1.6);
      if (near) hint = `${K('use', 'Botão')} Pegar ${W[near.w].name}`;
      else if (isGun && you.am[0] === 0 && you.am[1] > 0 && you.rlp < 0) hint = `${K('reload', 'Recarregar')} Recarregar`;
      else if (w.ph === 'buy' && !hud.shopOpen) hint = `${K('shop', '$')} Abrir loja · ${rem}s`;
    }
    hud.hint(hint);
    hud.scoreboard(this.input.isDown('score') && this.modals === 0, w, this.myId, this.myTeam);
    hud.drawMinimap({ x: m.x, z: m.z, yaw: this.yaw, id: this.myId }, w, this.spotted, this.myTeam);
    if (hud.shopOpen && this.shopStamp !== you.mo + '|' + w.ph + '|' + you.ar) { this.shopStamp = you.mo + '|' + w.ph + '|' + you.ar; hud.renderShop(); }
    this.phase = w.ph;
  }
}
