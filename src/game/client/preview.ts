// @ts-nocheck
/**
 * Pré-visualização 3D do boneco no lobby: renderer próprio e leve (30 fps), em cima de uma plataforma,
 * balançando devagar; arraste para girar. É descartado ao iniciar a partida para liberar a GPU.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCharacter, setCharWeapon, animateCharacter } from './models';

const TEAM_BLUE = 0x3a7bd5;

export class CharPreview {
  constructor(host) {
    this.host = host; this.alive = true; this.raf = 0; this.t = 0; this.drag = 0; this.vel = 0; this.last = 0; this.down = null;
    this.canvas = document.createElement('canvas');
    host.insertBefore(this.canvas, host.firstChild);
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
    try {
      const pm = new THREE.PMREMGenerator(this.r);
      this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
      this.scene.environment = this.env; this.scene.environmentIntensity = 0.55;
    } catch { /* sem ambiente: só as luzes abaixo */ }
    this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x28303c, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.5, 3.5, 3.5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x3b82f6, 2.2); rim.position.set(-3, 2.2, -2.5); this.scene.add(rim);
    // plataforma
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.84, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0x1b2638, roughness: 0.45, metalness: 0.5 }));
    plat.position.y = -0.03; this.scene.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.014, 8, 72), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.004; this.scene.add(ring);
    this.plat = [plat, ring];
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.ch = null;

    this.onDown = (e) => { this.down = e.clientX; this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId); };
    this.onMove = (e) => { if (this.down == null) return; const dx = e.clientX - this.down; this.down = e.clientX; this.drag += dx * 0.012; this.vel = dx * 0.012; };
    this.onUp = () => { this.down = null; };
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.resize();
  }

  /** Troca a skin (e o time) do boneco exibido. */
  setLook(skin, team = 0, weapon = 'ar') {
    if (this.ch) this.group.remove(this.ch);
    this.ch = buildCharacter(team ? 0xe8832a : TEAM_BLUE, skin);
    setCharWeapon(this.ch, weapon);
    this.group.add(this.ch);
    this.pose(0);
    this.draw();
  }

  pose(dt) {
    if (!this.ch) return;
    const sway = Math.sin(this.t * 0.7) * 0.45;
    animateCharacter(this.ch, dt, { speed: 0, grounded: true, cr: 0, pitch: 0, yaw: Math.PI + sway + this.drag, kind: 'gun', helm: 0, armor: 0, alive: true, dv: [0, 0], kick: 0 });
  }

  resize() {
    if (!this.alive) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    // enquadra o boneco inteiro (1,8 m de altura, ~1,7 m de largura com a plataforma)
    const tf = Math.tan((this.cam.fov * Math.PI) / 360);
    const d = Math.max(1.2 / tf, 1.0 / (tf * this.cam.aspect));
    this.cam.position.set(0, 1.05, d); this.cam.lookAt(0, 0.9, 0);
    this.draw();
  }

  draw() { if (this.alive) this.r.render(this.scene, this.cam); }

  start() {
    if (this.raf || !this.alive) return;
    this.last = performance.now();
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      if (now - this.last < 32) return; // ~30 fps
      const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
      this.t += dt;
      if (this.down == null) { this.drag += this.vel; this.vel *= 0.92; } // inércia ao soltar
      this.pose(dt); this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    for (const m of this.plat) { m.geometry.dispose(); m.material.dispose(); }
    if (this.env) this.env.dispose();
    this.r.dispose(); try { this.r.forceContextLoss(); } catch { /* */ }
    this.canvas.remove();
  }
}
