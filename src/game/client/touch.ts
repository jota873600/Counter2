// @ts-nocheck
/**
 * Controles de toque: joystick virtual, área de olhar (por pointerId, multitoque) e botões grandes,
 * semi-transparentes e reposicionáveis (modo de edição). Visíveis apenas no modo "Toque".
 */
import { settings, saveSettings } from './settings';

const BUTTONS = [
  ['fire', '🔥', 'Atirar', { r: 24, b: 120, s: 96 }], ['aim', '◎', 'Mirar', { r: 140, b: 190, s: 70 }],
  ['jump', '⤒', 'Pular', { r: 24, b: 240, s: 66 }], ['reload', '↻', 'Recarregar', { r: 130, b: 70, s: 58 }],
  ['crouch', '⤓', 'Agachar', { r: 210, b: 100, s: 58 }], ['swap', '⇄', 'Trocar', { r: 24, b: 330, s: 54 }],
  ['grenade', '💣', 'Granada', { r: 90, b: 320, s: 54 }], ['shop', '$', 'Loja', { r: 24, b: 400, s: 50 }], ['medkit', '✚', 'Kit', { r: 150, b: 320, s: 50 }],
];

export class TouchControls {
  constructor(root, input, hooks) {
    this.input = input; this.hooks = hooks; this.edit = false;
    const el = (this.el = document.createElement('div'));
    el.className = 'touch-ui';
    el.innerHTML = '<div class="t-look"></div><div class="t-joy"><div class="t-joy-base"><div class="t-joy-knob"></div></div></div>';
    root.appendChild(el);
    this.look = el.querySelector('.t-look'); this.joy = el.querySelector('.t-joy'); this.base = el.querySelector('.t-joy-base'); this.knob = el.querySelector('.t-joy-knob');
    this.btns = {};
    for (const [id, icon, label, def] of BUTTONS) {
      const b = document.createElement('div');
      b.className = 't-btn'; b.dataset.id = id; b.innerHTML = `<span>${icon}</span><small>${label}</small>`;
      el.appendChild(b); this.btns[id] = b; this.place(id, def);
      this.bindButton(b, id);
    }
    this.bindLook(); this.bindJoy();
  }
  place(id, def) {
    const b = this.btns[id], l = settings.touchLayout[id] || def;
    b.style.right = l.r + 'px'; b.style.bottom = l.b + 'px'; b.style.width = b.style.height = l.s + 'px';
  }
  setEdit(on) { this.edit = on; this.el.classList.toggle('editing', on); }
  resetLayout() { settings.touchLayout = {}; saveSettings(); for (const [id, , , def] of BUTTONS) this.place(id, def); }

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
    const t = this.input.touch, R = 55;
    this.joy.addEventListener('pointerdown', (e) => {
      if (pid !== null) return;
      pid = e.pointerId; this.joy.setPointerCapture(pid); e.preventDefault();
      const r = this.joy.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
      this.base.style.left = ox - r.left - 60 + 'px'; this.base.style.top = oy - r.top - 60 + 'px'; this.base.classList.add('show');
    });
    this.joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      this.knob.style.transform = `translate(${dx}px,${dy}px)`;
      t.mx = dx / R; t.my = dy / R;
    });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; t.mx = t.my = 0; this.knob.style.transform = ''; this.base.classList.remove('show'); };
    this.joy.addEventListener('pointerup', end); this.joy.addEventListener('pointercancel', end);
  }
}
