// @ts-nocheck
/**
 * Simulação autoritativa da partida (rounds, economia, armas, dano por hitbox, granadas, bots).
 * Roda no servidor (multiplayer) e no navegador (offline contra bots) com o MESMO código.
 */
import { W, ITEMS, PL, ECON, PARTS, GREN_MAX, recoilKick, dmgFalloff, viewAngles } from './weapons';
import { getMap } from './map';
import { movePlayer, rayBoxes, rayN, bodyHit, groundAt, eyeH, bodyH, dirFromAngles } from './physics';
import { botThink, botBuy } from './bots';

const R = Math.PI / 180;
const n2 = (v) => Math.round(v * 100) / 100;
const rnd = Math.random;
const AUTO_SIZE = { 1: 24, 2: 32, 3: 32, 4: 40 };

class Player {
  constructor(o) {
    this.id = o.id; this.name = o.name; this.team = o.team; this.bot = !!o.bot;
    this.ping = 0; this.kills = 0; this.deaths = 0; this.assists = 0; this.dmg = 0; this.money = ECON.START;
    this.q = []; this.budget = 0.1; this.ack = 0; this.clock = 0; this.sh = 0;
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.yaw = 0; this.pitch = 0; this.cr = 0; this.g = true; this.speed = 0;
    this.alive = false; this.hp = 100; this.hist = []; this.dv = [0, 0]; this.walk = false;
    this.resetLoadout();
  }
  resetLoadout() {
    this.armor = 0; this.helm = false; this.lost = false;
    this.inv = { primary: null, secondary: 'p9', knife: true, frag: 0, smoke: 0, flash: 0, medkit: 0 };
    this.ammo = { p9: { mag: W.p9.mag, res: W.p9.res } };
    this.cur = 'secondary'; this.prev = 'knife';
  }
  curId() {
    const c = this.cur;
    if (c === 'primary') return this.inv.primary || 'knife';
    if (c === 'secondary') return this.inv.secondary || 'knife';
    return c;
  }
}

export class Sim {
  constructor(o = {}) {
    this.mode = o.mode || 1; this.diff = o.diff ?? 1; this.theme = o.theme || 'day';
    this.limit = o.limit || AUTO_SIZE[this.mode] || 40;
    this.map = getMap(this.limit);
    this.players = new Map(); this.time = 0; this.ev = []; this.phase = 'lobby';
    this.round = 0; this.score = [0, 0]; this.sideOf = [0, 1]; this.loss = [0, 0];
    this.grenades = []; this.smokes = []; this.drops = []; this.nid = 1; this.over = false; this.winner = -1; this.phaseEnd = 0;
    this.tickN = 0; this.worldCache = null;
  }

  addPlayer(o) { const p = new Player(o); this.players.set(o.id, p); return p; }
  list() { return [...this.players.values()]; }
  start() { this.round = 0; this.phase = 'lobby'; this.startRound(); }

  /* ---------------- Rounds ---------------- */
  startRound() {
    const played = this.round;
    this.round++;
    const half = played === ECON.HALF;
    if (half) { this.sideOf = [this.sideOf[1], this.sideOf[0]]; this.loss = [0, 0]; }
    const fresh = this.round === 1 || half;
    const idx = [0, 0];
    for (const p of this.players.values()) {
      if (fresh) { p.money = ECON.START; p.resetLoadout(); }
      else if (!p.alive || p.lost) p.resetLoadout();
      // Reabastece reserva das armas mantidas
      for (const id of Object.keys(p.ammo)) { const w = W[id]; if (p.ammo[id]) p.ammo[id].res = Math.max(p.ammo[id].res, w.res); }
      const side = this.sideOf[p.team], sp = this.map.spawns[side];
      const s = sp[idx[p.team]++ % sp.length];
      Object.assign(p, { x: s.x, z: s.z, y: 0, vx: 0, vy: 0, vz: 0, yaw: s.yaw, pitch: 0, cr: 0, g: true, alive: true, hp: 100, hist: [],
        blind: 0, rlEnd: 0, med: false, medT: 0, punch: [0, 0], bloom: 0, shotIdx: 0, lastShot: -9, nextFire: 0, drawEnd: p.clock + 0.6,
        fireHeld: false, aimHeld: false, aim: false, roundDmg: {}, bought: false, botBuyAt: this.time + 0.5 + rnd() * 3, lost: false, q: [], budget: 0.1, ai: null });
      if (!p.inv[p.cur === 'primary' || p.cur === 'secondary' ? p.cur : 'knife'] && !['frag', 'smoke', 'flash', 'medkit'].includes(p.cur)) p.cur = 'knife';
      p.cur = p.inv.primary ? 'primary' : 'secondary';
    }
    this.drops = []; this.grenades = []; this.smokes = [];
    this.phase = 'buy'; this.phaseEnd = this.time + ECON.BUY;
    this.ev.push({ t: 'rstart', rd: this.round, half, sc: this.score });
  }

