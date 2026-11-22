// @ts-nocheck
/**
 * IA simples de bots: navegação por grade (gerada do mapa) + A*, visão por raycast,
 * mira com imprecisão por dificuldade, compra automática e uso eventual de granadas.
 */
import { W, DIFFS, PL } from './weapons';
import { groundAt, blockedAt, losClear, eyeH, bodyH } from './physics';

const navCache = new Map();
const STEP = 2.5;

/** Constrói a malha de navegação: nós onde cabe um jogador e arestas caminháveis. */
export function getNav(map) {
  if (navCache.has(map.limit)) return navCache.get(map.limit);
  const nodes = [], grid = new Map();
  const key = (i, j) => i * 1000 + j;
  const n = Math.floor(map.bound / STEP);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const x = i * STEP, z = j * STEP;
    if (Math.abs(z) > map.limit - 0.8) continue;
    const h = groundAt(map, x, z, 1e9);
    if (h > 3.2 || h < -0.1) continue;
    if (blockedAt(map, x, z, h, 0.5)) continue;
    const nd = { i, j, x, y: h, z, nb: [] };
    grid.set(key(i, j), nodes.length); nodes.push(nd);
  }
  const walk = (a, b) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z), k = Math.ceil(d / 0.5);
    let ph = a.y;
    for (let s = 1; s <= k; s++) {
      const t = s / k, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const h = groundAt(map, x, z, 1e9);
      if (Math.abs(h - ph) > 0.5 || h > 3.2) return false;
      if (blockedAt(map, x, z, h, 0.45)) return false;
      ph = h;
    }
    return true;
  };
  nodes.forEach((a, ai) => {
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const bi = grid.get(key(a.i + di, a.j + dj));
      if (bi === undefined || bi < ai) continue;
      const b = nodes[bi];
      if (walk(a, b)) { const d = Math.hypot(b.x - a.x, b.z - a.z); a.nb.push([bi, d]); b.nb.push([ai, d]); }
    }
  });
  // Mantém só o maior componente conectado a partir do spawn
  const sp = map.spawns[0][0];
  let start = 0, bd = 1e9;
  nodes.forEach((nd, i) => { const d = Math.hypot(nd.x - sp.x, nd.z - sp.z); if (d < bd) { bd = d; start = i; } });
  const seen = new Set([start]), q = [start];
  while (q.length) { const c = q.pop(); for (const [nb] of nodes[c].nb) if (!seen.has(nb)) { seen.add(nb); q.push(nb); } }
  const ok = [...seen].map((i) => nodes[i]);
  const nav = { nodes, ok, okSet: seen };
  navCache.set(map.limit, nav);
  return nav;
}

function nearest(nav, x, z) {
  let b = -1, bd = 1e9;
  for (const i of nav.okSet) { const nd = nav.nodes[i]; const d = (nd.x - x) ** 2 + (nd.z - z) ** 2; if (d < bd) { bd = d; b = i; } }
  return b;
}

/** A* sobre a malha. Retorna lista de pontos {x,z}. */
export function findPath(nav, fx, fz, tx, tz) {
  const s = nearest(nav, fx, fz), g = nearest(nav, tx, tz);
  if (s < 0 || g < 0) return [];
  const N = nav.nodes, gs = new Map([[s, 0]]), from = new Map(), open = [[s, 0]], closed = new Set();
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][1] < open[bi][1]) bi = i;
    const [c] = open.splice(bi, 1)[0];
    if (c === g) {
      const path = [];
      for (let k = c; k !== undefined; k = from.get(k)) path.push({ x: N[k].x, z: N[k].z });
      return path.reverse();
    }
    if (closed.has(c)) continue;
    closed.add(c);
    for (const [nb, d] of N[c].nb) {
      const ng = gs.get(c) + d;
      if (ng < (gs.get(nb) ?? 1e9)) {
        gs.set(nb, ng); from.set(nb, c);
        open.push([nb, ng + Math.hypot(N[nb].x - N[g].x, N[nb].z - N[g].z)]);
      }
    }
  }
  return [];
}

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

