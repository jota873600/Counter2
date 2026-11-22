// @ts-nocheck
/**
 * Entrada: teclado (event.code), mouse com Pointer Lock (olhar + andar + atirar simultâneos),
 * modo alternativo por borda de tela, detecção automática de dispositivo e estado dos botões.
 * Teclas, botões e movimento do mouse são estados independentes e simultâneos.
 */
import { settings } from './settings';

const GAME_KEYS = new Set(['Tab', 'Space', 'F1', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ControlLeft', 'KeyB', 'KeyG']);

export class Input {
  constructor(canvas, hooks) {
    this.canvas = canvas; this.hooks = hooks;
    this.keys = new Set(); this.btn = [false, false, false];
    this.lookX = 0; this.lookY = 0; this.locked = false; this.fallback = false; this.fallbackActive = false;
    this.mx = 0; this.my = 0; this.lockTimer = 0;
    this.touch = { mx: 0, my: 0, lx: 0, ly: 0, fire: false, aim: false, crouch: false };
    this.mode = this.guess();
    this.codeToAction = {};
    this.rebuild();
    this.applyMode();
    canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none';
    const w = window, d = document;
    w.addEventListener('keydown', (e) => this.keydown(e), true);
    w.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    d.addEventListener('mousemove', (e) => this.mousemove(e));
    d.addEventListener('mousedown', (e) => this.mousedown(e));
    d.addEventListener('mouseup', (e) => { if (e.button < 3) this.btn[e.button] = false; });
    d.addEventListener('contextmenu', (e) => { if (this.active() || e.target === canvas) e.preventDefault(); });
    d.addEventListener('wheel', (e) => { if (this.active()) hooks.onWheel && hooks.onWheel(e.deltaY > 0 ? 1 : -1); }, { passive: true });
    w.addEventListener('pointerdown', (e) => this.pointerType(e));
    w.addEventListener('pointermove', (e) => { this.pointerType(e); if (e.pointerType === 'mouse') { this.mx = e.clientX; this.my = e.clientY; } });
    d.addEventListener('pointerlockchange', () => this.lockChange());
    d.addEventListener('pointerlockerror', () => this.fail('error'));
    w.addEventListener('blur', () => this.resetAll());
    d.addEventListener('visibilitychange', () => { if (d.hidden) this.resetAll(); });
    d.addEventListener('fullscreenchange', () => {
      if (d.fullscreenElement && navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ControlLeft', 'Tab', 'F1']).catch(() => {});
      else if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
    });
  }

  /** Palpite inicial do dispositivo. */
  guess() {
    const fine = matchMedia('(pointer: fine)').matches, hover = matchMedia('(hover: hover)').matches;
    return fine && hover ? 'kbm' : (navigator.maxTouchPoints > 0 ? 'touch' : 'kbm');
  }
  rebuild() { this.codeToAction = {}; for (const [a, c] of Object.entries(settings.binds)) this.codeToAction[c] = a; }
  effectiveMode() { return settings.control === 'auto' ? this.mode : settings.control; }
  applyMode() {
    const m = this.effectiveMode();
    document.body.classList.toggle('mode-kbm', m === 'kbm');
    document.body.classList.toggle('mode-touch', m === 'touch');
    this.hooks.onMode && this.hooks.onMode(m);
  }
  setMode(m) { if (this.mode === m) return; this.mode = m; this.applyMode(); if (m === 'touch' && this.locked) this.exitLock(); }
  pointerType(e) { if (e.pointerType === 'mouse') this.setMode('kbm'); else if (e.pointerType === 'touch') this.setMode('touch'); }

  active() { return this.effectiveMode() === 'touch' || this.locked || this.fallbackActive; }

  isDown(a) {
    const c = settings.binds[a];
    if (a === 'crouch' && this.keys.has('ControlLeft')) return true;
    return this.keys.has(c);
  }

  keydown(e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      if (e.code === 'Enter' && e.target.dataset.chat) { this.hooks.onAction('chatsend'); e.preventDefault(); }
      return;
    }
    this.setMode('kbm');
    if (this.hooks.capture && this.hooks.capture(e)) return; // remapeamento
    const a = this.codeToAction[e.code];
    if (this.active() || a === 'help' || a === 'shop' || a === 'chat') {
      if (GAME_KEYS.has(e.code) || (a && !e.ctrlKey && !e.metaKey)) e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(e.code);
    if (a) this.hooks.onAction(a, e);
  }

  mousemove(e) {
    if (!this.locked) return;
    const dx = e.movementX || 0, dy = e.movementY || 0;
    if (Math.abs(dx) > 200 || Math.abs(dy) > 200) return; // ignora saltos absurdos
    this.lookX += dx; this.lookY += dy;
  }
  mousedown(e) {
    if (e.button > 2) return;
    if (!(this.locked || this.fallbackActive)) return;
    if (e.target.closest && e.target.closest('.ui-block')) return;
    this.btn[e.button] = true; e.preventDefault();
  }

  /** Clique no overlay: chama requestPointerLock DIRETAMENTE (gesto do usuário). */
  requestLock() {
    const c = this.canvas;
    if (this.effectiveMode() === 'touch') return;
    if (!c.requestPointerLock) { this.fail('unsupported'); return; }
    clearTimeout(this.lockTimer);
    try {
      const p = c.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { const p2 = c.requestPointerLock(); p2 && p2.catch && p2.catch(() => this.fail('error')); } catch { this.fail('error'); } });
    } catch { try { c.requestPointerLock(); } catch { this.fail('error'); } }
    this.lockTimer = setTimeout(() => { if (!this.locked) this.fail('timeout'); }, 500);
  }
  exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* */ } this.fallbackActive = false; this.resetAll(); }
  lockChange() {
    clearTimeout(this.lockTimer);
    this.locked = document.pointerLockElement === this.canvas;
    if (this.locked) { this.fallback = false; this.fallbackActive = false; }
    else this.resetAll();
    this.hooks.onLockChange && this.hooks.onLockChange(this.locked);
  }
  fail(reason) {
    this.locked = false; this.fallback = true;
    this.hooks.onLockFail && this.hooks.onLockFail(reason);
  }
  /** Ativa o giro por borda (quando o Pointer Lock não funciona). */
  startFallback() { this.fallbackActive = true; this.resetAll(); this.hooks.onLockChange && this.hooks.onLockChange(true); }

  resetAll() { this.keys.clear(); this.btn = [false, false, false]; this.lookX = this.lookY = 0; Object.assign(this.touch, { mx: 0, my: 0, fire: false, aim: false }); }

  axis() {
    const m = this.effectiveMode();
    let f = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    let s = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    if (m === 'touch' || this.touch.mx || this.touch.my) { f += -this.touch.my; s += this.touch.mx; f = Math.max(-1, Math.min(1, f)); s = Math.max(-1, Math.min(1, s)); }
    return [f, s];
  }
  fire() { return this.btn[0] || this.touch.fire; }
  aim() { return this.btn[2] || this.touch.aim; }

  /** Delta de olhar (radianos) acumulado desde o último frame, escalado pela sensibilidade e pelo FOV. */
  consumeLook(dt, fovScale) {
    let yaw = 0, pitch = 0;
    const k = 0.0006 * settings.sens * fovScale;
    yaw += this.lookX * k; pitch += this.lookY * k;
    if (this.touch.lx || this.touch.ly) { const t = 0.0045 * settings.touchSens * fovScale; yaw += this.touch.lx * t; pitch += this.touch.ly * t; }
    this.lookX = this.lookY = 0; this.touch.lx = this.touch.ly = 0;
    if (this.fallbackActive && !this.locked) {
      const W = innerWidth, H = innerHeight, nx = (this.mx - W / 2) / (W / 2), ny = (this.my - H / 2) / (H / 2);
      const dz = 0.55, sp = 2.6 * settings.sens * fovScale;
      if (Math.abs(nx) > dz) yaw += Math.sign(nx) * ((Math.abs(nx) - dz) / (1 - dz)) * sp * dt;
      if (Math.abs(ny) > 0.65) pitch += Math.sign(ny) * ((Math.abs(ny) - 0.65) / 0.35) * sp * 0.6 * dt;
    }
    return [yaw, pitch];
  }
}