  endRound(winner) {
    if (this.phase !== 'live') return;
    this.score[winner]++;
    const lossAmt = ECON.LOSS + ECON.STEP * Math.min(this.loss[1 - winner], ECON.STREAKMAX);
    for (const p of this.players.values()) this.addMoney(p, p.team === winner ? ECON.WIN : lossAmt);
    this.loss[winner] = 0; this.loss[1 - winner]++;
    if (this.score[winner] >= ECON.WINROUNDS) { this.over = true; this.winner = winner; this.phase = 'matchEnd'; this.phaseEnd = this.time + 12; }
    else { this.phase = 'roundEnd'; this.phaseEnd = this.time + ECON.END; }
    this.ev.push({ t: 'rend', w: winner, sc: this.score, over: this.over });
  }

  addMoney(p, v) { p.money = Math.max(0, Math.min(ECON.MAX, p.money + v)); }

  checkRound() {
    if (this.phase !== 'live') return;
    const a = [0, 0];
    for (const p of this.players.values()) if (p.alive) a[p.team]++;
    if (a[0] === 0 || a[1] === 0) {
      if (a[0] === 0 && a[1] === 0) this.endRound(rnd() < 0.5 ? 0 : 1);
      else this.endRound(a[0] === 0 ? 1 : 0);
    }
  }

  timeout() {
    const a = [0, 0], hp = [0, 0];
    for (const p of this.players.values()) if (p.alive) { a[p.team]++; hp[p.team] += p.hp; }
    this.endRound(a[0] !== a[1] ? (a[0] > a[1] ? 0 : 1) : hp[0] !== hp[1] ? (hp[0] > hp[1] ? 0 : 1) : (this.sideOf[0] === 1 ? 0 : 1));
  }

  /* ---------------- Tick ---------------- */
  tick(dt) {
    this.time += dt; this.tickN++;
    if (this.phase === 'buy' && this.time >= this.phaseEnd) { this.phase = 'live'; this.phaseEnd = this.time + ECON.ROUND; this.ev.push({ t: 'live' }); }
    else if (this.phase === 'live' && this.time >= this.phaseEnd) this.timeout();
    else if (this.phase === 'roundEnd' && this.time >= this.phaseEnd) this.startRound();
    const all = [...this.players.values()];
    for (const p of all) {
      p.budget = Math.min(0.25, p.budget + dt);
      if (p.bot) {
        if (this.phase === 'buy' && !p.bought && this.time >= p.botBuyAt && p.alive) botBuy(this, p);
        if (p.alive) { const c = botThink(this, p, dt); this.applyCmd(p, c, all); }
      } else {
        while (p.q.length && p.budget >= p.q[0].dt - 1e-4) {
          const c = p.q.shift(); p.budget -= c.dt; p.ack = c.seq; this.applyCmd(p, c, all);
        }
        if (p.q.length > 20) p.q.length = 0;
      }
      p.hist.push({ t: this.time, x: p.x, y: p.y, z: p.z, yaw: p.yaw, cr: p.cr });
      if (p.hist.length > 14) p.hist.shift();
      if (p.alive && p.blind > 0) p.blind = Math.max(0, p.blind - dt);
    }
    this.updateGrenades(dt);
    this.smokes = this.smokes.filter((s) => s.end > this.time);
    this.checkRound();
  }

  queueCmds(id, cmds) {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    for (const c of cmds) {
      if (!(c.dt > 0 && c.dt < 0.1)) continue;
      p.q.push({ seq: c.seq | 0, dt: c.dt, f: clamp(c.f, -1, 1), s: clamp(c.s, -1, 1), j: !!c.j, c: !!c.c, w: !!c.w, yaw: +c.yaw || 0, pitch: +c.pitch || 0, fire: !!c.fire, aim: !!c.aim, rl: !!c.rl });
    }
  }

