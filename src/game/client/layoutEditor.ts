// @ts-nocheck
/**
 * Editor de controles de toque em tela cheia: arraste para mover, use o controle de tamanho,
 * e então Salvar (grava) ou Voltar (descarta). Funciona no lobby e durante a partida.
 */
import { settings, saveSettings } from './settings';
import { ICON, FIRE_RING } from './icons';
import { TOUCH_BUTTONS, JOY_DEF, styleJoy } from './touch';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function openLayoutEditor(app) {
  if (document.querySelector('.ce')) return;
  app.beforeModal();
  const W = () => window.innerWidth, H = () => window.innerHeight;
  const defs = {}; for (const [id, , label, def] of TOUCH_BUTTONS) defs[id] = { label, def };
  defs.joy = { label: 'Joystick', def: JOY_DEF };
  let draft = JSON.parse(JSON.stringify(settings.touchLayout || {}));
  let dirty = false, sel = 'fire';
  const cur = (id) => ({ ...defs[id].def, ...(draft[id] || {}) });

  const o = document.createElement('div'); o.className = 'ce ui-block'; app.root.appendChild(o);
  o.innerHTML = `
    <div class="ce-ghost" style="left:9px;top:9px;width:132px;height:132px">minimapa</div>
    <div class="ce-ghost" style="left:9px;bottom:12px;width:206px;height:50px">vida / colete</div>
    <div class="ce-ghost" style="right:7px;bottom:10px;width:132px;height:56px">munição</div>
    <div class="ce-ghost" style="right:8px;bottom:70px;width:104px;height:32px">dinheiro</div>
    <div class="ce-bar">
      <button class="btn g" data-x="back">← Voltar</button>
      <button class="btn g" data-x="reset">Restaurar</button>
      <button class="btn ok" data-x="save">💾 Salvar</button>
    </div>
    <div class="ce-size">
      <div class="ce-sel"><b data-x="name"></b><small>toque num botão para escolher · arraste para mover</small></div>
      <div class="ce-ctl"><button class="btn g sm" data-x="minus">−</button><input type="range" data-x="range"><button class="btn g sm" data-x="plus">+</button><span data-x="val"></span></div>
    </div>`;
  const q = (s) => o.querySelector(s);

  // elementos editáveis
  const els = {};
  for (const [id, icon] of TOUCH_BUTTONS) {
    const b = document.createElement('div'); b.className = 't-btn ce-el'; b.dataset.id = id;
    b.innerHTML = `<span class="ic">${ICON[icon] || ''}</span><small>${defs[id].label}</small>`;
    if (id === 'fire') b.insertAdjacentHTML('beforeend', FIRE_RING);
    o.appendChild(b); els[id] = b;
  }
  const jb = document.createElement('div'); jb.className = 't-joy-base ce-el show'; jb.dataset.id = 'joy';
  jb.innerHTML = '<div class="t-joy-knob"></div><small>Joystick</small>'; o.appendChild(jb); els.joy = jb;

  const range = q('[data-x=range]');
  const limits = (id) => (id === 'joy' ? [80, 200] : [36, 120]);
  const joyMax = () => ({ l: Math.max(0, W() * 0.45 - cur('joy').s), b: Math.max(0, H() * 0.6 - cur('joy').s) });

  const place = (id) => {
    const l = cur(id), e = els[id];
    if (id === 'joy') { styleJoy(e, e.querySelector('.t-joy-knob'), l.s); e.style.left = l.l + 'px'; e.style.bottom = l.b + 'px'; e.style.top = ''; }
    else { e.style.right = l.r + 'px'; e.style.bottom = l.b + 'px'; e.style.width = e.style.height = l.s + 'px'; }
  };
  const refreshPanel = () => {
    const l = cur(sel), [lo, hi] = limits(sel);
    q('[data-x=name]').textContent = defs[sel].label; range.min = lo; range.max = hi; range.value = l.s; q('[data-x=val]').textContent = Math.round(l.s) + ' px';
    for (const id in els) els[id].classList.toggle('sel', id === sel);
  };
  const setSize = (v) => {
    const [lo, hi] = limits(sel); v = clamp(Math.round(v), lo, hi);
    draft[sel] = { ...cur(sel), s: v };
    if (sel === 'joy') { const m = joyMax(); draft.joy.l = clamp(draft.joy.l, 0, m.l); draft.joy.b = clamp(draft.joy.b, 0, m.b); }
    dirty = true; place(sel); refreshPanel();
  };
  range.oninput = () => setSize(+range.value);
  q('[data-x=minus]').onclick = () => setSize(cur(sel).s - 4);
  q('[data-x=plus]').onclick = () => setSize(cur(sel).s + 4);

  // arrastar / selecionar
  for (const id in els) {
    const e = els[id]; let drag = null;
    e.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation(); e.setPointerCapture(ev.pointerId);
      sel = id; refreshPanel(); const c = cur(id); drag = { x: ev.clientX, y: ev.clientY, c };
    });
    e.addEventListener('pointermove', (ev) => {
      if (!drag) return;
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y, c = drag.c;
      if (id === 'joy') { const m = joyMax(); draft.joy = { ...c, l: clamp(c.l + dx, 0, m.l), b: clamp(c.b - dy, 0, m.b) }; }
      else draft[id] = { ...c, r: clamp(c.r - dx, 0, W() - c.s), b: clamp(c.b - dy, 0, H() - c.s) };
      if (Math.abs(dx) + Math.abs(dy) > 2) dirty = true;
      place(id);
    });
    const end = () => { drag = null; };
    e.addEventListener('pointerup', end); e.addEventListener('pointercancel', end);
  }

  const close = () => { o.remove(); app.afterModal(); };
  q('[data-x=reset]').onclick = () => { draft = {}; dirty = true; for (const id in els) place(id); refreshPanel(); };
  q('[data-x=save]').onclick = () => {
    settings.touchLayout = draft; saveSettings(); if (app.touch) app.touch.applyLayout();
    app.hud.toast('Controles salvos!'); close();
  };
  const back = q('[data-x=back]'); let armed = 0;
  back.onclick = () => {
    if (dirty && !armed) { armed = setTimeout(() => { armed = 0; back.textContent = '← Voltar'; }, 3000); back.textContent = 'Descartar? Toque de novo'; return; }
    clearTimeout(armed); close();
  };
  for (const id in els) place(id);
  refreshPanel();
}
