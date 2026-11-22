// @ts-nocheck
/**
 * Efeitos visuais com pooling: partículas (faíscas, poeira, fumaça, fogo, sangue), tracers de bala,
 * decalques de buraco de bala (InstancedMesh) e cápsulas/estilhaços com física (cannon-es).
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

function softTex(cloudy) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const blob = (cx, cy, r, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); };
  if (cloudy) { blob(64, 64, 60, 0.5); for (let i = 0; i < 14; i++) blob(64 + (Math.random() - 0.5) * 50, 64 + (Math.random() - 0.5) * 50, 20 + Math.random() * 22, 0.35); }
  else blob(64, 64, 64, 1);
  const t = new THREE.CanvasTexture(cv); return t;
}

class Particles {
  constructor(scene, max, additive, tex) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.c0 = new Float32Array(max * 4); this.c1 = new Float32Array(max * 4); this.fi = new Float32Array(max);
    this.life.fill(0);
    const g = (this.geo = new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 800 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=min(size*scale/max(0.1,-mv.z),420.); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ float a=texture2D(map,gl_PointCoord).a*vC.a; if(a<0.004) discard; gl_FragColor=vec4(vC.rgb,a); }',
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 6 : 5; scene.add(this.pts);
  }
  emit(o) {
    const k = this.i; this.i = (this.i + 1) % this.max;
    this.pos[k * 3] = o.x; this.pos[k * 3 + 1] = o.y; this.pos[k * 3 + 2] = o.z;
    this.vel[k * 3] = o.vx || 0; this.vel[k * 3 + 1] = o.vy || 0; this.vel[k * 3 + 2] = o.vz || 0;
    this.life[k] = o.life; this.age[k] = 0; this.grav[k] = o.grav || 0; this.drag[k] = o.drag || 0; this.s0[k] = o.s0; this.s1[k] = o.s1 ?? o.s0; this.fi[k] = o.fi ?? 0.05;
    const a = o.c0, b = o.c1 || o.c0;
    for (let j = 0; j < 4; j++) { this.c0[k * 4 + j] = a[j]; this.c1[k * 4 + j] = b[j]; }
  }
  update(dt) {
    for (let k = 0; k < this.max; k++) {
      if (this.life[k] <= 0) { this.size[k] = 0; continue; }
      this.age[k] += dt;
      if (this.age[k] >= this.life[k]) { this.life[k] = 0; this.size[k] = 0; continue; }
      const t = this.age[k] / this.life[k], dr = Math.exp(-this.drag[k] * dt);
      this.vel[k * 3] *= dr; this.vel[k * 3 + 1] = this.vel[k * 3 + 1] * dr - this.grav[k] * dt; this.vel[k * 3 + 2] *= dr;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      if (this.pos[k * 3 + 1] < 0.02 && this.grav[k] > 0) { this.pos[k * 3 + 1] = 0.02; this.vel[k * 3 + 1] *= -0.3; this.vel[k * 3] *= 0.6; this.vel[k * 3 + 2] *= 0.6; }
      this.size[k] = this.s0[k] + (this.s1[k] - this.s0[k]) * t;
      const fade = Math.min(1, t / this.fi[k]);
      for (let j = 0; j < 4; j++) this.col[k * 4 + j] = (this.c0[k * 4 + j] + (this.c1[k * 4 + j] - this.c0[k * 4 + j]) * t) * (j === 3 ? fade : 1);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.attributes.size.needsUpdate = true;
  }
}

export class FX {
  constructor(scene, engine) {
    this.scene = scene; this.engine = engine;
    this.add = new Particles(scene, 900, true, softTex(false));
    this.nrm = new Particles(scene, 1800, false, softTex(true));
    // Tracers
    this.tracers = [];
    const tg = new THREE.BoxGeometry(0.018, 0.018, 1); tg.translate(0, 0, -0.5);
    const tm = new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(tg, tm); m.visible = false; m.frustumCulled = false; scene.add(m); this.tracers.push({ m, a: new THREE.Vector3(), b: new THREE.Vector3(), t: 0, d: 0, on: false }); }
    this.ti = 0;
    // Decalques
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(10,10,10,0.95)'); g.addColorStop(0.35, 'rgba(20,20,20,0.8)'); g.addColorStop(0.7, 'rgba(60,55,50,0.25)'); g.addColorStop(1, 'rgba(60,55,50,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    this.decalMax = 300; this.di = 0;
    this.decals = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 1 }), this.decalMax);
    this.decals.frustumCulled = false; this.decals.count = this.decalMax;
    const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.decalMax; i++) this.decals.setMatrixAt(i, z);
    scene.add(this.decals);
    this.dummy = new THREE.Object3D();
    this.debris = null;
  }

  /** Cria o mundo de física (cápsulas / estilhaços) com colisores estáticos do mapa. */
  initPhysics(map) {
    if (this.debris) { this.scene.remove(this.debris.casM, this.debris.chunkM); }
    const w = new CANNON.World({ gravity: new CANNON.Vec3(0, -12, 0) }); w.broadphase = new CANNON.SAPBroadphase(w); w.allowSleep = true;
    const mat = new CANNON.Material('m'); w.addContactMaterial(new CANNON.ContactMaterial(mat, mat, { friction: 0.45, restitution: 0.4 }));
    for (const b of map.rayBoxes) {
      const body = new CANNON.Body({ mass: 0, material: mat }); body.addShape(new CANNON.Box(new CANNON.Vec3((b[3] - b[0]) / 2, (b[4] - b[1]) / 2, (b[5] - b[2]) / 2)));
      body.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); w.addBody(body);
    }
    const mk = (n, half, geo, material) => {
      const mesh = new THREE.InstancedMesh(geo, material, n); mesh.frustumCulled = false; mesh.castShadow = false; this.scene.add(mesh);
      const items = [];
      for (let i = 0; i < n; i++) { const body = new CANNON.Body({ mass: 0.02, material: mat, linearDamping: 0.05, angularDamping: 0.2, sleepSpeedLimit: 0.2, sleepTimeLimit: 0.4 }); body.addShape(new CANNON.Box(new CANNON.Vec3(...half))); body.position.set(0, -100, 0); w.addBody(body); items.push({ body, age: 99, life: 0, s: [1, 1, 1] }); mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); }
      return { mesh, items, i: 0 };
    };
    const cg = new THREE.CylinderGeometry(0.0055, 0.0055, 0.04, 8); cg.rotateZ(Math.PI / 2);
    this.cas = mk(40, [0.02, 0.006, 0.006], cg, new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.9, roughness: 0.3 }));
    this.chunk = mk(48, [0.05, 0.05, 0.05], new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x777066, roughness: 0.9 }));
    this.debris = { world: w, casM: this.cas.mesh, chunkM: this.chunk.mesh };
  }
  clearDecals() { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.decalMax; i++) this.decals.setMatrixAt(i, z); this.decals.instanceMatrix.needsUpdate = true; }

  spawnBody(pool, pos, vel, scale, life) {
    if (!this.debris) return;
    const it = pool.items[pool.i]; pool.i = (pool.i + 1) % pool.items.length;
    it.body.position.set(pos[0], pos[1], pos[2]); it.body.velocity.set(vel[0], vel[1], vel[2]); it.body.angularVelocity.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    it.body.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6); it.body.wakeUp(); it.age = 0; it.life = life; it.s = scale;
  }
  casing(pos, right) { this.spawnBody(this.cas, pos, [right[0] * (1.5 + Math.random()) + (Math.random() - 0.5), 1.6 + Math.random(), right[2] * (1.5 + Math.random()) + (Math.random() - 0.5)], [1, 1, 1], 4); }

  syncPool(pool, dt) {
    const d = this.dummy;
    pool.items.forEach((it, i) => {
      it.age += dt;
      if (it.age > it.life) { if (it.life > 0) { it.life = 0; it.body.position.set(0, -100, 0); it.body.velocity.setZero(); } d.scale.set(0, 0, 0); d.position.set(0, -100, 0); }
      else { d.position.copy(it.body.position); d.quaternion.copy(it.body.quaternion); const k = Math.min(1, (it.life - it.age) / 0.6); d.scale.set(it.s[0] * k, it.s[1] * k, it.s[2] * k); }
      d.updateMatrix(); pool.mesh.setMatrixAt(i, d.matrix);
    });
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt, cam, vh) {
    this.add.mat.uniforms.scale.value = this.nrm.mat.uniforms.scale.value = vh * 0.5 / Math.tan((cam.fov * Math.PI) / 360);
    this.add.update(dt); this.nrm.update(dt);
    for (const t of this.tracers) {
      if (!t.on) continue;
      t.t += dt;
      const L = t.a.distanceTo(t.b), head = Math.min(L, t.t * 320), tail = Math.max(0, head - 7);
      if (t.t * 320 - 7 > L) { t.on = false; t.m.visible = false; continue; }
      const dir = t.b.clone().sub(t.a).normalize(), h = t.a.clone().addScaledVector(dir, head);
      t.m.position.copy(h); t.m.lookAt(h.clone().add(dir)); t.m.scale.set(1, 1, Math.max(0.05, head - tail));
    }
    if (this.debris) { this.debris.world.step(1 / 60, dt, 3); this.syncPool(this.cas, dt); this.syncPool(this.chunk, dt); }
  }

  tracer(from, to) {
    const t = this.tracers[this.ti]; this.ti = (this.ti + 1) % this.tracers.length;
    t.a.set(...from); t.b.set(...to); t.t = 0; t.on = true; t.m.visible = true;
  }

  decal(p, n) {
    const d = this.dummy, N = new THREE.Vector3(n[0], n[1], n[2]);
    d.position.set(p[0] + n[0] * 0.012, p[1] + n[1] * 0.012, p[2] + n[2] * 0.012);
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), N); d.rotateZ(Math.random() * 6.28);
    const s = 0.1 + Math.random() * 0.06; d.scale.set(s, s, s); d.updateMatrix();
    this.decals.setMatrixAt(this.di, d.matrix); this.di = (this.di + 1) % this.decalMax; this.decals.instanceMatrix.needsUpdate = true;
  }

  /** Impacto na parede: faíscas, poeira, lascas e decalque. */
  impact(p, n) {
    if (n[0] || n[1] || n[2]) this.decal(p, n);
    for (let i = 0; i < 5; i++) this.add.emit({ x: p[0], y: p[1], z: p[2], vx: n[0] * 3 + (Math.random() - 0.5) * 3, vy: n[1] * 3 + Math.random() * 2, vz: n[2] * 3 + (Math.random() - 0.5) * 3, life: 0.25 + Math.random() * 0.2, grav: 12, s0: 0.05, s1: 0.01, c0: [1, 0.8, 0.4, 1], c1: [1, 0.4, 0.1, 0] });
    for (let i = 0; i < 3; i++) this.nrm.emit({ x: p[0], y: p[1], z: p[2], vx: n[0] * 0.8 + (Math.random() - 0.5) * 0.6, vy: n[1] * 0.8 + 0.3 + Math.random() * 0.4, vz: n[2] * 0.8 + (Math.random() - 0.5) * 0.6, life: 0.7 + Math.random() * 0.5, drag: 2, s0: 0.12, s1: 0.5, c0: [0.7, 0.66, 0.6, 0.4], c1: [0.7, 0.66, 0.6, 0], fi: 0.1 });
    if (Math.random() < 0.5) this.spawnBody(this.chunk, p, [n[0] * 2 + (Math.random() - 0.5) * 2, n[1] * 2 + 1.5, n[2] * 2 + (Math.random() - 0.5) * 2], [0.02, 0.02, 0.02], 1.6);
  }

  muzzle(p, dir) {
    for (let i = 0; i < 4; i++) this.add.emit({ x: p[0], y: p[1], z: p[2], vx: dir[0] * (6 + Math.random() * 6) + (Math.random() - 0.5), vy: dir[1] * 6 + (Math.random() - 0.5), vz: dir[2] * (6 + Math.random() * 6) + (Math.random() - 0.5), life: 0.06, s0: 0.28, s1: 0.1, c0: [1, 0.8, 0.45, 0.9], c1: [1, 0.5, 0.2, 0] });
    this.nrm.emit({ x: p[0], y: p[1], z: p[2], vx: dir[0] * 1.5, vy: 0.3, vz: dir[2] * 1.5, life: 0.8, drag: 2, s0: 0.1, s1: 0.5, c0: [0.7, 0.7, 0.7, 0.18], c1: [0.7, 0.7, 0.7, 0], fi: 0.05 });
  }

  blood(p, dir, n = 8) {
    for (let i = 0; i < n; i++) this.nrm.emit({ x: p[0], y: p[1], z: p[2], vx: dir[0] * 2 + (Math.random() - 0.5) * 2.5, vy: Math.random() * 2.5, vz: dir[2] * 2 + (Math.random() - 0.5) * 2.5, life: 0.5 + Math.random() * 0.4, grav: 9, s0: 0.07, s1: 0.04, c0: [0.55, 0.02, 0.02, 0.95], c1: [0.3, 0, 0, 0.5], fi: 0.01 });
  }

  dust(p, n = 6) {
    for (let i = 0; i < n; i++) this.nrm.emit({ x: p[0] + (Math.random() - 0.5) * 0.3, y: p[1] + 0.05, z: p[2] + (Math.random() - 0.5) * 0.3, vx: (Math.random() - 0.5) * 1.2, vy: 0.3 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 1.2, life: 0.9 + Math.random() * 0.5, drag: 2, s0: 0.2, s1: 0.9, c0: [0.72, 0.66, 0.56, 0.3], c1: [0.72, 0.66, 0.56, 0], fi: 0.1 });
  }

  explosion(p) {
    for (let i = 0; i < 50; i++) { const a = Math.random() * 6.28, e = Math.random() * 2 - 0.4, s = 4 + Math.random() * 9; this.add.emit({ x: p[0], y: p[1] + 0.3, z: p[2], vx: Math.cos(a) * s, vy: e * s * 0.8 + 2, vz: Math.sin(a) * s, life: 0.35 + Math.random() * 0.4, drag: 3, s0: 0.9, s1: 2.2, c0: [1, 0.75, 0.3, 0.95], c1: [1, 0.25, 0.05, 0] }); }
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 5; this.nrm.emit({ x: p[0], y: p[1] + 0.5, z: p[2], vx: Math.cos(a) * s, vy: 1 + Math.random() * 4, vz: Math.sin(a) * s, life: 1.6 + Math.random() * 1.6, drag: 1.2, s0: 1.2, s1: 4.5, c0: [0.25, 0.23, 0.22, 0.75], c1: [0.4, 0.38, 0.36, 0], fi: 0.08 }); }
    for (let i = 0; i < 20; i++) this.add.emit({ x: p[0], y: p[1] + 0.3, z: p[2], vx: (Math.random() - 0.5) * 16, vy: 4 + Math.random() * 10, vz: (Math.random() - 0.5) * 16, life: 0.6 + Math.random() * 0.5, grav: 14, s0: 0.12, s1: 0.03, c0: [1, 0.8, 0.4, 1], c1: [1, 0.3, 0.1, 0] });
    for (let i = 0; i < 16; i++) this.spawnBody(this.chunk, [p[0], p[1] + 0.3, p[2]], [(Math.random() - 0.5) * 12, 4 + Math.random() * 8, (Math.random() - 0.5) * 12], [0.04 + Math.random() * 0.06, 0.04 + Math.random() * 0.05, 0.04 + Math.random() * 0.06], 3);
    this.engine.pulseLight(p, 0xffa850, 120, 0.45);
  }

  flashBang(p) { for (let i = 0; i < 14; i++) this.add.emit({ x: p[0], y: p[1], z: p[2], vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, life: 0.3, s0: 1.2, s1: 3, c0: [1, 1, 1, 1], c1: [1, 1, 1, 0] }); this.engine.pulseLight(p, 0xffffff, 200, 0.35); }

  smoke(p, dur) {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.28, r = Math.random() * 2.6, h = Math.random() * 2.2;
      this.nrm.emit({ x: p[0] + Math.cos(a) * r * 0.4, y: p[1] + 0.3 + h * 0.5, z: p[2] + Math.sin(a) * r * 0.4, vx: Math.cos(a) * (0.5 + Math.random()), vy: 0.1 + Math.random() * 0.3, vz: Math.sin(a) * (0.5 + Math.random()), life: dur * (0.85 + Math.random() * 0.15), drag: 1.4, s0: 2.2, s1: 6.5 + Math.random() * 2, c0: [0.72, 0.74, 0.76, 0.92], c1: [0.6, 0.62, 0.64, 0.25], fi: 0.06 });
    }
  }
}
