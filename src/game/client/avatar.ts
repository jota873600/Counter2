// @ts-nocheck
/** Avatar do jogador (busto com a cabeça, rosto e acessório da skin), desenhado em canvas e devolvido como imagem. */
import { SKINS, clampSkin } from '../shared/skins';
import { drawFace } from './models';

const cache = new Map();
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function rr(x, px, py, w, h, r, fill) {
  x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); x.fillStyle = fill; x.fill();
}

export function avatarUrl(skinId, size = 96) {
  const id = clampSkin(skinId), key = id + ':' + size;
  if (cache.has(key)) return cache.get(key);
  const k = SKINS[id], c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size * 0.35, 2, size / 2, size / 2, size * 0.8); g.addColorStop(0, '#2f4468'); g.addColorStop(1, '#101826');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const cx = size / 2, hw = size * 0.6, hh = hw * 0.94, hx = cx - hw / 2, hy = size * 0.2;
  rr(x, size * 0.1, size * 0.8, size * 0.8, size * 0.4, size * 0.08, '#3a7bd5'); // ombros (cor do time)
  const acc = k.accColor != null ? hex(k.accColor) : null;
  if (k.acc === 'ears' && acc) for (const s of [-1, 1]) { x.fillStyle = acc; x.beginPath(); x.moveTo(cx + s * hw * 0.5, hy + hh * 0.1); x.lineTo(cx + s * hw * 0.22, hy - hh * 0.2); x.lineTo(cx + s * hw * 0.05, hy + hh * 0.08); x.closePath(); x.fill(); }
  if (k.acc === 'antenna' && acc) { x.strokeStyle = '#8a94a3'; x.lineWidth = size * 0.025; x.beginPath(); x.moveTo(cx, hy); x.lineTo(cx, hy - hh * 0.22); x.stroke(); x.fillStyle = acc; x.beginPath(); x.arc(cx, hy - hh * 0.26, size * 0.04, 0, 7); x.fill(); }
  if (k.acc === 'mohawk' && acc) rr(x, cx - hw * 0.09, hy - hh * 0.2, hw * 0.18, hh * 0.32, size * 0.02, acc);
  rr(x, hx, hy, hw, hh, hw * 0.22, hex(k.skin)); // cabeça
  if (k.acc === 'cap' && acc) { rr(x, hx - hw * 0.04, hy - hh * 0.12, hw * 1.08, hh * 0.38, hw * 0.16, acc); rr(x, hx - hw * 0.02, hy + hh * 0.2, hw * 1.04, hh * 0.07, 2, acc); }
  if (k.acc === 'headband' && acc) rr(x, hx - hw * 0.02, hy + hh * 0.2, hw * 1.04, hh * 0.12, 2, acc);
  const fs = hw * 0.78; x.save(); x.translate(cx - fs / 2, hy + hh * 0.5 - fs / 2 + hh * 0.04); x.scale(fs / 128, fs / 128); drawFace(x, k.face); x.restore(); // rosto
  const url = c.toDataURL('image/png'); cache.set(key, url); return url;
}