  applyCmd(p, c, all) {
    if (!p.alive) return;
    p.yaw = c.yaw; p.pitch = clamp(c.pitch, -1.55, 1.55); p.walk = !!c.w;
    const frozen = this.phase === 'buy' || this.phase === 'lobby' || this.phase === 'matchEnd';
    const wd = W[p.curId()];
    movePlayer(this.map, p, c, c.dt, all, { spdMul: (wd.spd || 1) * (p.med ? 0.55 : 1), frozen });
    this.weaponStep(p, c, c.dt);
  }

  /* ---------------- Armas ---------------- */
  cone(p, w) {
    const mv = Math.min(1, p.speed / PL.run) * (p.walk ? 0.4 : 1);
    let k = w.sp[0] + w.sp[1] * mv + (p.g ? 0 : w.sp[2]) + p.bloom;
    if (p.cr > 0.5) k *= 0.6;
    if (w.scope) k = p.aim ? k * 0.25 : k + 4;
    else if (p.aim) k *= 0.45;
    return k;
  }

  weaponStep(p, c, dt) {
    p.clock += dt;
    const ck = p.clock, wid = p.curId(), w = W[wid];
    if (p.rlEnd && ck >= p.rlEnd) {
      const a = p.ammo[p.rlW];
      if (a) { const need = W[p.rlW].mag - a.mag, take = Math.min(need, a.res); a.mag += take; a.res -= take; }
      p.rlEnd = 0; this.ev.push({ t: 'rlend', v: p.id });
    }
    if (p.med) {
      p.medT += dt;
      p.hp = Math.min(100, p.hp + (ECON.MEDHEAL / ECON.MEDTIME) * dt);
      if (p.medT >= ECON.MEDTIME || p.hp >= 100) { p.med = false; p.inv.medkit = Math.max(0, p.inv.medkit - 1); this.ev.push({ t: 'meddone', v: p.id }); this.sel(p, 'prev', true); }
    }
    const firing = ck - p.lastShot < 0.12;
    const k = Math.exp(-dt * (firing ? 1.2 : 6.5));
    p.punch[0] *= k; p.punch[1] *= k; p.bloom *= Math.exp(-dt * 5);
    if (ck - p.lastShot > 0.35) p.shotIdx = 0;
    const rising = c.fire && !p.fireHeld, aimRise = c.aim && !p.aimHeld;
    p.fireHeld = !!c.fire; p.aimHeld = !!c.aim; p.aim = !!c.aim;
    if (c.rl) this.startReload(p);
    if (ck < p.drawEnd || p.med) return;
    if (w.slot === 'knife') {
      if (ck >= p.nextFire) { if (c.fire) this.knife(p, false); else if (aimRise) this.knife(p, true); }
    } else if (w.slot === 'grenade') {
      if (rising && ck >= p.nextFire) this.throwNade(p, wid, p.aim);
    } else if (w.slot === 'medkit') {
      if (rising) this.startMed(p);
    } else if (p.rlEnd === 0 && (w.auto ? c.fire : rising) && ck >= p.nextFire) {
      const a = p.ammo[wid];
      if (a.mag > 0) this.shoot(p, w, a);
      else if (rising || w.auto) {
        if (a.res > 0) this.startReload(p);
        else { this.ev.push({ t: 'empty', v: p.id }); this.sel(p, p.inv.secondary && p.cur === 'primary' ? 'secondary' : 'knife', true); }
        p.nextFire = ck + 0.25;
      }
    }
  }

  startReload(p) {
    const wid = p.curId(), w = W[wid], a = p.ammo[wid];
    if (!w.mag || !a || a.mag >= w.mag || a.res <= 0 || p.rlEnd || p.med) return;
    p.rlEnd = p.clock + w.rl; p.rlW = wid; p.rlDur = w.rl;
    this.ev.push({ t: 'rl', v: p.id, w: wid, d: w.rl });
  }

