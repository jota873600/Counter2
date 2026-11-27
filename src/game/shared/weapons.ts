// @ts-nocheck
/**
 * Dados de armas, itens, economia e constantes físicas.
 * Compartilhado entre cliente (Three.js) e servidor autoritativo / simulação offline.
 */
export const TICK = 30;

/** Constantes do jogador (metros / segundos). */
export const PL = {
  r: 0.35, hStand: 1.8, hCrouch: 1.35, eyeStand: 1.65, eyeCrouch: 1.25,
  step: 0.55, run: 6.2, walk: 3.1, crouch: 2.7,
  accel: 10, airAccel: 12, airCap: 0.65, friction: 6, gravity: 22, jump: 7.2,
};

/** Economia e regras de partida. */
export const ECON = {
  START: 800, MAX: 16000, WIN: 3250, LOSS: 1400, STEP: 500, STREAKMAX: 4,
  BUY: 15, ROUND: 105, END: 5, WINROUNDS: 8, HALF: 7, MEDTIME: 3.5, MEDHEAL: 45,
  MAX_HP: 200,
};

/** Multiplicadores de dano por parte do corpo. */
export const PARTS = { head: 4, chest: 1, arm: 0.9, leg: 0.75 };

const gun = (o) => ({ draw: 0.45, auto: false, pel: 1, spd: 1, kr: 300, pen: 0.5, ads: 0.85, scope: false, ...o });

/**
 * sp = [dispersão base, +movimento, +no ar] em graus (meio-ângulo do cone)
 * rec = padrão de recuo previsível {p: pitch/tiro, y: amplitude lateral, f: frequência, ph: fase, n: tiros até estabilizar}
 */
export const W = {
  knife: { id: 'knife', name: 'Lâmina Tática', slot: 'knife', cat: 'gear', price: 0, dmg: 40, dmg2: 90, rate: 0.42, rate2: 1.0, range: 1.9, spd: 1.08, kr: 1500, draw: 0.4, mag: 0, res: 0 },
  p9: gun({ id: 'p9', name: 'P-9 Sentinela', slot: 'secondary', cat: 'pistols', price: 0, dmg: 26, rpm: 380, mag: 12, res: 48, rl: 2.0, range: 45, pen: 0.55, sp: [0.35, 2.0, 3.5], rec: { p: 0.9, y: 0.25, f: 1.7, ph: 0, n: 4 }, ads: 0.9, kr: 300 }),
  t50: gun({ id: 't50', name: 'Titã .50', slot: 'secondary', cat: 'pistols', price: 650, dmg: 62, rpm: 160, mag: 7, res: 28, rl: 2.6, range: 55, pen: 0.85, sp: [0.3, 3, 5], rec: { p: 3.4, y: 0.4, f: 1.3, ph: 1, n: 2 }, spd: 0.97, ads: 0.9 }),
  r18: gun({ id: 'r18', name: 'Rajada-18', slot: 'secondary', cat: 'pistols', price: 450, dmg: 20, rpm: 750, auto: true, mag: 20, res: 80, rl: 2.1, range: 30, pen: 0.45, sp: [0.8, 2.5, 4], rec: { p: 0.75, y: 0.5, f: 2.3, ph: 2, n: 6 }, ads: 0.9 }),
  smg: gun({ id: 'smg', name: 'Vespa-9', slot: 'primary', cat: 'smgs', price: 1200, dmg: 23, rpm: 880, auto: true, mag: 30, res: 120, rl: 2.3, range: 35, pen: 0.55, sp: [0.5, 2.6, 4], rec: { p: 0.7, y: 0.45, f: 1.9, ph: 0.5, n: 7 }, spd: 1.02, kr: 600, ads: 0.88 }),
  ak47pix: gun({ id: 'ak47pix', name: 'AK Pixel', slot: 'primary', cat: 'smgs', price: 1500, dmg: 27, rpm: 650, auto: true, mag: 30, res: 90, rl: 2.4, range: 45, pen: 0.65, sp: [0.55, 2.8, 4.5], rec: { p: 1.1, y: 0.5, f: 1.6, ph: 0.6, n: 7 }, spd: 0.98, kr: 650, ads: 0.86 }),
  shotgun: gun({ id: 'shotgun', name: 'Trovão-12', slot: 'primary', cat: 'heavy', price: 1800, dmg: 10, pel: 8, rpm: 75, mag: 6, res: 30, rl: 3.0, range: 22, pen: 0.5, sp: [3.0, 1, 2], rec: { p: 5, y: 0.4, f: 1, ph: 0, n: 1 }, spd: 0.95, kr: 900, ads: 0.9 }),
  ar: gun({ id: 'ar', name: 'Falcão AR-4', slot: 'primary', cat: 'rifles', price: 2700, dmg: 33, rpm: 600, auto: true, mag: 30, res: 90, rl: 2.5, range: 80, pen: 0.78, sp: [0.25, 3, 5], rec: { p: 0.85, y: 0.55, f: 1.4, ph: 0.8, n: 8 }, spd: 0.92, ads: 0.78 }),
  sniper: gun({ id: 'sniper', name: 'Lince SR', slot: 'primary', cat: 'rifles', price: 4750, dmg: 112, rpm: 48, mag: 5, res: 20, rl: 3.4, range: 200, pen: 0.95, sp: [0.05, 5, 9], rec: { p: 4, y: 0.2, f: 1, ph: 0, n: 1 }, spd: 0.85, scope: true, draw: 0.7, ads: 0.4, kr: 100 }),
  lmg: gun({ id: 'lmg', name: 'Mamute LM', slot: 'primary', cat: 'heavy', price: 5200, dmg: 31, rpm: 700, auto: true, mag: 100, res: 200, rl: 5.2, range: 75, pen: 0.8, sp: [0.45, 3.5, 6], rec: { p: 0.6, y: 0.7, f: 1.1, ph: 2, n: 12 }, spd: 0.8, draw: 0.8, ads: 0.82, kr: 300 }),
  frag: { id: 'frag', name: 'Granada de Fragmentação', slot: 'grenade', cat: 'grenades', price: 300, fuse: 1.9, dmg: 98, rad: 8, draw: 0.5, kr: 300, mag: 0, res: 0 },
  smoke: { id: 'smoke', name: 'Granada de Fumaça', slot: 'grenade', cat: 'grenades', price: 300, fuse: 1.5, dur: 18, rad: 3.8, draw: 0.5, mag: 0, res: 0 },
  flash: { id: 'flash', name: 'Flashbang', slot: 'grenade', cat: 'grenades', price: 200, fuse: 1.4, draw: 0.5, mag: 0, res: 0 },
  medkit: { id: 'medkit', name: 'Kit Médico', slot: 'medkit', cat: 'gear', price: 400, draw: 0.5, mag: 0, res: 0 },
};

