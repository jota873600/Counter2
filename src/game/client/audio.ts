// @ts-nocheck
/** Áudio 100% procedural (Web Audio API): tiros, recarga, passos, hit, explosões, loja, UI. Sem arquivos externos. */
const SHOTS = {
  p9: [0.09, 3600, 900, 0.7, 190, 60, 0.1], t50: [0.18, 2400, 500, 0.9, 140, 45, 0.18], r18: [0.07, 4200, 1200, 0.55, 170, 70, 0.08],
  smg: [0.07, 4400, 1300, 0.6, 150, 55, 0.08], ar: [0.14, 2900, 600, 0.85, 110, 40, 0.16], lmg: [0.15, 2500, 500, 0.9, 95, 38, 0.17],
  shotgun: [0.3, 2300, 300, 1.0, 90, 30, 0.3], sniper: [0.5, 1900, 200, 1.1, 70, 25, 0.5],
};

export class GameAudio {
  constructor() { this.ctx = null; this.vol = 0.6; this.ringNode = null; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const c = (this.ctx = new C());
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate * 2, nb = c.createBuffer(1, len, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nb = nb;
    // Reverb sintética (impulso de ruído com decaimento exponencial)
    const rl = c.sampleRate * 1.4, ib = c.createBuffer(2, rl, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const dd = ib.getChannelData(ch); for (let i = 0; i < rl; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2); }
    this.rev = c.createConvolver(); this.rev.buffer = ib;
    this.revGain = c.createGain(); this.revGain.gain.value = 0.35; this.rev.connect(this.revGain); this.revGain.connect(this.master);
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setListener(x, y, z, yaw) {
    if (!this.ctx) return;
    const l = this.ctx.listener, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    if (l.positionX) {
      l.positionX.value = x; l.positionY.value = y; l.positionZ.value = z;
      l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fz; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else { l.setPosition(x, y, z); l.setOrientation(fx, 0, fz, 0, 1, 0); }
  }
  out(pos, vol = 1) {
    const c = this.ctx, g = c.createGain(); g.gain.value = vol;
    if (pos) {
      const p = c.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.15; p.maxDistance = 200;
      p.positionX ? (p.positionX.value = pos[0], p.positionY.value = pos[1], p.positionZ.value = pos[2]) : p.setPosition(pos[0], pos[1], pos[2]);
      g.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    return g;
  }
  noise(dest, t, dur, o) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.nb; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 || o.f0), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.5, t + (o.atk || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return g;
  }
  tone(dest, t, f0, f1, dur, o = {}) {
    const c = this.ctx, os = c.createOscillator(); os.type = o.type || 'sine';
    os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + (o.atk || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(dest); os.start(t); os.stop(t + dur + 0.05);
  }
  wet(dest, amt) { const g = this.ctx.createGain(); g.gain.value = amt; dest.connect(g); g.connect(this.rev); }

  /** Toca um som pelo nome. pos = [x,y,z] para som 3D. */
  play(name, pos = null, vol = 1) {
    if (!this.ctx || this.vol <= 0) return;
    const c = this.ctx, t = c.currentTime + 0.005, o = this.out(pos, vol), N = (d, p) => this.noise(o, t, d, p), T = (a, b, d, p) => this.tone(o, t, a, b, d, p);
    if (name.startsWith('shot:')) {
      const s = SHOTS[name.slice(5)] || SHOTS.p9;
      N(s[0], { f0: s[1], f1: s[2], gain: s[3] * 0.8, type: 'lowpass' }); N(s[0] * 0.5, { f0: 6000, f1: 2000, gain: s[3] * 0.35, type: 'highpass' });
      T(s[4], s[5], s[6], { gain: s[3] * 0.7 }); this.wet(o, name === 'shot:sniper' ? 0.7 : 0.35); return;
    }
    switch (name) {
      case 'knife': N(0.14, { f0: 700, f1: 3200, gain: 0.25, type: 'bandpass', q: 1.2, atk: 0.04 }); break;
      case 'knifehit': N(0.08, { f0: 3000, f1: 900, gain: 0.5, type: 'highpass' }); T(1400, 700, 0.07, { gain: 0.2, type: 'triangle' }); break;
      case 'step': N(0.08, { f0: 380 + Math.random() * 120, f1: 120, gain: 0.35 }); break;
      case 'land': N(0.14, { f0: 300, f1: 80, gain: 0.5 }); break;
      case 'jump': N(0.08, { f0: 500, f1: 150, gain: 0.2 }); break;
      case 'magout': N(0.04, { f0: 2200, f1: 800, gain: 0.35, type: 'bandpass', q: 3 }); T(320, 180, 0.05, { gain: 0.15, type: 'square' }); break;
      case 'magin': N(0.05, { f0: 1500, f1: 500, gain: 0.5, type: 'bandpass', q: 2 }); T(220, 110, 0.07, { gain: 0.25, type: 'square' }); break;
      case 'bolt': N(0.04, { f0: 2600, f1: 1200, gain: 0.4, type: 'bandpass', q: 4 }); T(500, 260, 0.05, { gain: 0.15, type: 'square' }); break;
      case 'empty': N(0.03, { f0: 3000, f1: 1500, gain: 0.3, type: 'bandpass', q: 4 }); break;
      case 'draw': N(0.1, { f0: 900, f1: 2200, gain: 0.15, type: 'bandpass', q: 1, atk: 0.03 }); break;
      case 'hit': T(1000, 760, 0.06, { gain: 0.35 }); N(0.03, { f0: 4000, gain: 0.25, type: 'highpass' }); break;
      case 'headshot': T(2200, 1500, 0.14, { gain: 0.4, type: 'triangle' }); T(3200, 2400, 0.1, { gain: 0.2 }); N(0.05, { f0: 5000, gain: 0.35, type: 'highpass' }); break;
      case 'armorhit': T(600, 420, 0.06, { gain: 0.3, type: 'square' }); N(0.05, { f0: 2500, f1: 1000, gain: 0.3, type: 'bandpass' }); break;
      case 'kill': T(700, 1000, 0.1, { gain: 0.35, type: 'triangle' }); setTimeout(() => this.playTone(1000, 1500, 0.16, 0.35), 90); break;
      case 'hurt': N(0.18, { f0: 350, f1: 90, gain: 0.7 }); T(130, 60, 0.18, { gain: 0.5 }); break;
      case 'death': T(220, 50, 0.7, { gain: 0.4, type: 'sawtooth' }); N(0.4, { f0: 800, f1: 100, gain: 0.4 }); break;
      case 'boom': N(1.6, { f0: 1600, f1: 70, gain: 1.3, atk: 0.01 }); T(70, 22, 1.0, { gain: 1.1 }); N(0.3, { f0: 6000, f1: 1000, gain: 0.5, type: 'highpass' }); this.wet(o, 0.9); break;
      case 'flashboom': N(0.25, { f0: 7000, f1: 2000, gain: 0.8, type: 'highpass' }); T(900, 300, 0.2, { gain: 0.3, type: 'square' }); break;
      case 'smoke': N(0.9, { f0: 2400, f1: 900, gain: 0.35, type: 'bandpass', q: 0.6, atk: 0.05 }); T(180, 70, 0.15, { gain: 0.4 }); break;
      case 'bounce': T(1900, 1100, 0.05, { gain: 0.2, type: 'triangle' }); N(0.04, { f0: 3000, gain: 0.3, type: 'highpass' }); break;
      case 'throw': N(0.2, { f0: 400, f1: 1800, gain: 0.25, type: 'bandpass', q: 0.8, atk: 0.06 }); break;
      case 'buy': T(1200, 1300, 0.08, { gain: 0.3, type: 'triangle' }); setTimeout(() => this.playTone(1700, 1750, 0.18, 0.3), 70); break;
      case 'deny': T(160, 120, 0.22, { gain: 0.35, type: 'square' }); break;
      case 'heal': T(400, 900, 0.45, { gain: 0.2, type: 'sine', atk: 0.1 }); break;
      case 'pickup': N(0.06, { f0: 2000, f1: 900, gain: 0.4, type: 'bandpass', q: 2 }); T(500, 800, 0.08, { gain: 0.2 }); break;
      case 'ui': T(900, 1100, 0.05, { gain: 0.15, type: 'triangle' }); break;
      case 'beep': T(880, 880, 0.12, { gain: 0.25, type: 'square' }); break;
      case 'roundwin': T(660, 660, 0.15, { gain: 0.3, type: 'triangle' }); setTimeout(() => this.playTone(880, 880, 0.15, 0.3), 150); setTimeout(() => this.playTone(1320, 1320, 0.3, 0.3), 300); break;
      case 'roundlose': T(440, 440, 0.2, { gain: 0.3, type: 'triangle' }); setTimeout(() => this.playTone(330, 300, 0.4, 0.3), 200); break;
    }
  }
  playTone(a, b, d, g) { if (!this.ctx) return; this.tone(this.out(null), this.ctx.currentTime, a, b, d, { gain: g, type: 'triangle' }); }
  /** Zumbido de ensurdecimento (flashbang). */
  ring(sec) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, g = c.createGain(), o = c.createOscillator();
    o.frequency.value = 4300; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + sec + 0.1);
  }
}