  shoot(p, w, a) {
    const ck = p.clock, iv = 60 / w.rpm;
    a.mag--; p.nextFire = ck - p.nextFire < 0.04 ? p.nextFire + iv : ck + iv;
    const cone = this.cone(p, w);
    const [yaw, pitch] = viewAngles(p.yaw, p.pitch, p.punch);
    const ox = p.x, oy = p.y + eyeH(p), oz = p.z;
    const lag = p.bot ? 0 : Math.min(0.35, 0.1 + p.ping / 2000);
    const tHit = this.time - lag;
    const enemies = [];
    for (const e of this.players.values()) if (e.alive && e.team !== p.team) enemies.push([e, this.histAt(e, tHit)]);
    const ends = [];
    for (let i = 0; i < w.pel; i++) {
      const th = rnd() * Math.PI * 2, rr = cone * R * Math.sqrt(rnd());
      const d = dirFromAngles(yaw + Math.cos(th) * rr, pitch + Math.sin(th) * rr);
      let wt = rayBoxes(this.map.rayBoxes, ox, oy, oz, d[0], d[1], d[2], 300);
      const nrm = [rayN[0], rayN[1], rayN[2]];
      let best = null;
      for (const [e, body] of enemies) {
        const h = bodyHit(body, ox, oy, oz, d[0], d[1], d[2], Math.min(wt, 300));
        if (h && (!best || h.t < best.t)) { best = h; best.e = e; }
      }
      if (best) {
        const dmg = w.dmg * dmgFalloff(w, best.t) * PARTS[best.part];
        const pt = [ox + d[0] * best.t, oy + d[1] * best.t, oz + d[2] * best.t];
        this.applyHit(best.e, p, dmg, best.part, w.pen, w.id, pt);
        ends.push([n2(pt[0]), n2(pt[1]), n2(pt[2]), 0, 0, 0, 1]);
      } else if (wt !== Infinity) ends.push([n2(ox + d[0] * wt), n2(oy + d[1] * wt), n2(oz + d[2] * wt), nrm[0], nrm[1], nrm[2], 0]);
      else ends.push([n2(ox + d[0] * 150), n2(oy + d[1] * 150), n2(oz + d[2] * 150), 0, 0, 0, 2]);
    }
    const kick = recoilKick(w, p.shotIdx++);
    p.punch[0] += kick[0]; p.punch[1] = Math.min(14, p.punch[1] + kick[1]);
    p.bloom = Math.min(2, p.bloom + (w.scope ? 0 : 0.12));
    p.lastShot = ck; p.sh++;
    this.ev.push({ t: 'shot', id: p.id, w: w.id, o: [n2(ox), n2(oy), n2(oz)], e: ends });
  }

