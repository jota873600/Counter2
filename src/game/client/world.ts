// @ts-nocheck
/**
 * Motor gráfico: renderer, iluminação com sombras suaves, névoa, skybox procedural, pós-processamento
 * (bloom leve, vinheta, correção de cor, SMAA) e construção da geometria do mapa com texturas procedurais PBR.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { THEMES } from '../shared/map';
import { topAt } from '../shared/physics';

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.38 }, uSat: { value: 1.12 }, uCon: { value: 1.06 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uDamage: { value: 0 }, uFlash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig,uSat,uCon,uDamage,uFlash; uniform vec3 uTint; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv); vec3 col=c.rgb*uTint;
    float l=dot(col,vec3(0.299,0.587,0.114)); col=mix(vec3(l),col,uSat); col=(col-0.5)*uCon+0.5;
    vec2 q=vUv-0.5; float d=length(q*vec2(1.15,1.0)); col*=1.0-uVig*smoothstep(0.35,0.95,d);
    col+=vec3(0.75,0.02,0.02)*smoothstep(0.25,0.9,d)*uDamage; col=mix(col,vec3(1.0),uFlash); gl_FragColor=vec4(col,c.a); }`,
};

export class Engine {
  constructor(canvas, quality) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 700);
    this.vmScene = new THREE.Scene(); this.vmCam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4a3f33, 1.4));
    const vl = new THREE.DirectionalLight(0xfff0dd, 2.4); vl.position.set(0.4, 1, 0.6); this.vmScene.add(vl);
    this.vmScene.add(this.vmCam);
    this.flashLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffaa55, 0, 25, 2); this.scene.add(l); return { l, t: 0, d: 1, i: 0 }; });
    this.shake = 0; this.quality = quality;
    this.buildComposer();
    this.setQuality(quality);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  buildComposer() {
    const r = this.renderer;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    const c = (this.composer = new EffectComposer(r, rt));
    this.rp = new RenderPass(this.scene, this.camera); c.addPass(this.rp);
    this.vmp = new RenderPass(this.vmScene, this.vmCam); this.vmp.clear = false; this.vmp.clearDepth = true; c.addPass(this.vmp);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.6, 0.88); c.addPass(this.bloom);
    this.grade = new ShaderPass(GRADE); c.addPass(this.grade);
    c.addPass(new OutputPass());
    this.smaa = new SMAAPass(); c.addPass(this.smaa);
  }

  setQuality(q) {
    this.quality = q;
    const dpr = Math.min(devicePixelRatio || 1, q === 'high' ? 1.75 : 1);
    this.pixel = q === 'low' ? 0.75 : dpr;
    this.bloom.enabled = q !== 'low'; this.smaa.enabled = q !== 'low';
    if (this.sun) {
      this.sun.castShadow = q !== 'low';
      const sz = q === 'high' ? 2048 : 1024;
      if (this.sun.shadow.mapSize.x !== sz) { this.sun.shadow.mapSize.set(sz, sz); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    }
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(this.pixel || 1); this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixel || 1); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.vmCam.aspect = w / h; this.vmCam.updateProjectionMatrix();
  }

  /** Luz pontual temporária (explosões / clarão). */
  pulseLight(pos, color, intensity, dur) {
    const f = this.flashLights.reduce((a, b) => (a.t < b.t ? a : b));
    f.l.position.set(pos[0], pos[1], pos[2]); f.l.color.set(color); f.i = intensity; f.t = dur; f.d = dur;
  }
  updateLights(dt) { for (const f of this.flashLights) { f.t = Math.max(0, f.t - dt); f.l.intensity = f.i * (f.t / f.d) ** 2; } }

  render(dt) { this.updateLights(dt); this.composer.render(dt); }

  /** Monta o céu, a iluminação, a névoa e a geometria do mapa. */
  loadMap(map, themeId) {
    if (this.mapGroup) { this.scene.remove(this.mapGroup); this.mapGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const T = THEMES[themeId] || THEMES.day;
    this.theme = T;
    const g = (this.mapGroup = new THREE.Group()); this.scene.add(g);
    this.scene.fog = new THREE.FogExp2(T.fog, T.fogD);
    // Céu
    if (this.sky) this.scene.remove(this.sky);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Vector3(...T.sky) }, hor: { value: new THREE.Vector3(...T.horizon) }, sd: { value: new THREE.Vector3(...T.sunDir).normalize() }, fogc: { value: new THREE.Color(T.fog) } },
      vertexShader: 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top,hor,sd,fogc; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.1; a*=.5; } return s; }
      void main(){ vec3 d=normalize(vD); float y=d.y;
        vec3 col=mix(hor,top,pow(max(y,0.),0.5));
        float s=max(dot(d,sd),0.); col+=vec3(1.,.85,.6)*(pow(s,800.)*10.+pow(s,14.)*.3);
        if(y>0.02){ vec2 uv=d.xz/(y+0.25)*1.6; float c=smoothstep(.48,.78,fbm(uv+vec2(3.,1.))); col=mix(col,mix(vec3(1.),hor,.25)*(0.75+0.4*s),c*.8*smoothstep(0.02,0.25,y)); }
        col=mix(col,fogc,1.0-smoothstep(-0.05,0.12,y)); gl_FragColor=vec4(col,1.); }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat); this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.scene.add(this.sky);
    // IBL a partir do céu
    const pm = new THREE.PMREMGenerator(this.renderer), es = new THREE.Scene(), em = this.sky.clone(); es.add(em);
    this.scene.environment = pm.fromScene(es, 0, 0.1, 1000).texture; this.scene.environmentIntensity = 0.55; pm.dispose();
    this.vmScene.environment = this.scene.environment; this.vmScene.environmentIntensity = 0.7;
    // Luzes
    if (this.sun) this.scene.remove(this.sun);
    if (this.hemi) this.scene.remove(this.hemi);
    this.hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]); this.scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(T.sun, T.sunI));
    const sd = new THREE.Vector3(...T.sunDir).normalize();
    sun.position.copy(sd.multiplyScalar(90)); sun.target.position.set(0, 0, 0);
    sun.shadow.camera.left = -62; sun.shadow.camera.right = 62; sun.shadow.camera.top = 62; sun.shadow.camera.bottom = -62; sun.shadow.camera.near = 10; sun.shadow.camera.far = 220;
    sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);
    this.setQuality(this.quality);
    // Geometria do mapa mesclada por material
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const mats = {}, groups = {};
    for (const s of map.solids) {
      if (s.m === 'floor' && s.y1 <= 0) { /* chão é desenhado abaixo como plano grande */ }
      (groups[s.m] ||= []).push(solidGeo(s));
    }
    const tint = new THREE.Color(T.tint);
    for (const [m, geos] of Object.entries(groups)) {
      mats[m] = pbrMat(m, aniso, tint);
      const mesh = new THREE.Mesh(mergeGeometries(geos), mats[m]); mesh.castShadow = m !== 'floor'; mesh.receiveShadow = true; g.add(mesh);
    }
    // Marcas de objetivo: letras A/B pintadas no chão + anel luminoso
    for (const s of map.sites) {
      const top = topAt(map.solids.find((o) => o.k === 'b' && s.x >= o.x0 && s.x <= o.x1 && s.z >= o.z0 && s.z <= o.z1 && o.y1 > 0.5 && o.y1 < 2 && o.m.startsWith('site')) || { k: 'b', y1: 0 }, s.x, s.z);
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.9)'; x.font = 'bold 150px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s.name, 128, 138);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      p.rotation.x = -Math.PI / 2; p.position.set(s.x, top + 0.02, s.z); g.add(p);
    }
    // Luzes de poste no mapa (emissivas para o bloom)
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    for (const [x, z] of [[-24, -26], [24, -26], [-24, 26], [24, 26], [0, -14], [0, 14]]) {
      if (Math.abs(z) > map.limit - 2) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.6, metalness: 0.7 })); pole.position.set(x, 2.25, z); pole.castShadow = true;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), lampM); lamp.position.set(x, 4.6, z); g.add(pole, lamp);
    }
  }
}

