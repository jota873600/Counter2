// @ts-nocheck
/**
 * Modelos 100% procedurais (geometria própria): armas com miras abertas (alça + massa de mira),
 * granadas, faca, kit médico e personagens low-poly com animação procedural.
 * Convenção das armas: origem na empunhadura, cano apontando para -Z, topo +Y.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SKINS, clampSkin } from '../shared/skins';

const std = (color, rough, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
export const MAT = {
  metal: std(0x2d3138, 0.38, 0.85), dark: std(0x16181c, 0.5, 0.6), polymer: std(0x25292f, 0.7, 0.1), wood: std(0x6b4a2b, 0.65, 0),
  steel: std(0xa5adb7, 0.25, 0.95), brass: std(0xc9a14a, 0.35, 0.9), skin: std(0xd8a27a, 0.8, 0), glove: std(0x1c1f24, 0.8, 0.05),
  olive: std(0x4f5a34, 0.6, 0.2), grey: std(0x7c828a, 0.5, 0.5), white: std(0xe9edf0, 0.5, 0), red: std(0xc92a2a, 0.5, 0),
  lens: new THREE.MeshStandardMaterial({ color: 0x223a55, roughness: 0.05, metalness: 0.9, emissive: 0x0a1c30, emissiveIntensity: 0.6 }),
  boot: std(0x1b1b1d, 0.8, 0), visor: std(0x112233, 0.2, 0.6),
};
export const teamMat = (c) => std(c, 0.65, 0.05);

const box = (g, w, h, d, x, y, z, m = MAT.metal) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
const cyl = (g, r, len, x, y, z, m = MAT.metal, seg = 12) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };

/** Parâmetros por arma: rl/rh/rw = receptor, bl/br = cano, hg = guarda-mão, stock, mag, grip. */
const SPEC = {
  p9: { rl: 0.2, rh: 0.04, rw: 0.03, bl: 0.0, br: 0.008, hg: 0, stock: 0, mag: [0.026, 0.09, 0.05, -0.02, 0], grip: -0.25, slide: 1 },
  t50: { rl: 0.27, rh: 0.055, rw: 0.036, bl: 0.05, br: 0.013, hg: 0, stock: 0, mag: [0.03, 0.08, 0.05, -0.02, 0], grip: -0.25, slide: 1, big: 1 },
  r18: { rl: 0.23, rh: 0.045, rw: 0.032, bl: 0.03, br: 0.008, hg: 0, stock: 0, mag: [0.026, 0.15, 0.04, -0.06, 0.1], grip: -0.25, slide: 1 },
  smg: { rl: 0.34, rh: 0.06, rw: 0.042, bl: 0.1, br: 0.009, hg: 0.13, stock: 0.13, mag: [0.028, 0.17, 0.042, -0.15, 0.05], grip: -0.2, handle: 1 },
  shotgun: { rl: 0.36, rh: 0.055, rw: 0.04, bl: 0.38, br: 0.014, hg: 0, stock: 0.3, mag: null, grip: -0.15, pump: 1, wood: 1, tube: 1 },
  ar: { rl: 0.4, rh: 0.07, rw: 0.045, bl: 0.2, br: 0.01, hg: 0.28, stock: 0.28, mag: [0.03, 0.17, 0.045, -0.17, 0.2], grip: -0.2, handle: 1, carry: 1 },
  sniper: { rl: 0.5, rh: 0.06, rw: 0.04, bl: 0.52, br: 0.012, hg: 0.1, stock: 0.34, mag: [0.028, 0.08, 0.04, -0.2, 0], grip: -0.15, bolt: 1, scope: 1, wood: 1 },
  lmg: { rl: 0.52, rh: 0.09, rw: 0.062, bl: 0.34, br: 0.013, hg: 0.18, stock: 0.26, mag: [0.1, 0.1, 0.12, -0.2, 0], grip: -0.2, handle: 1, carry: 1, bipod: 1 },
};