/** Itens extras da loja (não são armas). */
export const ITEMS = {
  vest: { id: 'vest', name: 'Colete', cat: 'gear', price: 650 },
  vesthelm: { id: 'vesthelm', name: 'Colete + Capacete', cat: 'gear', price: 1000 },
  medkit: W.medkit,
};

export const SHOP_CATS = [
  ['pistols', 'Pistolas'], ['smgs', 'SMGs'], ['rifles', 'Fuzis'],
  ['heavy', 'Pesadas'], ['gear', 'Equipamentos'], ['grenades', 'Granadas'],
];

export const GREN_MAX = { frag: 1, smoke: 1, flash: 2 };

/** Recuo previsível: devolve [yaw, pitch] em graus acumulados no tiro de índice i. */
export function recoilKick(w, i) {
  const k = w.rec;
  const ramp = i < k.n ? 1 : 0.35;
  const lat = Math.sin(i * k.f + k.ph) * k.y * (i > 2 ? 1 : 0.3);
  return [lat, k.p * ramp];
}

/** Queda de dano por distância. */
export function dmgFalloff(w, d) {
  const half = w.range * 0.5;
  if (d <= half) return 1;
  return Math.max(0.5, 1 - 0.5 * Math.min(1, (d - half) / half));
}

/** Ângulos de visão finais = ângulos do mouse + punch de recuo (graus). */
export function viewAngles(yaw, pitch, punch) {
  const R = Math.PI / 180;
  return [yaw - punch[0] * R, pitch + punch[1] * R];
}

export const DIFFS = [
  // track = o quanto o bot "atrasa" ao acompanhar um alvo que se move de lado (strafe); menor = mira melhor contra quem se move
  { name: 'Fácil', err: 0.05, react: 0.7, turn: 3.0, fireErr: 0.14, burst: 0.3, speed: 0.75, head: 0.05, track: 0.42 },
  { name: 'Médio', err: 0.024, react: 0.42, turn: 6, fireErr: 0.09, burst: 0.5, speed: 0.9, head: 0.15, track: 0.22 },
  { name: 'Difícil', err: 0.01, react: 0.2, turn: 11, fireErr: 0.05, burst: 0.8, speed: 1, head: 0.3, track: 0.1 },
];