/* -------- Geometria de sólidos (caixas e rampas) com UV mundial -------- */
function solidGeo(s) {
  const V = [];
  if (s.k === 'b') {
    const [x0, y0, z0, x1, y1, z1] = [s.x0, s.y0, s.z0, s.x1, s.y1, s.z1];
    const c = (x, y, z) => [x, y, z];
    const p = [c(x0, y0, z0), c(x1, y0, z0), c(x1, y0, z1), c(x0, y0, z1), c(x0, y1, z0), c(x1, y1, z0), c(x1, y1, z1), c(x0, y1, z1)];
    for (const q of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]]) { V.push([p[q[0]], p[q[1]], p[q[2]]], [p[q[0]], p[q[2]], p[q[3]]]); }
  } else {
    const ax = s.dir[1], sg = s.dir[0] === '+' ? 1 : -1;
    const pt = (u, v, y) => {
      const uu = sg > 0 ? u : 1 - u;
      return ax === 'x' ? [s.x0 + uu * (s.x1 - s.x0), y, s.z0 + v * (s.z1 - s.z0)] : [s.x0 + v * (s.x1 - s.x0), y, s.z0 + uu * (s.z1 - s.z0)];
    };
    const y0 = s.y0, y1 = s.y0 + s.h;
    const L0 = pt(0, 0, y0), L1 = pt(0, 1, y0), H0 = pt(1, 0, y0), H1 = pt(1, 1, y0), T0 = pt(1, 0, y1), T1 = pt(1, 1, y1);
    V.push([L0, L1, T1], [L0, T1, T0], [H0, T0, T1], [H0, T1, H1], [L0, H0, T0], [L1, T1, H1], [L0, L1, H1], [L0, H1, H0]);
  }
  const cen = [0, 0, 0], all = V.flat(); all.forEach((a) => { cen[0] += a[0]; cen[1] += a[1]; cen[2] += a[2]; }); cen.forEach((_, i) => (cen[i] /= all.length));
  const pos = [], nor = [], uv = [];
  for (let [a, b, c] of V) {
    let e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const l = Math.hypot(...n); if (l < 1e-9) continue;
    if (n[0] * (a[0] - cen[0]) + n[1] * (a[1] - cen[1]) + n[2] * (a[2] - cen[2]) < 0) { [b, c] = [c, b]; n = n.map((q) => -q); }
    n = n.map((q) => q / l);
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    for (const q of [a, b, c]) {
      pos.push(...q); nor.push(...n);
      if (ay >= ax && ay >= az) uv.push(q[0] / 2, q[2] / 2); else if (ax >= az) uv.push(q[2] / 2, q[1] / 2); else uv.push(q[0] / 2, q[1] / 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/* -------- Texturas procedurais -------- */
function noiseFill(x, w, h, amt, base) {
  const id = x.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(id, 0, 0);
}
function makeTex(kind, aniso) {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  let rough = 0.85, metal = 0;
  const rr = (a, b) => a + Math.random() * (b - a);
  if (kind === 'wall') {
    x.fillStyle = '#7a5f4d'; x.fillRect(0, 0, S, S);
    const bh = 32, bw = 64;
    for (let r = 0; r * bh < S; r++) for (let c = -1; c * bw < S; c++) {
      const off = r % 2 ? bw / 2 : 0, l = rr(-14, 14);
      x.fillStyle = `rgb(${150 + l},${100 + l * 0.7},${80 + l * 0.6})`; x.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
    noiseFill(x, S, S, 26);
  } else if (kind === 'conc') {
    x.fillStyle = '#8b8f93'; x.fillRect(0, 0, S, S); noiseFill(x, S, S, 34);
    x.strokeStyle = 'rgba(40,40,44,0.5)'; x.lineWidth = 2; x.strokeRect(1, 1, S - 2, S - 2); x.beginPath(); x.moveTo(0, S / 2); x.lineTo(S, S / 2); x.stroke();
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(30,30,30,${rr(0.03, 0.1)})`; x.fillRect(rr(0, S), rr(0, S), rr(10, 60), rr(4, 40)); }
  } else if (kind === 'crate') {
    x.fillStyle = '#8a6238'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 8; i++) { const l = rr(-18, 18); x.fillStyle = `rgb(${138 + l},${98 + l},${56 + l})`; x.fillRect(0, i * 32, S, 30); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, i * 32 + 30, S, 2); }
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(60,35,15,${rr(0.1, 0.3)})`; x.beginPath(); const y = rr(0, S); x.moveTo(rr(0, S), y); x.lineTo(rr(0, S), y + rr(-2, 2)); x.stroke(); }
    x.strokeStyle = '#4a2f18'; x.lineWidth = 16; x.strokeRect(8, 8, S - 16, S - 16); x.lineWidth = 12; x.beginPath(); x.moveTo(8, 8); x.lineTo(S - 8, S - 8); x.stroke();
    noiseFill(x, S, S, 18); rough = 0.75;
  } else if (kind === 'metal') {
    x.fillStyle = '#5b636c'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)'; x.fillRect(0, i * 16, S, 16); }
    x.fillStyle = 'rgba(20,22,25,0.7)'; for (let i = 0; i < 8; i++) for (const yy of [8, S - 8]) { x.beginPath(); x.arc(16 + i * 32, yy, 3, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3; x.strokeRect(0, 0, S, S); noiseFill(x, S, S, 20); rough = 0.45; metal = 0.7;
  } else if (kind === 'floor') {
    x.fillStyle = '#6c6a66'; x.fillRect(0, 0, S, S); noiseFill(x, S, S, 46);
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(20,20,20,${rr(0.04, 0.12)})`; x.beginPath(); x.arc(rr(0, S), rr(0, S), rr(4, 22), 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.strokeRect(0, 0, S, S); rough = 0.92;
  } else { // siteA / siteB: ladrilhos coloridos
    const A = kind === 'siteA', c0 = A ? [88, 118, 150] : [168, 112, 70];
    x.fillStyle = '#222'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const l = rr(-10, 10); x.fillStyle = `rgb(${c0[0] + l},${c0[1] + l},${c0[2] + l})`; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
    noiseFill(x, S, S, 18); rough = 0.55;
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  const b = new THREE.CanvasTexture(cv); b.wrapS = b.wrapT = THREE.RepeatWrapping; b.anisotropy = aniso;
  return { map: t, bump: b, rough, metal };
}
const texCache = {};
function pbrMat(kind, aniso, tint) {
  const k = kind;
  const t = texCache[k] || (texCache[k] = makeTex(k, aniso));
  return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughness: t.rough, metalness: t.metal, color: tint });
}
