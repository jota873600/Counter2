// @ts-nocheck
/**
 * Rede: cliente WebSocket (reconexão automática, medição de ping) e transporte local
 * (simulação offline rodando no navegador com o mesmo código do servidor).
 */
import { Sim } from '../shared/sim';

export class NetClient {
  constructor(onMsg, onStatus) {
    this.onMsg = onMsg; this.onStatus = onStatus; this.ws = null; this.status = 'closed'; this.ping = 0; this.retry = 0; this.hello = null; this.closedByUser = false;
    this.pingTimer = setInterval(() => this.pingNow(), 2000);
  }
  connect(hello) {
    if (hello) this.hello = hello;
    this.closedByUser = false;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.setStatus('connecting');
    let ws;
    try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/game-ws`); }
    catch { this.setStatus('closed'); return this.scheduleRetry(); }
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; this.setStatus('open'); this.send({ t: 'hello', ...this.hello }); this.pingNow(); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'pong') { this.ping = Math.round(performance.now() - m.ts); this.send({ t: 'act', a: 'ping', ping: this.ping }); return; }
      this.onMsg(m);
    };
    ws.onclose = () => { this.setStatus('closed'); if (!this.closedByUser) this.scheduleRetry(); };
    ws.onerror = () => { /* onclose cuida */ };
  }
  scheduleRetry() { clearTimeout(this.rt); this.retry++; this.rt = setTimeout(() => this.connect(), Math.min(8000, 800 * this.retry)); }
  setStatus(s) { this.status = s; this.onStatus && this.onStatus(s); }
  pingNow() { if (this.status === 'open') this.send({ t: 'ping', ts: performance.now() }); }
  send(o) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } return false; }
  disconnect() { this.closedByUser = true; clearTimeout(this.rt); if (this.ws) this.ws.close(); }
  // API de partida
  sendCmds(c) { this.send({ t: 'cmds', c }); }
  act(o) { this.send({ t: 'act', ...o }); }
  chat(text, team) { this.send({ t: 'chat', text, team: team ? 1 : 0 }); }
  update() {}
}

/** Transporte offline: executa o Sim localmente a 30 Hz e entrega snapshots sem latência. */
export class LocalTransport {
  constructor(cfg, myName, onMsg, mySkin = 0) {
    this.id = 'LOCAL'; this.onMsg = onMsg; this.acc = 0; this.ping = 0;
    this.sim = new Sim({ mode: cfg.mode, diff: cfg.diff, theme: cfg.theme, limit: cfg.limit || 0 });
    const names = ['Alfa', 'Bravo', 'Cobra', 'Delta', 'Eco', 'Fênix', 'Gamma', 'Hélix'];
    let b = 0;
    for (let t = 0; t < 2; t++) for (let i = 0; i < cfg.mode; i++) {
      if (t === 0 && i === 0) this.sim.addPlayer({ id: 'LOCAL', name: myName, team: 0, bot: false, skin: mySkin });
      else this.sim.addPlayer({ id: `bot${t}${i}`, name: `Bot ${names[b++ % 8]}`, team: t, bot: true });
    }
    this.sim.start();
    this.limit = this.sim.limit;
  }
  update(dt) {
    this.acc = Math.min(0.25, this.acc + dt);
    while (this.acc >= 1 / 30) {
      this.acc -= 1 / 30;
      this.sim.tick(1 / 30);
      this.onMsg({ t: 'snap', ...this.sim.snapshot(this.id), ts: Date.now() });
      this.sim.drainEvents();
    }
  }
  sendCmds(c) { this.sim.queueCmds(this.id, c); }
  act(o) { this.sim.action(this.id, o); }
  chat(text) { this.onMsg({ t: 'chat', from: 'Você', team: 0, text }); }
  disconnect() {}
}
