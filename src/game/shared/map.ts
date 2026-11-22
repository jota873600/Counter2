// @ts-nocheck
/**
 * Mapa "Bastião": geometria procedural definida por caixas e rampas.
 * Simétrico no eixo Z (times norte/sul), com 2 áreas de objetivo (A a oeste, B a leste),
 * variação de altura, escadas, rampas e caixas. O parâmetro `limit` encolhe o mapa:
 * 24 = 1v1 (pequeno), 32 = 2v2/3v3 (médio), 40 = 4v4 (completo).
 */
const cache = new Map();

export function getMap(limit = 40) {
  if (!cache.has(limit)) cache.set(limit, buildMap(limit));
  return cache.get(limit);
}

const FLIP = { '+z': '-z', '-z': '+z', '+x': '+x', '-x': '-x' };

export function buildMap(limit) {
  const S = [];
  const box = (x0, z0, x1, z1, h, m, y0 = 0) => S.push({ k: 'b', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0, y1: y0 + h, m });
  const ramp = (x0, z0, x1, z1, h, dir, m, y0 = 0) => S.push({ k: 'r', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0, h, y1: y0 + h, dir, m });
  /** Constrói o lado norte (z<0) e espelha para o sul. */
  const sym = (f) => {
    for (const s of [1, -1]) {
      const B = (x0, z0, x1, z1, h, m, y0 = 0) => box(x0, s * z0, x1, s * z1, h, m, y0);
      const R = (x0, z0, x1, z1, h, dir, m, y0 = 0) => ramp(x0, s * z0, x1, s * z1, h, s < 0 ? FLIP[dir] : dir, m, y0);
      f(B, R);
    }
  };

  // Chão e perímetro
  box(-42, -42, 42, 42, 1, 'floor', -1);
  box(-41, -41, -40, 41, 9, 'wall'); box(40, -41, 41, 41, 9, 'wall');
  box(-41, -41, 41, -40, 9, 'wall'); box(-41, 40, 41, 41, 9, 'wall');
  if (limit < 40) { box(-41, -41, 41, -limit, 9, 'wall'); box(-41, limit, 41, 41, 9, 'wall'); }

  sym((B, R) => {
    // Paredes das áreas iniciais e muros de entrada
    B(-13, -40, -12, -24, 5, 'conc'); B(12, -40, 13, -24, 5, 'conc');
    B(-12, -23, -6, -22, 3.5, 'wall'); B(6, -23, 12, -22, 3.5, 'wall');
    B(-11.5, -39, -9.5, -37, 1.2, 'crate'); B(9.5, -39, 11.5, -37, 1.2, 'crate');
    // Caixas de cobertura nos corredores
    B(-32, -32, -29, -29, 2, 'crate'); B(-27, -21, -25, -19, 1.4, 'crate');
    B(-21, -31, -19.5, -29.5, 1.5, 'metal'); B(-37, -21, -34, -18, 2.4, 'conc');
    B(29, -30, 32, -27, 2, 'crate'); B(24, -22, 26, -20, 1.4, 'crate');
    B(33, -20, 35, -18, 2, 'metal'); B(20, -33, 22, -31, 1.2, 'crate');
    // Divisórias e estrangulamentos
    B(-22, -18, -21, -10, 4, 'wall'); B(21, -18, 22, -10, 4, 'wall');
    B(-18, -18, -10, -17, 2.6, 'wall'); B(10, -18, 18, -17, 2.6, 'wall');
    // Torre oeste com rampa (variação de altura)
    B(-18, -16, -14, -12, 3, 'conc'); R(-14, -16, -8, -12, 3, '-x', 'metal');
    // Núcleo central: edifício com 4 portas e plataforma interna elevada
    B(-9, -9, -2, -8, 4.5, 'wall'); B(2, -9, 9, -8, 4.5, 'wall');
    B(-9, -8, -8, -2, 4.5, 'wall'); B(8, -8, 9, -2, 4.5, 'wall');
    B(-3, -3, 3, 0, 1.5, 'conc'); R(-2.5, -6, 2.5, -3, 1.5, '+z', 'metal');
    B(-7, -6, -5, -4, 1.2, 'crate'); B(5, -7, 7, -5, 1.2, 'crate');
    // Degraus de acesso ao site A
    B(-32, -13, -24, -12, 0.5, 'siteA');
  });

  // Site A (oeste): plataforma baixa com rampa a leste e degraus ao norte/sul
  box(-39, -12, -22, 12, 1, 'siteA'); ramp(-22, -3, -18, 3, 1, '-x', 'siteA');
  box(-36, -8, -33, -5, 1.8, 'crate', 1); box(-30, 3, -27, 6, 1.4, 'crate', 1);
  box(-27, -6, -25.5, -4.5, 1, 'metal', 1); box(-36, 5, -34, 7, 2.2, 'metal', 1);
  // Site B (leste): plataforma alta, rampa a oeste e passarela superior
  box(24, -10, 40, 10, 1.5, 'siteB'); ramp(18, -3, 24, 3, 1.5, '+x', 'siteB');
  box(33, -4, 40, 4, 1.5, 'metal', 1.5);
  ramp(34, 4, 38, 9, 1.5, '-z', 'metal', 1.5); ramp(34, -9, 38, -4, 1.5, '+z', 'metal', 1.5);
  box(26, -8, 29, -5, 1.2, 'crate', 1.5); box(27, 4, 30, 7, 1.8, 'crate', 1.5); box(30, -1, 31.5, 1, 1, 'metal', 1.5);

  // Caixas AABB para raios/granadas (rampas viram fatias)
  const rb = [];
  for (const s of S) {
    if (s.k === 'b') { rb.push([s.x0, s.y0, s.z0, s.x1, s.y1, s.z1]); continue; }
    const N = 10, ax = s.dir[1], sg = s.dir[0] === '+' ? 1 : -1;
    const a0 = ax === 'x' ? s.x0 : s.z0, a1 = ax === 'x' ? s.x1 : s.z1, L = (a1 - a0) / N;
    for (let i = 0; i < N; i++) {
      const lo = a0 + i * L, hi = lo + L;
      const tEnd = sg > 0 ? (hi - a0) / (a1 - a0) : (a1 - lo) / (a1 - a0);
      const top = s.y0 + s.h * tEnd;
      rb.push(ax === 'x' ? [lo, s.y0, s.z0, hi, top, s.z1] : [s.x0, s.y0, lo, s.x1, top, hi]);
    }
  }

  const spawns = [[], []];
  for (let side = 0; side < 2; side++) {
    const sg = side === 0 ? -1 : 1;
    for (const zo of [3, 6]) for (const x of [-7.5, -2.5, 2.5, 7.5]) spawns[side].push({ x, z: sg * (limit - zo), yaw: side === 0 ? Math.PI : 0 });
  }
  return {
    limit, solids: S, rayBoxes: rb, spawns, bound: 40 - 0.4,
    sites: [{ name: 'A', x: -30, z: 0, r: 8 }, { name: 'B', x: 31, z: 0, r: 7 }],
  };
}

export const THEMES = {
  day: { name: 'Bastião', sky: [0.28, 0.5, 0.85], horizon: [0.8, 0.88, 0.95], fog: 0xb9c9d8, fogD: 0.012, sun: 0xfff1d6, sunI: 3.2, sunDir: [-0.5, 0.75, 0.35], hemi: [0xbfd8ff, 0x6b5b45, 0.55], tint: 0xffffff },
  dusk: { name: 'Crepúsculo', sky: [0.16, 0.14, 0.38], horizon: [1.0, 0.55, 0.32], fog: 0x6b4a5a, fogD: 0.016, sun: 0xff9a52, sunI: 2.6, sunDir: [0.75, 0.28, -0.4], hemi: [0x8f7cc0, 0x3a2a30, 0.5], tint: 0xe8c9b8 },
};
