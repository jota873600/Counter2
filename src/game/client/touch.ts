// @ts-nocheck
/**
 * Controles de toque: joystick virtual, área de olhar (por pointerId, multitoque) e botões grandes,
 * semi-transparentes e reposicionáveis (modo de edição). Visíveis apenas no modo "Toque".
 */
import { settings, saveSettings } from './settings';
import { ICON, FIRE_FX, FIRE_RING } from './icons';

// [id, ícone, rótulo, posição padrão (distância da direita/de baixo e tamanho, em px)] — coluna à direita como num FPS mobile
export const TOUCH_BUTTONS = [
  ['fire', 'fire', 'Atirar', { r: 128, b: 70, s: 70 }], ['aim', 'aim', 'Mirar', { r: 15, b: 268, s: 56 }],
  ['jump', 'jump', 'Pular', { r: 19, b: 100, s: 56 }], ['reload', 'reload', 'Recarregar', { r: 82, b: 157, s: 54 }],
  ['crouch', 'crouch', 'Agachar', { r: 15, b: 157, s: 56 }], ['swap', 'swap', 'Trocar', { r: 15, b: 214, s: 56 }],
  ['grenade', 'grenade', 'Granada', { r: 82, b: 215, s: 54 }], ['shop', 'shop', 'Loja', { r: 82, b: 270, s: 50 }], ['medkit', 'medkit', 'Kit', { r: 78, b: 100, s: 50 }],
];

/** Posição/tamanho padrão do joystick (base de repouso: distância da esquerda/de baixo e diâmetro, em px). */
export const JOY_DEF = { l: 34, b: 83, s: 120 };
/** Aplica o diâmetro do joystick (a bolinha central acompanha proporcionalmente). */
export function styleJoy(base, knob, s) {
  base.style.width = base.style.height = s + 'px';
  const k = Math.round(s * 0.42); knob.style.width = knob.style.height = k + 'px'; knob.style.left = knob.style.top = Math.round((s - k) / 2) + 'px';
}

export class TouchControls {
  constructor(root, input, hooks) {
    this.input = input; this.hooks = hooks; this.edit = false;
    const el = (this.el = document.createElement('div'));
    el.className = 'touch-ui';
    el.innerHTML = '<div class="t-look"></div><div class="t-joy"><div class="t-joy-base"><div class="t-joy-knob"></div></div></div>';
    root.appendChild(el);
    this.look = el.querySelector('.t-look'); this.joy = el.querySelector('.t-joy'); this.base = el.querySelector('.t-joy-base'); this.knob = el.querySelector('.t-joy-knob');
    this.btns = {};
    for (const [id, icon, label, def] of TOUCH_BUTTONS) {
      const b = document.createElement('div');
      b.className = 't-btn'; b.dataset.id = id; b.innerHTML = `<span class="ic">${ICON[icon] || ''}</span><i class="badge"></i><small>${label}</small>`;
      if (id === 'fire') { b.insertAdjacentHTML('afterbegin', FIRE_FX); b.insertAdjacentHTML('beforeend', FIRE_RING); }
      el.appendChild(b); this.btns[id] = b; this.place(id, def);
      this.bindButton(b, id);
    }
    this.bindLook(); this.bindJoy(); this.applyLayout();
  }
  /** (Re)aplica as posições/tamanhos salvos de todos os botões e do joystick. */
  applyLayout() {
    for (const [id, , , def] of TOUCH_BUTTONS) this.place(id, def);
    const j = { ...JOY_DEF, ...(settings.touchLayout.joy || {}) }; this.joyRest = j;
    styleJoy(this.base, this.knob, j.s); this.base.style.left = j.l + 'px'; this.base.style.bottom = j.b + 'px'; this.base.style.top = '';
  }
  place(id, def) {
    const b = this.btns[id], l = settings.touchLayout[id] || def;
    b.style.right = l.r + 'px'; b.style.bottom = l.b + 'px'; b.style.width = b.style.height = l.s + 'px';
  }
  /** Contador no canto do botão (ex.: nº de granadas); some e escurece o botão quando é zero. */
  setBadge(id, n) {
    const b = this.btns[id]; if (!b) return;
    if (b._n === n) return; b._n = n;
    const bd = b.querySelector('.badge'); bd.textContent = n > 0 ? String(n) : ''; bd.style.display = n > 0 ? 'block' : 'none'; b.classList.toggle('empty', !(n > 0));
  }
  setEdit(on) { this.edit = on; this.el.classList.toggle('editing', on); }
  resetLayout() { settings.touchLayout = {}; saveSettings(); this.applyLayout(); }

