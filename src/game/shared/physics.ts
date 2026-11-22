// @ts-nocheck
/**
 * Física do jogador (cápsula vertical vs AABB/rampas), raycasts e hitboxes por parte do corpo.
 * Código escrito à mão para ser determinístico e compartilhado por servidor e predição do cliente.
 */
import { PL } from './weapons';

/** Altura da superfície de um sólido no ponto (x,z). */
export function topAt(s, x, z) {
  if (s.k === 'b') return s.y1;
  let t;
  switch (s.dir) {
    case '+x': t = (x - s.x0) / (s.x1 - s.x0); break;
    case '-x': t = (s.x1 - x) / (s.x1 - s.x0); break;
    case '+z': t = (z - s.z0) / (s.z1 - s.z0); break;
    default: t = (s.z1 - z) / (s.z1 - s.z0);
  }
  return s.y0 + s.h * Math.max(0, Math.min(1, t));
}

/** Maior superfície sob (x,z) que não esteja acima de maxTop. */
export function groundAt(map, x, z, maxTop) {
  let best = -1e9;
  for (const s of map.solids) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    const t = topAt(s, x, z);
    if (t <= maxTop && t > best) best = t;
  }
  return best;
}

/** Empurra o círculo (p.x,p.z) para fora de sólidos que bloqueiam na altura atual. */
function resolveXZ(map, p, height) {
  const r = PL.r;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const s of map.solids) {
      if (p.x + r < s.x0 || p.x - r > s.x1 || p.z + r < s.z0 || p.z - r > s.z1) continue;
      if (s.y0 >= p.y + height) continue;
      const cx = Math.max(s.x0, Math.min(p.x, s.x1)), cz = Math.max(s.z0, Math.min(p.z, s.z1));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (topAt(s, cx, cz) <= p.y + PL.step) continue;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2), k = (r - d) / d;
        p.x += dx * k; p.z += dz * k;
      } else {
        const l = p.x - s.x0, rr = s.x1 - p.x, t = p.z - s.z0, b = s.z1 - p.z, m = Math.min(l, rr, t, b);
        if (m === l) p.x = s.x0 - r; else if (m === rr) p.x = s.x1 + r; else if (m === t) p.z = s.z0 - r; else p.z = s.z1 + r;
      }
      moved = true;
    }
    if (!moved) break;
  }
}

/** Há colisão horizontal em (x,z) para alguém com os pés em y? (usado pela navegação) */
export function blockedAt(map, x, z, y, r = PL.r) {
  for (const s of map.solids) {
    if (x + r < s.x0 || x - r > s.x1 || z + r < s.z0 || z - r > s.z1) continue;
    if (s.y0 >= y + PL.hStand) continue;
    const cx = Math.max(s.x0, Math.min(x, s.x1)), cz = Math.max(s.z0, Math.min(z, s.z1));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz >= r * r) continue;
    if (topAt(s, cx, cz) > y + PL.step) return true;
  }
  return false;
}

function accel(p, dx, dz, ws, a, dt) {
  const add = ws - (p.vx * dx + p.vz * dz);
  if (add <= 0) return;
  const as = Math.min(a * ws * dt, add);
  p.vx += dx * as; p.vz += dz * as;
}

export const eyeH = (p) => PL.eyeStand + (PL.eyeCrouch - PL.eyeStand) * p.cr;
export const bodyH = (p) => PL.hStand + (PL.hCrouch - PL.hStand) * p.cr;

/**
 * Passo de movimento. c = {f,s,j,c,w,yaw}; mods = {spdMul, frozen}; others = jogadores para colisão.
 * Aceleração/fricção estilo Quake, gravidade, pulo, agachar, deslize em paredes, degraus e rampas.
 */
