// @ts-nocheck
import { Sim } from '../src/game/shared/sim';
import { getNav } from '../src/game/shared/bots';
for (const mode of [1,4]) {
  const sim = new Sim({ mode, diff: 2 });
  const nav = getNav(sim.map);
  console.log('mode', mode, 'nodes', nav.nodes.length, 'reachable', nav.ok.length);
  for (let t = 0; t < 2; t++) for (let i = 0; i < mode; i++) sim.addPlayer({ id: 'b' + t + i, name: 'Bot' + t + i, team: t, bot: true });
  sim.start();
  let kills = 0, rounds = 0, last = 1; const dt = 1 / 30;
  const t0 = Date.now();
  for (let i = 0; i < 30 * 60 * 8 && !sim.over; i++) {
    sim.tick(dt);
    for (const e of sim.ev) { if (e.t === 'kill') kills++; if (e.t === 'rend') rounds++; }
    sim.drainEvents();
  }
  console.log('kills', kills, 'rounds', rounds, 'score', sim.score, 'over', sim.over, 'simtime', sim.time.toFixed(0), 'cpu ms', Date.now() - t0);
  console.log(sim.list().map(p => `${p.name} k${p.kills} d${p.deaths} $${p.money} ${p.inv.primary}`).join(' | '));
}