/** Constrói o modelo da arma e devolve partes animáveis e pontos de ancoragem das mãos. */
export function buildWeapon(id) {
  const g = new THREE.Group(), parts = {};
  const info = { g, parts, sightY: 0.1, lh: new THREE.Vector3(0, -0.04, -0.2), rh: new THREE.Vector3(0, -0.02, 0.0), magPos: new THREE.Vector3(0, -0.1, -0.15), scope: false, kind: 'gun' };
  const S = SPEC[id];
  if (S) return buildGun(id, S, info);
  if (id === 'knife') {
    const k = new THREE.Group();
    box(k, 0.03, 0.03, 0.12, 0, 0, 0.02, MAT.polymer); box(k, 0.06, 0.02, 0.012, 0, 0, -0.045, MAT.steel);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.24), MAT.steel); bl.position.set(0, 0.0, -0.17); bl.castShadow = true; k.add(bl);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0225, 0.07, 4), MAT.steel); tip.rotation.x = -Math.PI / 2; tip.rotation.z = Math.PI / 4; tip.scale.set(0.35, 1, 1); tip.position.set(0, 0.0, -0.325); k.add(tip);
    g.add(k); info.kind = 'knife'; info.lh = new THREE.Vector3(0, -0.4, 0.3); info.muzzle = new THREE.Object3D(); return info;
  }
  if (id === 'frag' || id === 'smoke' || id === 'flash') {
    const col = id === 'frag' ? MAT.olive : id === 'smoke' ? MAT.grey : MAT.white;
    if (id === 'frag') { const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 12), col); s.position.set(0, 0.02, -0.05); s.castShadow = true; g.add(s); }
    else { cyl(g, 0.032, 0.14, 0, 0.02, -0.05, col, 14); cyl(g, 0.033, 0.02, 0, 0.02, -0.1, id === 'smoke' ? MAT.dark : MAT.red, 14); }
    box(g, 0.012, 0.012, 0.012, 0, 0.075, -0.05, MAT.steel);
    const lever = box(g, 0.012, 0.01, 0.07, 0.025, 0.07, -0.02, MAT.steel); parts.lever = lever;
    info.kind = 'nade'; info.lh = new THREE.Vector3(-0.1, -0.2, 0.2); info.muzzle = new THREE.Object3D(); return info;
  }
  if (id === 'medkit') {
    box(g, 0.2, 0.12, 0.09, 0, 0.02, -0.06, MAT.white); box(g, 0.06, 0.02, 0.092, 0, 0.02, -0.06, MAT.red); box(g, 0.02, 0.06, 0.092, 0, 0.02, -0.06, MAT.red);
    box(g, 0.1, 0.02, 0.02, 0, 0.09, -0.06, MAT.grey);
    info.kind = 'med'; info.lh = new THREE.Vector3(-0.12, -0.02, -0.06); info.muzzle = new THREE.Object3D(); return info;
  }
  return info;
}