export function movePlayer(map, p, c, dt, others, mods) {
  const tgt = c.c ? 1 : 0;
  p.cr += Math.sign(tgt - p.cr) * Math.min(Math.abs(tgt - p.cr), dt * 7);
  const h = bodyH(p);
  const f = mods && mods.frozen ? 0 : c.f, s = mods && mods.frozen ? 0 : c.s;
  const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
  let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
  const len = Math.hypot(wx, wz);
  if (len > 1) { wx /= len; wz /= len; }
  const wl = Math.min(1, len);
  const base = p.cr > 0.5 ? PL.crouch : c.w ? PL.walk : PL.run;
  const ws = base * ((mods && mods.spdMul) || 1) * wl;
  const dx = len > 1e-6 ? wx / len : 0, dz = len > 1e-6 ? wz / len : 0;
  if (p.g) {
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 1e-4) {
      const drop = Math.max(sp, 2) * PL.friction * dt, k = Math.max(0, sp - drop) / sp;
      p.vx *= k; p.vz *= k;
    }
    if (wl > 0) accel(p, dx, dz, ws, PL.accel, dt);
    if (c.j && !(mods && mods.frozen)) { p.vy = PL.jump; p.g = false; p.jumped = true; }
  } else if (wl > 0) accel(p, dx, dz, Math.min(ws, PL.airCap), PL.airAccel, dt);

  // Horizontal
  p.x += p.vx * dt; p.z += p.vz * dt;
  resolveXZ(map, p, h);
  if (others) {
    for (const o of others) {
      if (o === p || !o.alive || Math.abs(o.y - p.y) > 1.5) continue;
      const ox = p.x - o.x, oz = p.z - o.z, d = Math.hypot(ox, oz), m = PL.r * 2;
      if (d < m && d > 1e-5) { p.x += (ox / d) * (m - d); p.z += (oz / d) * (m - d); }
    }
    resolveXZ(map, p, h);
  }
  const B = map.bound;
  p.x = Math.max(-B, Math.min(B, p.x)); p.z = Math.max(-B, Math.min(B, p.z));

  // Vertical (gravidade, degraus, rampas)
  const wasG = p.g;
  p.vy -= PL.gravity * dt;
  const ny = p.y + p.vy * dt;
  const gh = groundAt(map, p.x, p.z, p.y + PL.step);
  if (p.vy <= 0 && gh > -1e8 && ny <= gh + 1e-4) { p.y = gh; p.vy = 0; p.g = true; }
  else if (wasG && p.vy <= 0 && gh > -1e8 && p.y - gh <= 0.35) { p.y = gh; p.vy = 0; p.g = true; }
  else { p.y = ny; p.g = false; }
  p.speed = Math.hypot(p.vx, p.vz);
}

/* ---------------- Raycasts ---------------- */
export const rayN = [0, 0, 0];

/** Raio vs lista de AABBs. Devolve t do primeiro impacto (<= maxT) ou Infinity; normal em rayN. */
export function rayBoxes(boxes, ox, oy, oz, dx, dy, dz, maxT) {
  let bt = maxT;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    let t0 = 0, t1 = bt, ax = -1, sg = 0, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz;
      const mn = b[a], mx = b[a + 3];
      if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) ok = false; continue; }
      const inv = 1 / d;
      let ta = (mn - o) * inv, tb = (mx - o) * inv;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      if (ta > t0) { t0 = ta; ax = a; sg = d > 0 ? -1 : 1; }
      if (tb < t1) t1 = tb;
      if (t0 > t1) ok = false;
    }
    if (ok && t0 < bt && (ax >= 0 || t0 === 0)) {
      bt = t0; rayN[0] = ax === 0 ? sg : 0; rayN[1] = ax === 1 ? sg : 0; rayN[2] = ax === 2 ? sg : 0;
    }
  }
  return bt >= maxT ? Infinity : bt;
}

/** Linha de visão livre entre dois pontos (apenas geometria do mapa). */
export function losClear(map, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
  if (d < 1e-4) return true;
  return rayBoxes(map.rayBoxes, ax, ay, az, dx / d, dy / d, dz / d, d - 0.05) === Infinity;
}

const PARTBOX = [
  ['head', -0.17, 1.48, -0.17, 0.17, 1.78, 0.17],
  ['chest', -0.24, 0.85, -0.16, 0.24, 1.48, 0.16],
  ['arm', 0.24, 0.95, -0.1, 0.4, 1.45, 0.1],
  ['arm', -0.4, 0.95, -0.1, -0.24, 1.45, 0.1],
  ['leg', -0.24, 0, -0.14, 0.24, 0.85, 0.14],
];

/** Raio vs hitboxes do corpo {x,y,z,yaw,cr}. Devolve {t, part} ou null. */
export function bodyHit(b, ox, oy, oz, dx, dy, dz, maxT) {
  const k = (PL.hStand + (PL.hCrouch - PL.hStand) * b.cr) / PL.hStand;
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  const rx = ox - b.x, ry = oy - b.y, rz = oz - b.z;
  const lo = [c * rx - s * rz, ry, s * rx + c * rz], ld = [c * dx - s * dz, dy, s * dx + c * dz];
  let best = null, bt = maxT;
  for (const pb of PARTBOX) {
    const mn = [pb[1], pb[2] * k, pb[3]], mx = [pb[4], pb[5] * k, pb[6]];
    let t0 = 0, t1 = bt, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      const o = lo[a], d = ld[a];
      if (Math.abs(d) < 1e-9) { if (o < mn[a] || o > mx[a]) ok = false; continue; }
      let ta = (mn[a] - o) / d, tb = (mx[a] - o) / d;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) ok = false;
    }
    if (ok && t0 < bt) { bt = t0; best = { t: t0, part: pb[0] }; }
  }
  return best;
}

export function dirFromAngles(yaw, pitch) {
  const cp = Math.cos(pitch);
  return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}