/** Segmento atravessa fumaça? */
function smoked(sim, ax, ay, az, bx, by, bz) {
  for (const s of sim.smokes) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L2 = dx * dx + dy * dy + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((s.x - ax) * dx + (s.y - ay) * dy + (s.z - az) * dz) / L2));
    const px = ax + dx * t - s.x, py = ay + dy * t - s.y, pz = az + dz * t - s.z;
    if (px * px + py * py + pz * pz < s.r * s.r) return true;
  }
  return false;
}

export function botThink(sim, p, dt) {
  const cfg = DIFFS[sim.diff] || DIFFS[1];
  const b = p.ai || (p.ai = { path: [], pi: 0, tgt: null, react: 0, nx: 0, ny: 0, nt: 0, strafe: 1, st: 0, stuck: 0, stuckCount: 0, lx: p.x, lz: p.z, sc: 0, seen: null, seenT: -99, burst: 0, rest: 0, wait: 0, nade: null, vis: false, head: false, ct: 0, engT: 0 });
  const c = { seq: 0, dt, f: 0, s: 0, j: 0, c: 0, w: 0, yaw: p.yaw, pitch: p.pitch, fire: 0, aim: 0, rl: 0 };
  if (!p.alive || sim.phase === 'buy') return c;
  const nav = getNav(sim.map);
  const eye = p.y + eyeH(p);
  const wd = W[p.curId()];

  // Percepção
  b.sc -= dt;
  if (b.sc <= 0) {
    b.sc = 0.12;
    let best = null, bd = 1e9;
    for (const e of sim.players.values()) {
      if (!e.alive || e.team === p.team) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d > 75 || d > bd) continue;
      const ang = Math.abs(angDiff(p.yaw, Math.atan2(-dx, -dz)));
      // campo de visão pra notar alguém novo fica perto do FOV real do jogador (~70°, settings.fov=75 por padrão);
      // quem já foi visto há pouco (<1s) ainda conta num ângulo maior, simulando memória curta, não visão de 360°
      if (ang > 0.62 && (ang > 1.0 || sim.time - b.seenT > 1)) continue;
      const ty = e.y + bodyH(e) * 0.65;
      if (!losClear(sim.map, p.x, eye, p.z, e.x, ty, e.z)) continue;
      if (smoked(sim, p.x, eye, p.z, e.x, ty, e.z)) continue;
      best = e; bd = d;
    }
    if (best) {
      if (b.tgt !== best.id) { b.tgt = best.id; b.react = cfg.react * (0.7 + Math.random() * 0.6); b.engT = 0; }
      b.vis = true; b.seen = { x: best.x, z: best.z }; b.seenT = sim.time;
    } else if (b.vis) { b.vis = false; }
  }
  const tgt = b.vis && b.tgt ? sim.players.get(b.tgt) : null;
  const wantDir = { x: 0, z: 0 };
  let moving = true;

  if (tgt && tgt.alive) {
    b.react -= dt; b.nt -= dt; b.engT += dt;
    if (b.nt <= 0) {
      b.nt = 0.25;
      const dx0 = tgt.x - p.x, dz0 = tgt.z - p.z, hd0 = Math.hypot(dx0, dz0) || 1;
      // velocidade angular aparente do alvo (rad/s): quanto mais ele corre de lado (strafe), mais difícil acompanhar
      const angVel = Math.abs(tgt.vz * dx0 - tgt.vx * dz0) / (hd0 * hd0);
      // a mira "assenta" (fica mais precisa) quanto mais tempo seguido o bot está de olho no mesmo alvo
      const settle = Math.max(0.5, 1 - b.engT * 0.55);
      b.nx = gauss() * (cfg.err * settle + angVel * cfg.track);
      b.ny = gauss() * cfg.err * settle * 0.6;
      b.head = Math.random() < cfg.head * (hd0 < 16 ? 1.2 : hd0 > 45 ? 0.65 : 1);
    }
    const dx = tgt.x - p.x, dz = tgt.z - p.z, hd = Math.hypot(dx, dz);
    const ty = tgt.y + bodyH(tgt) * (b.head ? 0.95 : 0.68);
    const dy = ty - eye;
    const wy = Math.atan2(-dx, -dz) + b.nx, wp = Math.atan2(dy, hd) + b.ny;
    const ey = angDiff(p.yaw, wy), ep = wp - p.pitch;
    const mx = cfg.turn * dt;
    c.yaw = p.yaw + Math.max(-mx, Math.min(mx, ey * Math.min(1, dt * 14)));
    c.pitch = p.pitch + Math.max(-mx, Math.min(mx, ep * Math.min(1, dt * 14)));
    const err = Math.hypot(ey, ep);
    if (wd.scope) c.aim = 1;
    const ready = b.react <= 0 && err < cfg.fireErr + 0.6 / (hd + 4) * 0.2;
    if (wd.slot === 'knife') { if (hd < 2) c.fire = 1; }
    else if (ready) {
      b.burst -= dt;
      if (b.burst <= -cfg.burst * 0.6) b.burst = cfg.burst * (0.6 + Math.random());
      if (b.burst > 0) c.fire = wd.auto ? 1 : (Math.floor(sim.time * 5 + p.x) % 2 ? 1 : 0);
    }
    // Movimento em combate
    b.st -= dt;
    if (b.st <= 0) { b.st = 0.5 + Math.random() * 1.2; b.strafe = Math.random() < 0.5 ? -1 : 1; b.rest = Math.random() < (sim.diff === 0 ? 0.6 : 0.25) ? 1 : 0; }
    const rangeWant = wd.slot === 'knife' ? 0 : (wd.range || 40) * 0.5;
    if (wd.slot === 'knife' || hd > rangeWant) { dx !== 0 && (wantDir.x = dx / (hd || 1), wantDir.z = dz / (hd || 1)); }
    else if (!b.rest) { wantDir.x = Math.cos(c.yaw) * b.strafe; wantDir.z = -Math.sin(c.yaw) * b.strafe; }
    else moving = false;
    if (sim.diff === 2 && hd > 14 && Math.sin(sim.time * 0.7 + p.z) > 0.6) c.c = 1;
    p.ai.seen = { x: tgt.x, z: tgt.z };
  } else {
    // Sem alvo: patrulha por caminho e investiga última posição vista
    b.react = cfg.react;
    if (p.ai.alert) { b.seen = p.ai.alert; b.seenT = sim.time; p.ai.alert = null; b.path = []; }
    b.wait -= dt;
    if ((b.pi >= b.path.length) && b.wait <= 0) {
      let gx, gz;
      const r = Math.random();
      if (b.seen && sim.time - b.seenT < 5 && r < 0.6) { gx = b.seen.x; gz = b.seen.z; }
      else if (r < 0.5) { const s = sim.map.sites[Math.random() < 0.5 ? 0 : 1]; gx = s.x + (Math.random() - 0.5) * s.r; gz = s.z + (Math.random() - 0.5) * s.r; }
      else if (r < 0.7) { gx = (Math.random() - 0.5) * 12; gz = (Math.random() - 0.5) * 12; }
      else { const nd = nav.ok[Math.floor(Math.random() * nav.ok.length)]; gx = nd.x; gz = nd.z; }
      b.path = findPath(nav, p.x, p.z, gx, gz); b.pi = 0; b.wait = 0.2 + Math.random() * 1.5;
    }
    if (b.pi < b.path.length) {
      const wp = b.path[b.pi];
      let dx = wp.x - p.x, dz = wp.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.9) { b.pi++; }
      else { wantDir.x = dx / d; wantDir.z = dz / d; }
      const wy = Math.atan2(-wantDir.x, -wantDir.z);
      const ey = angDiff(p.yaw, wy);
      if (d >= 0.9) c.yaw = p.yaw + Math.max(-cfg.turn * dt, Math.min(cfg.turn * dt, ey * Math.min(1, dt * 8)));
      c.pitch = p.pitch * (1 - Math.min(1, dt * 4));
    } else moving = false;
    const a = p.ammo[p.curId()];
    if (a && wd.mag && (a.mag === 0 || (a.mag < wd.mag * 0.4 && !b.seen)) && a.res > 0) c.rl = 1;
    // Granadas: lança em direção à última posição vista
    if (!b.nade && b.seen && sim.time - b.seenT < 2.5 && Math.random() < dt * 0.6) {
      const ty = p.inv.frag > 0 ? 'frag' : p.inv.flash > 0 ? 'flash' : null;
      const dd = Math.hypot(b.seen.x - p.x, b.seen.z - p.z);
      if (ty && dd > 8 && dd < 26) { b.nade = { ty, t: 0.7 }; sim.sel(p, ty); }
    }
  }
  if (b.nade) {
    b.nade.t -= dt;
    const dx = b.seen.x - p.x, dz = b.seen.z - p.z, hd = Math.hypot(dx, dz);
    c.yaw = Math.atan2(-dx, -dz); c.pitch = 0.3 + hd * 0.006; moving = false;
    if (b.nade.t <= 0) { c.fire = 1; b.nade = null; }
  }

  if (moving && (wantDir.x || wantDir.z)) {
    const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
    const fwd = -sy * wantDir.x - cy * wantDir.z, rt = cy * wantDir.x - sy * wantDir.z;
    c.f = fwd * cfg.speed; c.s = rt * cfg.speed;
  }
  // Detecção de travamento: se travar de novo perto do mesmo lugar, tenta um destino diferente em vez de repetir o mesmo caminho
  b.stuck += dt;
  if (b.stuck > 0.8) {
    const stillStuck = moving && Math.hypot(p.x - b.lx, p.z - b.lz) < 0.2 && (wantDir.x || wantDir.z);
    if (stillStuck) {
      c.j = 1;
      b.stuckCount = (b.stuckCount || 0) + 1;
      if (b.stuckCount >= 2) {
        const ang = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
        b.path = findPath(nav, p.x, p.z, p.x + Math.cos(ang) * r, p.z + Math.sin(ang) * r);
        b.stuckCount = 0;
      } else b.path = [];
      b.pi = 0; b.wait = 0;
    } else b.stuckCount = 0;
    b.lx = p.x; b.lz = p.z; b.stuck = 0;
  }
  return c;
}

/** Compra automática dos bots no início da fase de compra. */
export function botBuy(sim, p) {
  p.bought = true;
  const buy = (id) => sim.buy(p, id, true);
  const m = () => p.money;
  const r = Math.random();
  if (!p.inv.primary) {
    if (m() >= 6200 && r < 0.2) buy('lmg');
    else if (m() >= 5400 && r < 0.35) buy('sniper');
    else if (m() >= 2700) buy('ar');
    else if (m() >= 1800 && r < 0.4) buy('shotgun');
    else if (m() >= 1200) buy('smg');
  }
  if (p.inv.secondary === 'p9' && m() >= 450 && !p.inv.primary) buy(r < 0.5 ? 'r18' : 't50');
  if (p.armor < 100 || !p.helm) { if (m() >= 1000 && !p.helm) buy('vesthelm'); else if (m() >= 650 && p.armor < 100) buy('vest'); }
  if (m() >= 300 && p.inv.frag < 1 && Math.random() < 0.5) buy('frag');
  if (m() >= 200 && p.inv.flash < 1 && Math.random() < 0.5) buy('flash');
  if (m() >= 700 && !p.inv.medkit && Math.random() < 0.4) buy('medkit');
}