function buildGun(id, S, info) {
  const { g, parts } = info;
  const top = 0.03 + S.rh, cy0 = 0.03 + S.rh / 2, recvZ0 = 0.07, recvZ1 = -(S.rl - 0.07);
  const metal = S.wood ? MAT.dark : MAT.metal;
  // Receptor / ferrolho (slide nas pistolas)
  const recvG = new THREE.Group(); g.add(recvG); parts.slide = recvG;
  box(recvG, S.rw, S.rh, S.rl, 0, cy0, (recvZ0 + recvZ1) / 2, S.slide ? MAT.metal : metal);
  if (S.slide) {
    box(g, S.rw * 0.9, 0.022, S.rl * 0.8, 0, 0.022, (recvZ0 + recvZ1) / 2 + 0.01, MAT.polymer);
    for (let i = 0; i < 4; i++) box(recvG, S.rw * 1.02, S.rh * 0.8, 0.004, 0, cy0, recvZ0 - 0.015 - i * 0.012, MAT.dark);
  }
  // Cano e guarda-mão
  const front = recvZ1;
  if (S.bl > 0) cyl(g, S.br, S.bl, 0, cy0 + (S.hg ? 0.004 : 0.012), front - S.bl / 2, MAT.dark);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, cy0 + 0.01, front - S.bl - 0.015); g.add(muzzle); info.muzzle = muzzle;
  if (S.bl > 0.06) cyl(g, S.br * 1.5, 0.045, 0, cy0 + 0.01, front - S.bl + 0.0, MAT.metal);
  let hgTop = top;
  if (S.hg) { box(g, S.rw * 1.1, S.rh * 0.9, S.hg, 0, cy0 - 0.008, front - S.hg / 2, S.wood ? MAT.wood : MAT.polymer); hgTop = cy0 - 0.008 + S.rh * 0.45; }
  if (S.tube) { cyl(g, 0.012, S.bl - 0.05, 0, cy0 - 0.03, front - (S.bl - 0.05) / 2, MAT.dark); }
  if (S.pump) { const p = box(g, 0.05, 0.04, 0.16, 0, cy0 - 0.035, front - 0.13, MAT.wood); parts.pump = p; }
  // Coronha
  if (S.stock) {
    const st = box(g, S.rw * 0.9, S.rh * 1.25, S.stock, 0, cy0 - 0.012, recvZ0 + S.stock / 2, S.wood ? MAT.wood : MAT.polymer);
    box(g, S.rw, S.rh * 1.6, 0.025, 0, cy0 - 0.02, recvZ0 + S.stock, MAT.dark);
    if (!S.wood) st.rotation.x = -0.04;
  }
  // Empunhadura e guarda-mato
  const gr = box(g, 0.03, 0.1, 0.035, 0, -0.02, 0.0, MAT.polymer); gr.rotation.x = S.grip;
  box(g, 0.012, 0.012, 0.07, 0, 0.005, -0.065, MAT.dark); box(g, 0.012, 0.03, 0.01, 0, 0.02, -0.1, MAT.dark);
  box(g, 0.006, 0.02, 0.006, 0, 0.03, -0.045, MAT.steel); // gatilho
  // Carregador (animável)
  const mg = new THREE.Group(); parts.mag = mg; g.add(mg);
  if (S.mag) {
    const [w, h, d, z, tilt] = S.mag;
    const m = box(mg, w, h, d, 0, -h / 2, 0, MAT.dark); m.rotation.x = tilt; m.position.z = Math.sin(tilt) * h / 2;
    box(mg, w * 1.05, 0.012, d * 1.05, 0, 0.0, 0, MAT.metal);
    mg.position.set(0, 0.03, z);
    info.magPos.set(0, 0.03 - h / 2, z + 0.02);
  } else { mg.visible = false; info.magPos.set(0, -0.05, -0.1); }
  if (S.mag && id === 'p9' || id === 't50') mg.position.z = -0.0;
  // Alavanca de armar
  if (S.handle || S.bolt) { const b = box(g, 0.012, 0.02, 0.05, S.rw / 2 + 0.01, cy0 + 0.01, -0.12, MAT.steel); parts.bolt = b; b.userData.z0 = b.position.z; }
  if (S.carry) { box(g, 0.012, 0.06, 0.12, 0, top + 0.035, -0.08, MAT.dark); box(g, 0.012, 0.012, 0.15, 0, top + 0.065, -0.08, MAT.dark); }
  if (S.bipod) { box(g, 0.01, 0.08, 0.01, 0.03, cy0 - 0.06, front - S.hg - 0.02, MAT.metal); box(g, 0.01, 0.08, 0.01, -0.03, cy0 - 0.06, front - S.hg - 0.02, MAT.metal); }

  // Miras abertas: alça (dois montantes com entalhe) e massa de mira alinhadas em x=0
  const sightH = 0.018;
  info.sightY = top + sightH;
  if (S.scope) {
    // Luneta com lentes
    cyl(g, 0.026, 0.26, 0, top + 0.04, -0.12, MAT.dark, 16); cyl(g, 0.034, 0.06, 0, top + 0.04, -0.23, MAT.dark, 16); cyl(g, 0.03, 0.05, 0, top + 0.04, 0.03, MAT.dark, 16);
    cyl(g, 0.027, 0.004, 0, top + 0.04, -0.262, MAT.lens, 16);
    box(g, 0.012, 0.03, 0.02, 0, top + 0.015, -0.05, MAT.metal); box(g, 0.012, 0.03, 0.02, 0, top + 0.015, -0.2, MAT.metal);
    info.scope = true; info.sightY = top + 0.04;
  } else {
    box(g, 0.006, sightH, 0.008, 0.009, top + sightH / 2, recvZ0 - 0.04, MAT.dark); box(g, 0.006, sightH, 0.008, -0.009, top + sightH / 2, recvZ0 - 0.04, MAT.dark); // alça
    box(g, 0.03, 0.006, 0.012, 0, top + 0.003, recvZ0 - 0.04, MAT.dark);
    const fz = front - Math.max(S.bl, S.hg) + (S.slide ? 0.035 : 0.04);
    const baseTop = S.hg ? hgTop : top;
    const fh = top + sightH - baseTop;
    if (fh > 0.001) box(g, 0.008, fh, 0.01, 0, baseTop + fh / 2, fz, MAT.dark); // base da massa de mira
    box(g, 0.004, 0.006, 0.006, 0, top + sightH - 0.003, fz, MAT.steel); // massa de mira
    box(g, 0.02, 0.003, 0.01, 0, top + sightH - 0.01, fz, MAT.dark);
  }
  info.lh.set(-0.005, cy0 - 0.045, S.pump ? front - 0.13 : (S.hg ? front - S.hg * 0.55 : -0.06));
  if (id === 'p9' || id === 't50' || id === 'r18') info.lh.set(0.02, -0.07, 0.0);
  info.rh.set(0, 0.0, 0.02);
  info.len = S.rl + S.bl;
  return info;
}

