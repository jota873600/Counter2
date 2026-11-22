// @ts-nocheck
import { Sim } from '../src/game/shared/sim';
const sim = new Sim({ mode: 1, diff: 1 });
const H = sim.addPlayer({ id: 'H', name: 'H', team: 0, bot: false }), E = sim.addPlayer({ id: 'E', name: 'E', team: 1, bot: false });
sim.start();
const evs = [];
const step = (n, cmdFn) => { for (let i = 0; i < n; i++) { if (cmdFn) sim.queueCmds('H', [cmdFn(i), cmdFn(i)]); sim.tick(1 / 30); evs.push(...sim.ev); sim.drainEvents(); } };
const base = (o) => ({ seq: 1, dt: 1 / 60, f: 0, s: 0, j: 0, c: 0, w: 0, yaw: Math.PI, pitch: 0, fire: 0, aim: 0, rl: 0, ...o });
// loja
H.money = 800; sim.action('H', { a: 'buy', item: 'ar' }); step(1);
console.log('buy ar sem dinheiro ->', evs.filter(e => e.t === 'buy').map(e => e.ok + ':' + (e.msg || e.item)));
H.money = 5000; evs.length = 0; sim.action('H', { a: 'buy', item: 'ar' }); sim.action('H', { a: 'buy', item: 'vesthelm' }); sim.action('H', { a: 'buy', item: 'frag' }); sim.action('H', { a: 'buy', item: 'medkit' }); step(1);
console.log('compras ->', evs.filter(e => e.t === 'buy').map(e => e.ok + ':' + (e.msg || e.item)), 'money', H.money, 'cur', H.cur, H.inv);
// fase live, posiciona alvo 12m à frente
sim.phase = 'live'; sim.phaseEnd = sim.time + 100;
H.x = 0; H.z = 0; E.x = 0; E.z = -12; H.yaw = Math.PI; // H olha para +z; alvo em -z => olhar yaw=0
const yaw = 0;
step(20, (i) => base({ yaw }));
evs.length = 0;
step(40, (i) => base({ yaw, fire: 1, pitch: 0.0 }));
const hits = evs.filter(e => e.t === 'hit');
console.log('tiros', evs.filter(e => e.t === 'shot').length, 'hits', hits.length, 'dano', hits.map(h => h.hp + (h.h ? 'H' : '')).join(','), 'E.hp', E.hp, 'alive', E.alive, 'H.ammo', H.ammo.ar);
console.log('kill?', evs.filter(e => e.t === 'kill').length, 'H money', H.money, 'drops', sim.drops.length, 'round phase', sim.phase);
// recarga
sim.phase = 'live'; step(2); H.ammo.ar.mag = 3; step(1, () => base({ yaw, rl: 1 })); step(90, () => base({ yaw })); console.log('reload ->', H.ammo.ar);
// pickup
E.alive = true; E.hp = 100;
// granada: lança em direção a E
E.x = 0; E.z = -8; E.hp = 100; E.armor = 0; sim.phase = 'live'; sim.phaseEnd = sim.time + 100;
step(1, () => base({ yaw })); sim.action('H', { a: 'sel', w: 'frag' }); step(20, () => base({ yaw })); evs.length = 0;
step(1, () => base({ yaw, fire: 1, pitch: 0.12 })); step(1, () => base({ yaw })); 
step(90, () => base({ yaw }));
console.log('granada ->', evs.filter(e => ['throw', 'boom', 'bounce'].includes(e.t)).map(e => e.t + (e.p ? '@' + e.p.join('/') : '')), 'E.hp', E.hp);
// medkit
H.hp = 50; sim.action('H', { a: 'med' }); step(150, () => base({ yaw })); console.log('medkit hp ->', Math.round(H.hp), 'medkits', H.inv.medkit);
// dano cancela medkit
H.hp = 50; H.inv.medkit = 1; sim.action('H', { a: 'med' }); step(20, () => base({ yaw })); sim.applyHit(H, E, 10, 'chest', 0.5, 'ar', [0, 1, 0]); console.log('med cancel ->', H.med, 'hp', Math.round(H.hp));
// compra fora da fase
sim.phase = 'live'; evs.length = 0; sim.action('H', { a: 'buy', item: 'smg' }); step(1); console.log('compra fora ->', evs.filter(e => e.t === 'buy').map(e => e.msg));
// colisao / movimento: andar contra parede
H.x = -38; H.z = 0; H.y = 1; sim.phase = 'live';
step(60, () => base({ yaw: Math.PI / 2, f: 1 }));
console.log('parede x=', H.x.toFixed(2), 'y', H.y.toFixed(2));