  bindButton(b, id) {
    const t = this.input.touch;
    let drag = null;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      b.setPointerCapture(e.pointerId);
      if (this.edit) { drag = { x: e.clientX, y: e.clientY, r: parseFloat(b.style.right), b: parseFloat(b.style.bottom) }; return; }
      b.classList.add('on');
      if (id === 'fire') t.fire = true;
      else if (id === 'aim') t.aim = !t.aim, b.classList.toggle('on', t.aim);
      else if (id === 'crouch') { t.crouch = !t.crouch; b.classList.toggle('on', t.crouch); }
      else if (id === 'jump') this.hooks.onAction('jumpTap');
      else this.hooks.onAction({ reload: 'reload', swap: 'prev', grenade: 'grenade', shop: 'shop', medkit: 'medkit' }[id]);
    });
    b.addEventListener('pointermove', (e) => {
      if (!drag) return;
      b.style.right = Math.max(0, drag.r - (e.clientX - drag.x)) + 'px'; b.style.bottom = Math.max(0, drag.b - (e.clientY - drag.y)) + 'px';
    });
    const up = () => {
      if (drag) { settings.touchLayout[id] = { r: parseFloat(b.style.right), b: parseFloat(b.style.bottom), s: parseFloat(b.style.width) }; saveSettings(); drag = null; return; }
      if (id === 'fire') t.fire = false;
      if (id !== 'aim' && id !== 'crouch') b.classList.remove('on');
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  }

  bindLook() {
    let pid = null, lx = 0, ly = 0;
    const t = this.input.touch;
    this.look.addEventListener('pointerdown', (e) => { if (pid !== null || this.edit) return; pid = e.pointerId; lx = e.clientX; ly = e.clientY; this.look.setPointerCapture(pid); e.preventDefault(); });
    this.look.addEventListener('pointermove', (e) => { if (e.pointerId !== pid) return; t.lx += e.clientX - lx; t.ly += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
    const end = (e) => { if (e.pointerId === pid) pid = null; };
    this.look.addEventListener('pointerup', end); this.look.addEventListener('pointercancel', end);
  }

  bindJoy() {
    let pid = null, ox = 0, oy = 0;
    const t = this.input.touch; let R = 55, S = 120;
    this.joy.addEventListener('pointerdown', (e) => {
      if (pid !== null) return;
      pid = e.pointerId; this.joy.setPointerCapture(pid); e.preventDefault();
      S = this.joyRest.s; R = S * 0.46;
      const r = this.joy.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
      this.base.style.left = ox - r.left - S / 2 + 'px'; this.base.style.top = oy - r.top - S / 2 + 'px'; this.base.style.bottom = 'auto'; this.base.classList.add('show');
    });
    this.joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      this.knob.style.transform = `translate(${dx}px,${dy}px)`;
      t.mx = dx / R; t.my = dy / R;
    });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; t.mx = t.my = 0; this.knob.style.transform = ''; this.base.classList.remove('show'); const j = this.joyRest; this.base.style.left = j.l + 'px'; this.base.style.top = ''; this.base.style.bottom = j.b + 'px'; };
    this.joy.addEventListener('pointerup', end); this.joy.addEventListener('pointercancel', end);
  }
}