/* ------------------------------------------------------------------ */
/* Personagens                                                          */
/* ------------------------------------------------------------------ */

/* Estilo "boneco de blocos". As medidas seguem as caixas de acerto (PARTBOX em physics.ts):
 * pernas 0–0,85 m · tronco 0,85–1,48 m · cabeça 1,48–1,78 m · braços a 0,24–0,40 m do centro. */
const HIP_Y = 0.85;
const _geo = new Map();
/** Bloco de cantos arredondados (geometria compartilhada entre todos os bonecos). */
const rbox = (g, w, h, d, x, y, z, m, r = 0.035) => {
  const k = `${w}|${h}|${d}|${r}`;
  let ge = _geo.get(k); if (!ge) { ge = new RoundedBoxGeometry(w, h, d, 3, r); _geo.set(k, ge); }
  const o = new THREE.Mesh(ge, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o;
};

const _faceMats = new Map();
/** Rostos desenhados em canvas (um material por tipo de rosto). */
function faceMaterial(type) {
  let mat = _faceMats.get(type); if (mat) return mat;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round';
  const INK = '#0a0a0a';
  const oval = (cx, cy, rx, ry, col = INK) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); };
  const arc = (cx, cy, r, a0, a1, w = 6, col = INK) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, Math.PI * a0, Math.PI * a1); x.stroke(); };
  const line = (x0, y0, x1, y1, w = 5, col = INK) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
  const rr = (rx, ry, w, h, r, fill, stroke) => { x.beginPath(); x.moveTo(rx + r, ry); x.arcTo(rx + w, ry, rx + w, ry + h, r); x.arcTo(rx + w, ry + h, rx, ry + h, r); x.arcTo(rx, ry + h, rx, ry, r); x.arcTo(rx, ry, rx + w, ry, r); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 4; x.stroke(); } };
  switch (type) {
    case 'shades':
      rr(20, 48, 40, 24, 8, INK); rr(68, 48, 40, 24, 8, INK); line(60, 56, 68, 56, 5);
      line(28, 54, 40, 54, 3, 'rgba(255,255,255,0.55)'); line(76, 54, 88, 54, 3, 'rgba(255,255,255,0.55)');
      arc(64, 74, 22, 0.2, 0.8, 5); break;
    case 'ninja':
      rr(26, 52, 30, 11, 5, '#f4f4f4'); rr(72, 52, 30, 11, 5, '#f4f4f4'); oval(44, 58, 4, 4); oval(86, 58, 4, 4); break;
    case 'zombie':
      line(32, 48, 52, 68, 6, '#1f2a14'); line(52, 48, 32, 68, 6, '#1f2a14'); line(76, 48, 96, 68, 6, '#1f2a14'); line(96, 48, 76, 68, 6, '#1f2a14');
      line(38, 92, 90, 92, 6, '#1f2a14'); for (let i = 0; i < 5; i++) line(46 + i * 10, 86, 46 + i * 10, 98, 4, '#1f2a14'); break;
    case 'robot':
      rr(18, 46, 92, 26, 8, '#0c1a2a'); rr(28, 52, 28, 14, 5, '#7dd3fc'); rr(72, 52, 28, 14, 5, '#7dd3fc');
      for (let i = 0; i < 4; i++) line(46 + i * 13, 88, 46 + i * 13, 100, 5, '#27303c'); break;
    case 'cat':
      oval(42, 58, 5, 10); oval(86, 58, 5, 10);
      x.fillStyle = '#f08aa4'; x.beginPath(); x.moveTo(58, 72); x.lineTo(70, 72); x.lineTo(64, 80); x.closePath(); x.fill();
      arc(56, 82, 8, 0, 0.95, 4); arc(72, 82, 8, 0.05, 1, 4);
      line(8, 74, 32, 78, 3); line(8, 88, 32, 84, 3); line(120, 74, 96, 78, 3); line(120, 88, 96, 84, 3); break;
    case 'ghost':
      oval(44, 60, 9, 14); oval(84, 60, 9, 14); oval(64, 96, 8, 11); break;
    case 'grin':
      line(28, 44, 54, 54, 7); line(100, 44, 74, 54, 7); oval(44, 64, 5, 6); oval(84, 64, 5, 6);
      rr(32, 80, 64, 24, 7, '#f8f8f8', INK); for (let i = 1; i < 4; i++) line(32 + i * 16, 80, 32 + i * 16, 104, 3); break;
    default:
      oval(44, 58, 6, 11); oval(84, 58, 6, 11); arc(64, 66, 28, 0.18, 0.82, 6);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  _faceMats.set(type, mat); return mat;
}

