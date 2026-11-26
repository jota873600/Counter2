// @ts-nocheck
/**
 * Viewmodel em primeira pessoa: arma + braços/mãos com animações procedurais:
 * respiração, balanço ao andar (bob), sway ao virar, sacar/guardar, recarga em etapas
 * (tirar carregador, inserir, engatilhar), recuo, correr com arma abaixada, agachar,
 * miras abertas (arma alinhada ao centro) e uso do kit médico.
 */
import * as THREE from 'three';
import { buildWeapon, MAT, teamMat } from './models';
import { getHandMesh } from './character';

// Ajuste fino depois de ver no jogo de verdade: a mão extraída do boneco2 nasce com o
// eixo "de fábrica" dela (o jeito que o osso da mão foi orientado no Prisma3D Pro), que
// não necessariamente bate com a convenção usada aqui (eixo Y apontando no sentido do
// braço). Se a mão aparecer torta/de lado/de cabeça pra baixo, gire aqui até alinhar —
// não precisa mexer em mais nada.
const HAND_ROT_FIX = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
const HAND_POS_FIX = 0; // deslocamento extra ao longo do braço (metros), se a mão nascer deslocada

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const seg = (p, a, b) => ease((p - a) / (b - a));
const HIP = { gun: [0.17, -0.18, -0.4], knife: [0.2, -0.22, -0.36], nade: [0.16, -0.17, -0.32], med: [0.1, -0.22, -0.34] };

