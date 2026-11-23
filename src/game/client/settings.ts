// @ts-nocheck
/** Configurações persistentes (localStorage), remapeamento de teclas e identidade local do jogador. */
export const DEFAULT_BINDS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', crouch: 'KeyC', walk: 'ShiftLeft',
  reload: 'KeyR', slot1: 'Digit1', slot2: 'Digit2', slot3: 'Digit3', slot4: 'Digit4', slot5: 'Digit5',
  grenade: 'KeyG', medkit: 'KeyH', shop: 'KeyB', use: 'KeyE', prev: 'KeyQ', score: 'Tab', chat: 'Enter', help: 'F1', drop: 'KeyX',
};
export const BIND_LABELS = {
  forward: 'Frente', back: 'Trás', left: 'Esquerda', right: 'Direita', jump: 'Pular', crouch: 'Agachar', walk: 'Andar silencioso',
  reload: 'Recarregar', slot1: 'Arma principal', slot2: 'Pistola', slot3: 'Faca', slot4: 'Granadas (alterna)', slot5: 'Kit médico',
  grenade: 'Granada', medkit: 'Usar kit médico', shop: 'Loja', use: 'Usar / pegar', prev: 'Arma anterior', score: 'Placar (segurar)', chat: 'Chat', help: 'Ajuda', drop: 'Largar arma',
};

const KEY = 'bastiao.settings.v1';
const defaults = { control: 'auto', sens: 1.2, fov: 75, volume: 0.6, quality: 'high', fps: false, blood: true, touchSens: 1, touchLayout: {}, helpSeen: false, skin: 0, style: 'blocks', binds: { ...DEFAULT_BINDS } };
export const settings = (() => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ...defaults, ...s, binds: { ...DEFAULT_BINDS, ...(s.binds || {}) } }; } catch { return { ...defaults }; }
})();
const subs = [];
export const onSettings = (f) => subs.push(f);
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* sem armazenamento */ }
  subs.forEach((f) => f(settings));
}

const NAMES = { Space: 'Espaço', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', Tab: 'Tab', Enter: 'Enter', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', Minus: '-', Equal: '=' };
/** Rótulo legível de um event.code (reflete o remapeamento). */
export function keyLabel(code) {
  if (!code) return '?';
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
export const bindLabel = (action) => keyLabel(settings.binds[action]);

export function loadIdentity() {
  try { return JSON.parse(localStorage.getItem('bastiao.id') || 'null') || { id: '', name: '' }; } catch { return { id: '', name: '' }; }
}
export function saveIdentity(i) { try { localStorage.setItem('bastiao.id', JSON.stringify(i)); } catch { /* */ } }