const _skinMats = new Map();
function skinMaterials(id) {
  let m = _skinMats.get(id); if (m) return m;
  const k = SKINS[id];
  m = {
    skin: std(k.skin, k.metal ? 0.3 : 0.55, k.metal ? 0.6 : 0.02), legs: std(k.legs, 0.7, 0.02), shoes: std(k.shoes, 0.7, 0.02),
    acc: k.accColor != null ? std(k.accColor, 0.6, 0.05) : null,
  };
  _skinMats.set(id, m); return m;
}

/** Acessório da skin (boné, faixa, crista, antena, orelhas); some quando o capacete está equipado. */
function buildAccessory(head, k, mats) {
  const a = new THREE.Group(); head.add(a);
  switch (k.acc) {
    case 'cap': rbox(a, 0.37, 0.12, 0.37, 0, 0.27, 0, mats.acc, 0.05); rbox(a, 0.28, 0.025, 0.14, 0, 0.215, -0.2, mats.acc, 0.012); break;
    case 'headband': rbox(a, 0.36, 0.045, 0.36, 0, 0.235, 0, mats.acc, 0.02); rbox(a, 0.06, 0.07, 0.05, 0.1, 0.23, 0.19, mats.acc, 0.02); break;
    case 'mohawk': for (const z of [-0.09, 0, 0.09]) rbox(a, 0.055, 0.1, 0.09, 0, 0.36, z, mats.acc, 0.02); break;
    case 'antenna': {
      rbox(a, 0.02, 0.12, 0.02, 0, 0.37, 0, MAT.grey, 0.008);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: k.accColor })); ball.position.set(0, 0.46, 0); a.add(ball); break;
    }
    case 'ears':
      for (const s of [-1, 1]) { const e = rbox(a, 0.085, 0.1, 0.05, s * 0.1, 0.355, 0, mats.acc, 0.02); e.rotation.z = -s * 0.3; }
      break;
  }
  return a;
}