  histAt(e, t) {
    const h = e.hist;
    if (!h.length) return e;
    if (t >= h[h.length - 1].t) return h[h.length - 1];
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= t) {
        const a = h[i - 1], b = h[i], k = (t - a.t) / Math.max(1e-4, b.t - a.t);
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, yaw: b.yaw, cr: b.cr };
      }
    }
    return h[0];
  }

  knife(p, heavy) {
    const w = W.knife, ck = p.clock;
    p.nextFire = ck + (heavy ? w.rate2 : w.rate); p.sh++;
    const ox = p.x, oy = p.y + eyeH(p), oz = p.z, d = dirFromAngles(p.yaw, p.pitch);
    const wt = rayBoxes(this.map.rayBoxes, ox, oy, oz, d[0], d[1], d[2], w.range);
    let best = null;
    for (const e of this.players.values()) {
      if (!e.alive || e.team === p.team) continue;
      const h = bodyHit(e, ox, oy, oz, d[0], d[1], d[2], Math.min(wt, w.range));
      if (h && (!best || h.t < best.t)) { best = h; best.e = e; }
    }
    this.ev.push({ t: 'knife', id: p.id, h: heavy ? 1 : 0, hit: best ? 1 : 0 });
    if (best) {
      let dmg = heavy ? w.dmg2 : w.dmg;
      const fx = -Math.sin(best.e.yaw), fz = -Math.cos(best.e.yaw);
      if (fx * d[0] + fz * d[2] > 0.5) dmg *= 2;
      this.applyHit(best.e, p, dmg, best.part === 'head' ? 'chest' : best.part, 0.6, 'knife', [ox + d[0] * best.t, oy + d[1] * best.t, oz + d[2] * best.t]);
    }
  }

  /** Aplica dano: colete absorve (exceto cabeça sem capacete), capacete reduz tiro na cabeça. */
  applyHit(v, a, raw, part, pen, wid, pt, nade = false) {
    if (!v.alive) return;
    let hd = raw, ad = 0;
    if (v.armor > 0 && (part !== 'head' || v.helm)) {
      hd = raw * pen;
      ad = Math.min(v.armor, raw - hd);
      hd = raw - ad;
      v.armor -= ad;
      if (v.armor <= 0) { v.armor = 0; v.helm = false; }
    }
    hd = Math.round(hd); ad = Math.round(ad);
    v.hp -= hd;
    if (a && a !== v) { a.dmg += hd; v.roundDmg[a.id] = (v.roundDmg[a.id] || 0) + hd; }
    if (v.med) { v.med = false; this.ev.push({ t: 'medcancel', v: v.id }); this.sel(v, 'prev', true); }
    const kill = v.hp <= 0;
    if (v.ai && a) v.ai.alert = { x: a.x, z: a.z };
    this.ev.push({ t: 'hit', a: a ? a.id : '', v: v.id, hp: hd, ar: ad, h: part === 'head' ? 1 : 0, k: kill ? 1 : 0, p: [n2(pt[0]), n2(pt[1]), n2(pt[2])], f: a ? [n2(a.x), n2(a.z)] : [n2(pt[0]), n2(pt[2])], n: nade ? 1 : 0 });
    if (kill) this.kill(v, a, wid, part === 'head');
  }

  kill(v, a, wid, hs) {
    v.alive = false; v.hp = 0; v.deaths++; v.lost = true; v.med = false; v.rlEnd = 0;
    if (a && a !== v) {
      a.kills++; this.addMoney(a, (W[wid] && W[wid].kr) || 300);
      for (const [id, d] of Object.entries(v.roundDmg)) if (id !== a.id && d >= 30) { const o = this.players.get(id); if (o && o.team === a.team) o.assists++; }
      const dx = v.x - a.x, dz = v.z - a.z, l = Math.hypot(dx, dz) || 1; v.dv = [dx / l, dz / l];
    } else v.dv = [0, 0];
    if (v.inv.primary) this.dropWeapon(v, 'primary');
    this.ev.push({ t: 'kill', a: a ? a.id : '', v: v.id, an: a ? a.name : '', vn: v.name, at: a ? a.team : -1, vt: v.team, w: wid, h: hs ? 1 : 0 });
    this.checkRound();
  }

  /* ---------------- Inventário ---------------- */
  has(p, to) {
    if (to === 'primary') return !!p.inv.primary;
    if (to === 'secondary') return !!p.inv.secondary;
    if (to === 'knife') return true;
    return p.inv[to] > 0;
  }

  sel(p, w, force) {
    if (!p.alive) return;
    let to = null;
    if (w === 'grenade') {
      const order = ['frag', 'smoke', 'flash'].filter((t) => p.inv[t] > 0);
      if (!order.length) return;
      to = order[(order.indexOf(p.cur) + 1) % order.length];
    } else if (w === 'prev') {
      to = this.has(p, p.prev) && p.prev !== p.cur ? p.prev : (p.inv.primary ? 'primary' : p.inv.secondary ? 'secondary' : 'knife');
    } else if (this.has(p, w)) to = w;
    if (!to || (to === p.cur && !force)) return;
    if (to === p.cur) return;
    p.prev = p.cur; p.cur = to; p.drawEnd = p.clock + W[p.curId()].draw; p.rlEnd = 0; p.fireHeld = true;
    if (p.med) { p.med = false; this.ev.push({ t: 'medcancel', v: p.id }); }
    this.ev.push({ t: 'sel', v: p.id, w: p.curId() });
  }

  dropWeapon(p, slot) {
    const id = p.inv[slot];
    if (!id) return;
    const a = p.ammo[id] || { mag: W[id].mag, res: 0 };
    const fx = -Math.sin(p.yaw) * 0.8, fz = -Math.cos(p.yaw) * 0.8;
    const x = p.x + fx, z = p.z + fz;
    const y = Math.max(0, groundAt(this.map, x, z, p.y + 0.6));
    this.drops.push({ id: this.nid++, w: id, mag: a.mag, res: a.res, x, y, z });
    p.inv[slot] = null; delete p.ammo[id];
    if (p.cur === slot) p.cur = p.inv.primary ? 'primary' : p.inv.secondary ? 'secondary' : 'knife';
  }

  doDrop(p) {
    if (!p.alive || this.phase === 'lobby') return;
    if (p.cur === 'primary' || p.cur === 'secondary') {
      this.dropWeapon(p, p.cur); p.drawEnd = p.clock + 0.3; p.rlEnd = 0;
      this.ev.push({ t: 'sel', v: p.id, w: p.curId() });
    }
  }

  use(p) {
    if (!p.alive) return;
    let best = null, bd = 2.2;
    for (const d of this.drops) { const dd = Math.hypot(d.x - p.x, d.z - p.z); if (dd < bd && Math.abs(d.y - p.y) < 1.6) { bd = dd; best = d; } }
    if (!best) return;
    const slot = W[best.w].slot;
    if (p.inv[slot]) this.dropWeapon(p, slot);
    this.drops = this.drops.filter((d) => d !== best);
    p.inv[slot] = best.w; p.ammo[best.w] = { mag: best.mag, res: best.res };
    p.cur = slot; p.drawEnd = p.clock + W[best.w].draw; p.rlEnd = 0;
    this.ev.push({ t: 'pickup', v: p.id, w: best.w });
    this.ev.push({ t: 'sel', v: p.id, w: best.w });
  }

  startMed(p) {
    if (p.inv.medkit <= 0 || p.hp >= 100 || p.med) return;
    p.med = true; p.medT = 0; this.ev.push({ t: 'med', v: p.id });
  }

  buy(p, item, silent) {
    const fail = (msg) => { if (!silent) this.ev.push({ t: 'buy', v: p.id, ok: 0, msg }); return false; };
    if (!p.alive) return fail('Você está morto');
    if (this.phase !== 'buy') return fail('Fora da fase de compra');
    const d = ITEMS[item] || W[item];
    if (!d || item === 'knife') return fail('Item inválido');
    let price = d.price;
    const sl = d.slot;
    if (sl === 'primary' || sl === 'secondary') { if (p.inv[sl] === item) return fail('Você já possui esta arma'); }
    else if (item === 'vest') { if (p.armor >= 100) return fail('Colete já está completo'); }
    else if (item === 'vesthelm') { if (p.armor >= 100 && p.helm) return fail('Você já tem tudo'); if (p.armor >= 100) price = 350; }
    else if (sl === 'grenade') {
      if (p.inv[item] >= GREN_MAX[item]) return fail('Limite de granadas deste tipo');
      if (p.inv.frag + p.inv.smoke + p.inv.flash >= 4) return fail('Limite de 4 granadas');
    } else if (item === 'medkit') { if (p.inv.medkit >= 1) return fail('Você já possui um kit médico'); }
    if (p.money < price) return fail('Dinheiro insuficiente');
    p.money -= price;
    if (sl === 'primary' || sl === 'secondary') {
      if (p.inv[sl]) this.dropWeapon(p, sl);
      p.inv[sl] = item; p.ammo[item] = { mag: d.mag, res: d.res }; p.cur = sl; p.drawEnd = p.clock + d.draw;
    } else if (item === 'vest') p.armor = 100;
    else if (item === 'vesthelm') { p.armor = 100; p.helm = true; }
    else if (sl === 'grenade') p.inv[item]++;
    else if (item === 'medkit') p.inv.medkit++;
    if (!silent) this.ev.push({ t: 'buy', v: p.id, ok: 1, item, price });
    return true;
  }

  action(id, m) {
    const p = this.players.get(id);
    if (!p) return;
    switch (m.a) {
      case 'sel': this.sel(p, m.w); break;
      case 'buy': this.buy(p, m.item); break;
      case 'drop': this.doDrop(p); break;
      case 'use': this.use(p); break;
      case 'med': if (p.alive && p.inv.medkit > 0 && p.hp < 100) { this.sel(p, 'medkit'); this.startMed(p); } break;
      case 'ping': p.ping = clamp(+m.ping || 0, 0, 1000); break;
    }
  }

  /* ---------------- Granadas ---------------- */
  throwNade(p, type, soft) {
    if (p.inv[type] <= 0) return;
    p.inv[type]--; p.nextFire = p.clock + 0.6; p.sh++;
    const d = dirFromAngles(p.yaw, p.pitch + 0.08), sp = soft ? 8 : 15;
    const ey = p.y + eyeH(p);
    this.grenades.push({ id: this.nid++, ty: type, o: p.id, team: p.team, x: p.x + d[0] * 0.5, y: ey + d[1] * 0.5 - 0.1, z: p.z + d[2] * 0.5,
      vx: d[0] * sp + p.vx * 0.5, vy: d[1] * sp + 2.2, vz: d[2] * sp + p.vz * 0.5, t: this.time + W[type].fuse });
    this.ev.push({ t: 'throw', id: p.id, g: type });
    if (p.inv[type] <= 0) this.sel(p, 'prev', true);
  }

  updateGrenades(dt) {
    const boxes = this.map.rayBoxes, r = 0.11;
    for (const g of this.grenades.slice()) {
      for (let sub = 0; sub < 2; sub++) {
        const h = dt / 2;
        g.vy -= 20 * h; g.x += g.vx * h; g.y += g.vy * h; g.z += g.vz * h;
        for (const b of boxes) {
          if (g.x + r < b[0] || g.x - r > b[3] || g.y + r < b[1] || g.y - r > b[4] || g.z + r < b[2] || g.z - r > b[5]) continue;
          const cx = clamp(g.x, b[0], b[3]), cy = clamp(g.y, b[1], b[4]), cz = clamp(g.z, b[2], b[5]);
          let nx = g.x - cx, ny = g.y - cy, nz = g.z - cz, d = Math.hypot(nx, ny, nz);
          if (d >= r) continue;
          if (d < 1e-6) {
            const ds = [g.x - b[0], b[3] - g.x, g.y - b[1], b[4] - g.y, g.z - b[2], b[5] - g.z], m = Math.min(...ds), i = ds.indexOf(m);
            nx = ny = nz = 0; if (i === 0) nx = -1; else if (i === 1) nx = 1; else if (i === 2) ny = -1; else if (i === 3) ny = 1; else if (i === 4) nz = -1; else nz = 1;
            d = 0; g.x += nx * (m + r); g.y += ny * (m + r); g.z += nz * (m + r);
          } else { nx /= d; ny /= d; nz /= d; g.x = cx + nx * r; g.y = cy + ny * r; g.z = cz + nz * r; }
          const vn = g.vx * nx + g.vy * ny + g.vz * nz;
          if (vn < 0) {
            const e = 0.45;
            g.vx -= (1 + e) * vn * nx; g.vy -= (1 + e) * vn * ny; g.vz -= (1 + e) * vn * nz;
            const f = ny > 0.7 ? 0.82 : 0.92; // atrito tangencial
            g.vx *= f; g.vz *= f;
            if (ny > 0.7 && Math.abs(vn) < 1.6) g.vy = 0;
            if (-vn > 2.5) this.ev.push({ t: 'bounce', p: [n2(g.x), n2(g.y), n2(g.z)] });
          }
          if (ny > 0.7) { const k = Math.exp(-3 * h); g.vx *= k; g.vz *= k; }
        }
      }
      if (this.time >= g.t) { this.grenades.splice(this.grenades.indexOf(g), 1); this.explode(g); }
    }
  }

  explode(g) {
    const pos = [n2(g.x), n2(g.y), n2(g.z)];
    const owner = this.players.get(g.o);
    if (g.ty === 'smoke') {
      this.smokes.push({ x: g.x, y: g.y + 1.2, z: g.z, r: W.smoke.rad, end: this.time + W.smoke.dur });
      this.ev.push({ t: 'smoke', p: pos, d: W.smoke.dur });
      return;
    }
    if (g.ty === 'flash') {
      for (const e of this.players.values()) {
        if (!e.alive) continue;
        const ey = e.y + eyeH(e), dx = g.x - e.x, dy = g.y - ey, dz = g.z - e.z, d = Math.hypot(dx, dy, dz);
        if (d > 30 || rayBoxes(this.map.rayBoxes, e.x, ey, e.z, dx / d, dy / d, dz / d, d - 0.1) !== Infinity) continue;
        const f = dirFromAngles(e.yaw, e.pitch), dot = (f[0] * dx + f[1] * dy + f[2] * dz) / d;
        const dur = 3.8 * Math.max(0.12, (dot + 1) / 2) * Math.max(0.25, 1 - d / 30);
        e.blind = Math.max(e.blind || 0, dur);
        this.ev.push({ t: 'flashed', v: e.id, d: n2(dur), k: n2(Math.max(0, dot)) });
      }
      this.ev.push({ t: 'boom', k: 'flash', p: pos });
      return;
    }
    const Rd = W.frag.rad;
    for (const e of this.players.values()) {
      if (!e.alive) continue;
      if (owner && e.team === owner.team && e !== owner) continue;
      const h = bodyH(e);
      const pts = [[e.x, e.y + 0.3, e.z], [e.x, e.y + h * 0.6, e.z], [e.x, e.y + h * 0.95, e.z]];
      let vis = 0, dm = 1e9;
      for (const q of pts) {
        const dx = q[0] - g.x, dy = q[1] - (g.y + 0.2), dz = q[2] - g.z, d = Math.hypot(dx, dy, dz);
        dm = Math.min(dm, d);
        if (d < 0.2 || rayBoxes(this.map.rayBoxes, g.x, g.y + 0.2, g.z, dx / d, dy / d, dz / d, d - 0.1) === Infinity) vis++;
      }
      if (!vis || dm > Rd) continue;
      const dmg = W.frag.dmg * (1 - dm / Rd) * (0.55 + 0.15 * vis);
      this.applyHit(e, owner || null, Math.max(1, dmg), 'chest', 0.55, 'frag', [e.x, e.y + h * 0.6, e.z], true);
    }
    this.ev.push({ t: 'boom', k: 'frag', p: pos, r: Rd });
  }

  /* ---------------- Snapshots ---------------- */
  buildWorld() {
    if (this.worldCache && this.worldCache.tn === this.tickN) return this.worldCache.w;
    const ps = [];
    for (const p of this.players.values()) {
      ps.push({ i: p.id, n: p.name, t: p.team, x: n2(p.x), y: n2(p.y), z: n2(p.z), yw: n2(p.yaw), pt: n2(p.pitch), cr: n2(p.cr),
        hp: Math.max(0, Math.round(p.hp)), al: p.alive ? 1 : 0, cu: p.alive ? p.curId() : '', sp: n2(p.speed || 0), g: p.g ? 1 : 0, sl: p.walk ? 1 : 0,
        hm: p.helm ? 1 : 0, ar: p.armor > 0 ? 1 : 0, b: p.bot ? 1 : 0, k: p.kills, d: p.deaths, as: p.assists, dm: p.dmg, mo: p.money, pg: p.ping | 0,
        sh: p.sh, rl: p.rlEnd ? 1 : 0, md: p.med ? 1 : 0, dv: p.dv });
    }
    const w = { tm: n2(this.time), ph: this.phase, rem: n2(Math.max(0, this.phaseEnd - this.time)), rd: this.round, sc: this.score, sd: this.sideOf, win: this.winner, lim: this.limit,
      ps, gr: this.grenades.map((g) => ({ i: g.id, ty: g.ty, x: n2(g.x), y: n2(g.y), z: n2(g.z) })), sm: this.smokes.map((s) => [n2(s.x), n2(s.y), n2(s.z), n2(s.end - this.time)]),
      dr: this.drops.map((d) => ({ i: d.id, w: d.w, x: n2(d.x), y: n2(d.y), z: n2(d.z) })) };
    this.worldCache = { tn: this.tickN, w };
    return w;
  }

  snapshot(id) {
    const p = this.players.get(id), world = this.buildWorld();
    let you = null;
    if (p) {
      const wid = p.curId(), wd = W[wid], a = p.ammo[wid];
      you = { ack: p.ack, st: { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz, g: p.g ? 1 : 0, cr: p.cr }, hp: Math.round(p.hp), ar: Math.round(p.armor), hm: p.helm ? 1 : 0, mo: p.money,
        cur: p.cur, wid, inv: p.inv, am: a ? [a.mag, a.res] : [0, 0], pu: [n2(p.punch[0]), n2(p.punch[1])], spr: n2(wd.sp ? this.cone(p, wd) : 0),
        rlp: p.rlEnd ? n2(1 - (p.rlEnd - p.clock) / p.rlDur) : -1, rld: p.rlDur || 0, mdp: p.med ? n2(p.medT / ECON.MEDTIME) : -1, bl: n2(p.blind || 0), al: p.alive ? 1 : 0, spd: (wd.spd || 1) * (p.med ? 0.55 : 1) };
    }
    return { world, you, ev: this.ev };
  }
  drainEvents() { this.ev = []; this.worldCache = null; }
}

function clamp(v, a, b) { v = +v || 0; return v < a ? a : v > b ? b : v; }