export class ViewModel {
  constructor(scene, cam, sfx) {
    this.scene = scene; this.cam = cam; this.sfx = sfx;
    this.root = new THREE.Group(); cam.add(this.root);
    this.cache = {}; this.cur = null; this.target = ''; this.phase = 'idle'; this.pt = 0;
    this.gun = new THREE.Group(); this.root.add(this.gun);
    this.ads = 0; this.bobT = 0; this.t = 0; this.sw = { x: 0, y: 0 }; this.kz = 0; this.krx = 0; this.slide = 0; this.pump = 0; this.flashT = 0;
    this.swingT = -1; this.swingHeavy = false; this.throwT = -1; this.hideNade = false; this.lastRl = -1; this.rlFlags = {};
    // Braços — usa a mão de verdade do boneco2 quando ela já estiver pronta (ver
    // maybeUpgradeHands()); antes disso, ou se a extração falhar, cai na caixinha simples.
    this.sleeveMat = teamMat(0x3a5f8f);
    const mkArm = (side) => {
      const g = new THREE.Group(), up = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1, 10), this.sleeveMat);
      const realHand = getHandMesh(side);
      const hand = realHand || new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.1), MAT.glove);
      const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 10), MAT.glove);
      g.add(up, hand, wrist); this.root.add(g); return { g, up, hand, wrist, side, real: !!realHand };
    };
    this.armR = mkArm('right'); this.armL = mkArm('left');
    this.handsUpgraded = false;
    // Clarão do cano
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,190,90,0.85)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    this.flash.visible = false; this.flash.renderOrder = 10; this.root.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffb060, 0, 3, 2); this.root.add(this.flashLight);
    this.rhT = new THREE.Vector3(); this.lhT = new THREE.Vector3();
  }

  setTeam(color) { this.sleeveMat.color.set(color); }
  model(id) { return this.cache[id] || (this.cache[id] = buildWeapon(id)); }

  /** O modelo .glb carrega em paralelo (pode demorar um pouco), então o braço nasce com
   *  a caixinha de sempre e troca sozinho pra mão de verdade assim que ela ficar pronta —
   *  sem isso, quem já tinha aberto o jogo antes do modelo carregar ficaria preso na
   *  caixinha pro resto da partida. Para de checar depois que as duas já trocaram. */
  maybeUpgradeHands() {
    if (this.handsUpgraded) return;
    const r = !this.armR.real && getHandMesh('right');
    const l = !this.armL.real && getHandMesh('left');
    if (r) { this.armR.g.remove(this.armR.hand); this.armR.hand = r; this.armR.real = true; this.armR.g.add(r); }
    if (l) { this.armL.g.remove(this.armL.hand); this.armL.hand = l; this.armL.real = true; this.armL.g.add(l); }
    if (this.armR.real && this.armL.real) this.handsUpgraded = true;
  }

  setWeapon(id) {
    if (this.cur) this.gun.remove(this.cur.g);
    this.cur = id ? this.model(id) : null; this.curId = id;
    if (this.cur) this.gun.add(this.cur.g);
    this.hideNade = false; this.lastRl = -1; this.rlFlags = {};
    if (this.cur && this.cur.parts.pump && this.cur.parts.pump.userData.base === undefined) this.cur.parts.pump.userData.base = this.cur.parts.pump.position.z;
    if (this.cur && this.cur.parts.mag) { this.cur.parts.mag.visible = !!this.cur.parts.mag.children.length && this.cur.info !== 0 && this.magOK(); }
  }
  magOK() { return this.cur && this.cur.parts.mag && this.cur.parts.mag.children.length > 0; }

  fire(wid) {
    const big = wid === 'sniper' ? 3 : wid === 'shotgun' ? 2.6 : wid === 't50' ? 2 : wid === 'lmg' ? 0.9 : 1;
    this.kz = Math.min(0.09, this.kz + 0.028 * big); this.krx = Math.min(0.2, this.krx + 0.035 * big);
    this.slide = 1; this.flashT = 0.05; if (wid === 'shotgun') this.pump = 0.001;
    this.flash.rotation.z = Math.random() * 6; const s = 0.7 + Math.random() * 0.8; this.flash.scale.set(s * (wid === 'shotgun' ? 1.6 : 1), s, 1);
  }
  swing(heavy) { this.swingT = 0; this.swingHeavy = heavy; }
  throwNade() { this.throwT = 0; }

  /** st: {wid, ads, speed, grounded, cr, sprint, dyaw, dpitch, rlp, mdp, dead, scoped} */
  update(dt, st) {
    this.t += dt;
    this.maybeUpgradeHands();
    const R = this.root;
    if (!st.wid || st.dead) { R.visible = false; return; }
    // Troca de arma: guarda a antiga, saca a nova
    if (st.wid !== this.target) {
      this.target = st.wid;
      if (!this.cur) { this.setWeapon(st.wid); this.phase = 'draw'; this.pt = 0; }
      else { this.phase = 'holster'; this.pt = 0; this.sfx('draw'); }
    }
    if (this.phase === 'holster') { this.pt += dt / 0.13; if (this.pt >= 1) { this.setWeapon(this.target); this.phase = 'draw'; this.pt = 0; } }
    else if (this.phase === 'draw') { this.pt += dt / 0.36; if (this.pt >= 1) this.phase = 'idle'; }
    const hid = st.scoped && this.ads > 0.92;
    R.visible = !hid;
    const m = this.cur; if (!m) return;
    const kind = m.kind;
    const hip = HIP[kind];
    this.ads += (((st.ads && this.phase === 'idle') ? 1 : 0) - this.ads) * Math.min(1, dt * (m.scope ? 9 : 12));
    const a = this.ads;
    // Balanço
    const sp = st.speed, moveAmt = st.grounded ? clamp(sp / 6.2, 0, 1) : 0;
    this.bobT += dt * (3 + sp * 1.5) * (st.grounded ? 1 : 0.2);
    const ba = moveAmt * (1 - a * 0.85);
    const bx = Math.sin(this.bobT) * 0.012 * ba, by = -Math.abs(Math.cos(this.bobT)) * 0.014 * ba;
    const breath = Math.sin(this.t * 1.5) * (0.0016 + (a ? 0.0006 : 0));
    // Sway
    this.sw.y += (-clamp(st.dyaw * 3, -0.1, 0.1) - this.sw.y) * Math.min(1, dt * 9);
    this.sw.x += (clamp(st.dpitch * 3, -0.08, 0.08) - this.sw.x) * Math.min(1, dt * 9);
    this.sprintT = (this.sprintT || 0) + (((st.sprint && !st.ads) ? 1 : 0) - (this.sprintT || 0)) * Math.min(1, dt * 8);
    const sprint = this.sprintT;
    // Recuo
    this.kz *= Math.exp(-dt * 13); this.krx *= Math.exp(-dt * 11); this.slide = Math.max(0, this.slide - dt * 12);
    // Pose base (quadril → mira)
    let px = hip[0] * (1 - a), py = hip[1] * (1 - a) + -m.sightY * a, pz = hip[2] * (1 - a) + -0.3 * a;
    if (kind !== 'gun') { px = hip[0]; py = hip[1]; pz = hip[2]; }
    let rx = 0, ry = -0.02 * (1 - a), rz = 0;
    px += bx + this.sw.y * 0.5; py += by + breath + this.sw.x * 0.4 - 0.014 * st.cr; pz += this.kz;
    rx += this.krx + this.sw.x * 0.6 + breath * 2; ry += this.sw.y; rz += this.sw.y * 0.5 + Math.sin(this.bobT) * 0.01 * ba;
    px += 0.05 * sprint; py -= 0.1 * sprint; pz += 0.05 * sprint; rx -= 0.4 * sprint; ry += 0.65 * sprint; rz += 0.2 * sprint;
    // Sacar / guardar
    if (this.phase === 'holster') { const e = ease(this.pt); py -= 0.35 * e; rx -= 0.7 * e; }
    else if (this.phase === 'draw') { const e = 1 - ease(this.pt); py -= 0.38 * e; rx -= 0.9 * e; rz += 0.3 * e; }
    // Recarga em etapas
    this.lh = m.lh.clone();
    const rl = st.rlp;
    let showMag = true, magOff = 0, handFollowMag = 0;
    if (rl >= 0 && kind === 'gun') {
      const p = rl, hasMag = this.magOK();
      const tilt = Math.min(seg(p, 0.02, 0.14), 1 - seg(p, 0.86, 0.98));
      rz += 0.5 * tilt; rx -= 0.18 * tilt; py -= 0.03 * tilt; px -= 0.04 * tilt;
      const flag = (k, th, snd) => { if (p >= th && !this.rlFlags[k]) { this.rlFlags[k] = 1; this.sfx(snd); } };
      if (hasMag) {
        const toMag = seg(p, 0, 0.14), out = seg(p, 0.14, 0.3), fetch = seg(p, 0.3, 0.44), ins = seg(p, 0.46, 0.62), toBolt = seg(p, 0.7, 0.78), back = seg(p, 0.86, 0.98);
        flag('o', 0.15, 'magout'); flag('i', 0.62, 'magin');
        let hand = m.lh.clone().lerp(m.magPos, toMag);
        if (p > 0.14 && p < 0.3) { magOff = -0.22 * out; hand = m.magPos.clone().add(new THREE.Vector3(0, -0.22 * out, 0.02 * out)); }
        if (p >= 0.3 && p < 0.46) { showMag = false; hand = m.magPos.clone().add(new THREE.Vector3(-0.05 * fetch, -0.26 * fetch, 0.12 * fetch)); if (p > 0.38) this.lhOffscreen = true; }
        if (p >= 0.46 && p < 0.64) { magOff = -0.22 * (1 - ins); hand = m.magPos.clone().add(new THREE.Vector3(0, magOff, 0)); }
        if (p >= 0.64) { const bp = m.parts.bolt ? m.parts.bolt.position.clone() : m.magPos; hand = m.magPos.clone().lerp(bp.add(new THREE.Vector3(0.02, 0.02, 0)), toBolt); hand.lerp(m.lh, back); }
        if (p >= 0.3 && p < 0.46) magOff = -0.3;
        this.lh = hand;
        if (m.parts.bolt && p > 0.72 && p < 0.9) { const k = (p - 0.72) / 0.18; m.parts.bolt.position.z = m.parts.bolt.userData.z0 + Math.sin(k * Math.PI) * 0.06; flag('b', 0.78, 'bolt'); }
        else if (m.parts.bolt) m.parts.bolt.position.z = m.parts.bolt.userData.z0;
        if (m.parts.slide && p > 0.72 && p < 0.88 && !m.parts.bolt) { m.parts.slide.position.z = Math.sin(((p - 0.72) / 0.16) * Math.PI) * 0.04; flag('b', 0.78, 'bolt'); }
      } else {
        // Sem carregador removível: insere cartuchos pelo lado e bombeia
        const ph = (p * 6) % 1;
        this.lh = m.magPos.clone().add(new THREE.Vector3(-0.02, -0.1 * (1 - Math.sin(ph * Math.PI)), 0.05));
        if (p > 0.15 && ph < 0.06) { const k = Math.floor(p * 6); if (!this.rlFlags['s' + k]) { this.rlFlags['s' + k] = 1; this.sfx('magin'); } }
        if (p > 0.85) { this.lh = m.lh.clone();  flag('b', 0.9, 'bolt'); }
      }
      if (m.parts.bolt && !hasMag && m.parts.bolt) m.parts.bolt.position.z = m.parts.bolt.userData.z0;
    } else {
      this.rlFlags = {}; this.lhOffscreen = false;
      if (m.parts.bolt) m.parts.bolt.position.z = m.parts.bolt.userData.z0 + this.slide * 0.04;
      if (m.parts.slide) m.parts.slide.position.z = this.slide * 0.035;
    }
    if (m.parts.mag && this.magOK()) { m.parts.mag.visible = showMag; m.parts.mag.position.y = 0.03 + magOff; }
    if (m.parts.pump) {
      const pb = m.parts.pump.userData.base;
      if (!(rl >= 0)) {
        if (this.pump > 0) { this.pump += dt; const k = this.pump / 0.5; m.parts.pump.position.z = pb + (k > 0.25 ? Math.sin(clamp((k - 0.25) / 0.75, 0, 1) * Math.PI) * 0.12 : 0); if (k >= 1) this.pump = 0; }
        else m.parts.pump.position.z = pb;
      }
    }
    // Faca
    if (this.swingT >= 0) {
      this.swingT += dt; const T = this.swingHeavy ? 0.55 : 0.32, k = clamp(this.swingT / T, 0, 1), s = Math.sin(k * Math.PI);
      if (this.swingHeavy) { pz -= 0.2 * s; py += 0.06 * s; rx += (k < 0.4 ? 0.9 * (k / 0.4) : 0.9 - 1.9 * ((k - 0.4) / 0.6)); }
      else { px -= 0.22 * s; rz += (0.9 - 1.8 * k); ry += 0.5 * s; }
      if (k >= 1) this.swingT = -1;
    }
    // Arremesso
    if (this.throwT >= 0) {
      this.throwT += dt; const k = clamp(this.throwT / 0.4, 0, 1);
      if (k < 0.45) { pz += 0.12 * ease(k / 0.45); py -= 0.05 * ease(k / 0.45); rx -= 0.6 * ease(k / 0.45); } else { const e = ease((k - 0.45) / 0.55); pz += 0.12 - 0.32 * e; rx += -0.6 + 1.3 * e; py += 0.05 * e; }
      this.hideNade = k > 0.5; if (this.throwT > 0.9) { this.throwT = -1; this.hideNade = false; }
    }
    // Kit médico
    if (kind === 'med' && st.mdp >= 0) {
      const w = Math.sin(st.mdp * 30) * 0.03;
      px = lerp(px, 0.0, 0.7); py = -0.2 + w * 0.3; pz = -0.3; rx += -0.2 + w; rz += Math.sin(st.mdp * 12) * 0.04;
      this.lh.set(-0.1 + w, 0.0, -0.06);
    }
    m.g.visible = !(this.hideNade && kind === 'nade');
    this.gun.position.set(px, py, pz); this.gun.rotation.set(rx, ry, rz);
    this.gun.updateMatrix();
    // Braços acompanham a arma
    this.rhT.copy(m.rh).applyMatrix4(this.gun.matrix);
    this.lhT.copy(this.lh).applyMatrix4(this.gun.matrix);
    if (kind === 'knife') { this.rhT.set(0, -0.02, 0.04).applyMatrix4(this.gun.matrix); }
    this.limb(this.armR, new THREE.Vector3(0.28, -0.5, 0.25), this.rhT, true);
    const showL = kind !== 'knife' && kind !== 'nade' || this.throwT >= 0 && false;
    this.armL.g.visible = showL && !(this.lhOffscreen && rl >= 0.3 && rl < 0.44);
    if (showL) this.limb(this.armL, new THREE.Vector3(-0.3, -0.52, 0.25), this.lhT, false);
    // Clarão
    this.flashT = Math.max(0, this.flashT - dt);
    const mp = m.muzzle ? m.muzzle.position.clone().applyMatrix4(this.gun.matrix) : null;
    this.flash.visible = this.flashT > 0 && !!mp && kind === 'gun'; this.flashLight.intensity = this.flashT > 0 ? 2.5 : 0;
    if (mp) { this.flash.position.copy(mp).add(new THREE.Vector3(0, 0, -0.04)); this.flashLight.position.copy(mp); }
    if (st.wid === 'sniper') this.flash.visible = false;
  }

  limb(arm, from, to, right) {
    const d = to.clone().sub(from), L = d.length();
    if (L < 1e-4) return;
    d.normalize();
    arm.up.position.copy(from).addScaledVector(d, L / 2 - 0.03); arm.up.scale.set(1, L - 0.06, 1);
    arm.up.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    arm.wrist.position.copy(to).addScaledVector(d, -0.03); arm.wrist.quaternion.copy(arm.up.quaternion);
    arm.hand.position.copy(to).addScaledVector(d, arm.real ? 0.02 + HAND_POS_FIX : 0.02);
    arm.hand.quaternion.copy(arm.up.quaternion);
    if (arm.real) arm.hand.quaternion.multiply(HAND_ROT_FIX);
    arm.up.matrixAutoUpdate = true;
  }
}
const lerp = (a, b, t) => a + (b - a) * t;