/** Personagem em blocos articulado: cor do time no torso/mangas + skin (cabeça, pernas, rosto, acessório). */
export function buildCharacter(color, skinId = 0) {
  const id = clampSkin(skinId), k = SKINS[id], mats = skinMaterials(id);
  const root = new THREE.Group(), body = teamMat(color);
  const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.12, 0, 0); hips.add(leg);
    rbox(leg, 0.22, 0.72, 0.24, 0, -0.36, 0, mats.legs);
    rbox(leg, 0.24, 0.13, 0.31, 0, -0.785, -0.03, mats.shoes, 0.05);
    legs.push(leg);
  }
  const upper = new THREE.Group(); hips.add(upper);
  const torso = rbox(upper, 0.48, 0.63, 0.28, 0, 0.315, 0, body, 0.05);
  const vest = rbox(upper, 0.52, 0.38, 0.32, 0, 0.36, 0, MAT.dark, 0.05); vest.visible = false;
  rbox(upper, 0.5, 0.07, 0.29, 0, 0.035, 0, MAT.dark, 0.03); // cinto
  const head = new THREE.Group(); head.position.set(0, 0.63, 0); upper.add(head);
  rbox(head, 0.34, 0.31, 0.34, 0, 0.155, 0, mats.skin, 0.085);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), faceMaterial(k.face));
  face.position.set(0, 0.155, -0.172); face.rotation.y = Math.PI; head.add(face);
  const helm = rbox(head, 0.38, 0.11, 0.38, 0, 0.26, 0, body, 0.05); helm.visible = false;
  const acc = buildAccessory(head, k, mats);
  const arms = [], hands = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.325, 0.58, 0); upper.add(arm);
    rbox(arm, 0.15, 0.32, 0.18, 0, -0.15, 0, body, 0.04);            // manga (cor do time)
    rbox(arm, 0.145, 0.24, 0.17, 0, -0.42, 0, mats.skin, 0.045);     // antebraço/mão
    arms.push(arm); hands.push(arm);
  }
  // Arma na mão direita
  const mount = new THREE.Group(); arms[1].add(mount); mount.position.set(0, -0.54, -0.02); mount.rotation.x = -Math.PI / 2;
  const flash = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flash.rotation.x = -Math.PI / 2; flash.visible = false; mount.add(flash);
  root.userData = { hips, legs, upper, head, arms, mount, torso, helm, vest, acc, flash, weapon: null, weaponId: '', walkT: 0, flashT: 0, deadT: 0, hipY: HIP_Y };
  return root;
}

export function setCharWeapon(ch, id) {
  const u = ch.userData;
  if (u.weaponId === id) return;
  u.weaponId = id;
  if (u.weapon) { u.mount.remove(u.weapon); u.weapon = null; }
  if (!id) return;
  const w = buildWeapon(id);
  w.g.scale.setScalar(1.15); w.g.position.set(0, 0.0, 0);
  u.mount.add(w.g); u.weapon = w.g;
  const m = w.muzzle.position;
  u.flash.position.set(m.x * 1.15, m.y * 1.15, m.z * 1.15 - 0.17);
}

/** Anima o personagem (andar, mira, agachar, queda de morte). */
export function animateCharacter(ch, dt, st) {
  const u = ch.userData;
  const sp = st.speed;
  if (st.grounded && sp > 0.4) u.walkT += dt * (2 + sp * 1.3);
  const amp = st.grounded ? Math.min(0.9, sp * 0.18) : 0.2;
  u.legs[0].rotation.x = Math.sin(u.walkT) * amp; u.legs[1].rotation.x = -Math.sin(u.walkT) * amp;
  const cr = st.cr;
  u.hips.position.y = u.hipY - 0.36 * cr;
  u.legs.forEach((l) => { l.scale.y = 1 - 0.3 * cr; l.rotation.x += 0.6 * cr; });
  u.upper.rotation.x = st.pitch * 0.25 + 0.25 * cr + Math.sin(u.walkT) * 0.02;
  u.head.rotation.x = st.pitch * 0.7;
  const two = st.kind !== 'knife' && st.kind !== 'nade';
  u.arms[1].rotation.x = 1.35 + st.pitch * 0.6 + (st.kick || 0);
  u.arms[0].rotation.x = two ? 1.25 + st.pitch * 0.6 : 0.1 + Math.sin(u.walkT) * 0.25;
  u.arms[0].rotation.z = two ? 0.35 : 0;
  if (!two) u.arms[1].rotation.x = st.kind === 'knife' ? 1.0 + (st.kick || 0) * 2 : 1.2;
  u.flashT = Math.max(0, u.flashT - dt); u.flash.visible = u.flashT > 0;
  u.helm.visible = !!st.helm; u.vest.visible = !!st.armor; if (u.acc) u.acc.visible = !st.helm;
  if (!st.alive) {
    u.deadT += dt; const e = Math.min(1, u.deadT / 0.55), k = e * e * (3 - 2 * e);
    ch.rotation.order = 'YXZ'; ch.rotation.y = Math.atan2(st.dv[0], st.dv[1]); ch.rotation.x = 1.5 * k; ch.position.y += 0.12 * k;
    u.arms[0].rotation.x = 0.6 * k; u.arms[1].rotation.x = 0.9 * k;
  } else { u.deadT = 0; ch.rotation.order = 'YXZ'; ch.rotation.x = 0; ch.rotation.y = st.yaw; }
}
