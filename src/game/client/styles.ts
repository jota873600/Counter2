// @ts-nocheck
/** CSS do jogo (injetado em runtime): HUD, menus, loja, teclas (keycaps) e controles de toque. */
export const CSS = `
#game-root{position:fixed;inset:0;background:#0b0f16;color:#e8edf3;font-family:Inter,system-ui,Segoe UI,Roboto,sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none}
#game-root *{box-sizing:border-box}
#game-root canvas#gc{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.hide{display:none!important}
.layer{position:absolute;inset:0;pointer-events:none}
.ui-block{pointer-events:auto}
/* teclas */
.key{display:inline-block;min-width:26px;padding:3px 8px;margin:0 2px;text-align:center;font:700 12px/1.2 ui-monospace,Menlo,monospace;color:#f3f6fa;background:linear-gradient(#4a5160,#2c313b);border:1px solid #6b7384;border-bottom-width:3px;border-radius:6px;box-shadow:0 2px 0 #12151b}
.keybar{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);display:flex;gap:14px;padding:5px 12px;background:rgba(8,11,16,.55);border-radius:10px;font-size:11px;color:#b9c3d0;white-space:nowrap;backdrop-filter:blur(4px)}
.keybar span.i{display:inline-flex;align-items:center;gap:3px}
.mode-touch .keybar,.mode-touch .keypanel-open{display:none!important}
/* HUD */
.hud{display:none}.in-game .hud{display:block}
.hp-box{position:absolute;left:22px;bottom:44px;display:flex;gap:14px;align-items:flex-end;text-shadow:0 2px 6px #000}
.stat{min-width:120px}.stat b{font-size:40px;font-weight:800;letter-spacing:-1px}.stat small{display:block;font-size:11px;letter-spacing:2px;color:#9fb0c3;text-transform:uppercase}
.bar{height:5px;background:rgba(255,255,255,.15);border-radius:3px;overflow:hidden;margin-top:2px}.bar i{display:block;height:100%;background:#4ade80;transition:width .15s}
.bar.ar i{background:#60a5fa}.low b{color:#f87171}.low .bar i{background:#ef4444}
.ammo-box{position:absolute;right:26px;bottom:44px;text-align:right;text-shadow:0 2px 6px #000}
.ammo-box b{font-size:46px;font-weight:800}.ammo-box span{font-size:22px;color:#aab6c4}.ammo-box small{display:block;font-size:12px;color:#9fb0c3;letter-spacing:1px}
.money{position:absolute;right:26px;bottom:128px;font-size:24px;font-weight:800;color:#a3e635;text-shadow:0 2px 6px #000}
.topbar{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;gap:2px;font-weight:800}
.topbar div{padding:6px 16px;background:rgba(10,14,20,.7);text-align:center;min-width:64px}
.topbar .tA{border-radius:10px 0 0 10px;border-bottom:3px solid #3b82f6;font-size:24px}.topbar .tB{border-radius:0 10px 10px 0;border-bottom:3px solid #f59e0b;font-size:24px}
.topbar .tm{min-width:110px}.topbar .tm b{font-size:22px;display:block;letter-spacing:1px}.topbar .tm small{font-size:10px;color:#9fb0c3;letter-spacing:2px;text-transform:uppercase}
.alive{display:block;font-size:9px;letter-spacing:3px;color:#9fb0c3;font-weight:600}
.feed{position:absolute;top:70px;right:14px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;font-size:13px}
.feed .k{padding:4px 10px;background:rgba(8,11,16,.7);border-radius:6px;border-left:3px solid #888;animation:fin .2s}.feed .k.me{border:1px solid #f59e0b;background:rgba(60,35,5,.75)}
.feed .a0,.t0{color:#7fb2ff}.feed .a1,.t1{color:#ffb35c}.feed .w{color:#9fb0c3;margin:0 6px;font-size:11px}
@keyframes fin{from{opacity:0;transform:translateX(20px)}}
.mini{position:absolute;left:14px;top:14px;width:190px;height:190px;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.18);background:rgba(8,12,18,.6)}
.mini canvas{width:100%;height:100%}
.xh{position:absolute;left:50%;top:50%;width:0;height:0}.xh i{position:absolute;background:#e8fff0;box-shadow:0 0 2px #000,0 0 3px #000}
.xh .l{width:9px;height:2px;top:-1px}.xh .r{width:9px;height:2px;top:-1px}.xh .u{width:2px;height:9px;left:-1px}.xh .d{width:2px;height:9px;left:-1px}.xh .c{width:3px;height:3px;left:-1.5px;top:-1.5px;border-radius:50%}
.hm{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;opacity:0;transition:opacity .25s}.hm.on{opacity:1;transition:none}
.hm:before,.hm:after{content:"";position:absolute;left:50%;top:50%;width:3px;height:26px;margin:-13px 0 0 -1.5px;background:#fff;box-shadow:0 0 3px #000}.hm:before{transform:rotate(45deg)}.hm:after{transform:rotate(-45deg)}
.hm.head:before,.hm.head:after{background:#fbbf24}.hm.kill:before,.hm.kill:after{background:#ef4444;height:32px;margin-top:-16px}
.scope{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0,transparent 31vmin,#000 31.4vmin);display:none}
.scope:before,.scope:after{content:"";position:absolute;background:#000}.scope:before{left:50%;top:50%;width:62vmin;height:1px;margin-left:-31vmin}.scope:after{left:50%;top:50%;height:62vmin;width:1px;margin-top:-31vmin}
.fixedxh{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 3px #000;display:none}
.hint{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);padding:8px 16px;background:rgba(8,11,16,.7);border-radius:10px;font-size:15px;display:none;white-space:nowrap}
.msg{position:absolute;left:50%;top:22%;transform:translateX(-50%);text-align:center;text-shadow:0 3px 10px #000;opacity:0;transition:opacity .3s}.msg.on{opacity:1}
.msg b{font-size:44px;font-weight:900;letter-spacing:2px;display:block}.msg span{font-size:18px;color:#cbd5e1}
.medbar{position:absolute;left:50%;bottom:150px;width:220px;height:10px;transform:translateX(-50%);background:rgba(255,255,255,.15);border-radius:6px;overflow:hidden;display:none}.medbar i{display:block;height:100%;background:#4ade80;width:0}
.dmgdir{position:absolute;left:50%;top:50%;width:0;height:0}.dmgdir i{position:absolute;left:-60px;top:-170px;width:120px;height:40px;background:radial-gradient(ellipse at 50% 100%,rgba(255,40,40,.9),transparent 70%);transform-origin:60px 170px;animation:dd 1.2s forwards}
@keyframes dd{to{opacity:0}}
.dn{position:absolute;font-weight:800;font-size:20px;color:#fff;text-shadow:0 2px 4px #000,0 0 6px #000;pointer-events:none;white-space:nowrap;will-change:transform,opacity}
.dn.head{color:#fde047;font-size:30px}.dn.kill{color:#ef4444;font-size:26px}.dn.armor{color:#60a5fa;font-size:16px}
.spec{position:absolute;left:50%;top:70px;transform:translateX(-50%);padding:6px 18px;background:rgba(8,11,16,.7);border-radius:20px;display:none}
.fps{position:absolute;right:10px;top:8px;font:11px ui-monospace,monospace;color:#9fb0c3;text-align:right}
.chatlog{position:absolute;left:14px;bottom:200px;width:340px;font-size:13px;display:flex;flex-direction:column;gap:2px}.chatlog div{background:rgba(8,11,16,.55);padding:3px 8px;border-radius:5px}
.chatin{position:absolute;left:14px;bottom:170px;width:340px}
input,select{background:#161c27;border:1px solid #2c3647;color:#e8edf3;border-radius:8px;padding:8px 10px;font-size:14px;outline:none}input:focus,select:focus{border-color:#3b82f6}
/* overlays */
.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(5,8,12,.62);backdrop-filter:blur(3px);text-align:center;pointer-events:auto;z-index:20}
.overlay h2{font-size:34px;margin:0;font-weight:900;letter-spacing:1px}.overlay p{max-width:520px;margin:0;color:#b8c4d3}
.btn{background:linear-gradient(#3b82f6,#2563eb);color:#fff;border:0;padding:11px 22px;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 4px 0 #1d4ed8;transition:transform .08s}.btn:hover{filter:brightness(1.1)}.btn:active{transform:translateY(2px);box-shadow:0 2px 0 #1d4ed8}
.btn.g{background:linear-gradient(#374151,#2b323d);box-shadow:0 4px 0 #1b2027}.btn.r{background:linear-gradient(#ef4444,#dc2626);box-shadow:0 4px 0 #991b1b}.btn.ok{background:linear-gradient(#22c55e,#16a34a);box-shadow:0 4px 0 #15803d}.btn.sm{padding:6px 12px;font-size:12px;box-shadow:0 3px 0 #1d4ed8}.btn:disabled{opacity:.45;cursor:not-allowed}
.panel{background:rgba(14,19,28,.94);border:1px solid #243044;border-radius:16px;padding:18px 20px;box-shadow:0 18px 60px rgba(0,0,0,.55)}
.toast{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}
.toast div{padding:9px 16px;border-radius:10px;background:#1f2937;border:1px solid #374151;pointer-events:auto;animation:fin .2s;font-size:14px}.toast .e{background:#3b1313;border-color:#7f1d1d}.toast .inv{background:#10264a;border-color:#1d4ed8;display:flex;gap:10px;align-items:center}
/* menu */
.menu{position:absolute;inset:0;overflow:auto;background:radial-gradient(1200px 700px at 20% 0%,#16345a 0,transparent 60%),radial-gradient(900px 600px at 100% 100%,#4a2610 0,transparent 55%),#0a0e15;z-index:10}
.menu .wrap{max-width:1100px;margin:0 auto;padding:26px 20px 60px;display:grid;grid-template-columns:1.2fr 1fr;gap:18px}
.logo{grid-column:1/-1;display:flex;align-items:baseline;gap:14px}.logo h1{font-size:54px;margin:0;font-weight:900;letter-spacing:6px;background:linear-gradient(90deg,#60a5fa,#fbbf24);-webkit-background-clip:text;color:transparent}.logo small{color:#8ea0b7;letter-spacing:3px;text-transform:uppercase}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0}.row label{font-size:12px;color:#8ea0b7;min-width:90px;text-transform:uppercase;letter-spacing:1px}
.panel h3{margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8ea0b7}
.seg{display:flex;gap:4px}.seg button{background:#161c27;border:1px solid #2c3647;color:#cbd5e1;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:700}.seg button.on{background:#2563eb;border-color:#3b82f6;color:#fff}
.skins{display:flex;flex-wrap:wrap;gap:6px;max-width:260px}.sk{display:flex;flex-direction:column;align-items:center;gap:1px;background:#161c27;border:2px solid #2c3647;border-radius:8px;padding:5px 7px;cursor:pointer}.sk.on{border-color:#3b82f6;background:#1d2a44}.sk i{width:11px;height:11px;border-radius:3px;display:block}.sk b{width:16px;height:12px;border-radius:2px;background:#3a7bd5;display:block}.sk u{width:14px;height:9px;border-radius:2px;display:block;text-decoration:none}
.idchip{font:700 15px ui-monospace,monospace;letter-spacing:3px;padding:6px 12px;background:#0d1320;border:1px dashed #3b82f6;border-radius:8px;color:#93c5fd;cursor:pointer}
.friend{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;background:#121926;margin-bottom:5px}.friend .n{flex:1;font-weight:600}.friend small{color:#8ea0b7;font:11px ui-monospace,monospace}
.dot{width:9px;height:9px;border-radius:50%;background:#4b5563}.dot.online{background:#22c55e}.dot.lobby{background:#facc15}.dot.match{background:#60a5fa}
.teams{display:grid;grid-template-columns:1fr 1fr;gap:12px}.team{background:#0e1520;border-radius:12px;padding:10px;min-height:150px}.team h4{margin:0 0 8px;font-size:13px;letter-spacing:2px}.team.t0 h4{color:#7fb2ff}.team.t1 h4{color:#ffb35c}
.pl{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:#151d2b;margin-bottom:5px}.pl .rd{margin-left:auto;font-size:11px;padding:2px 8px;border-radius:10px;background:#1f2937;color:#9ca3af}.pl .rd.y{background:#14532d;color:#86efac}
.chatbox{height:130px;overflow:auto;background:#0b111b;border-radius:8px;padding:6px 8px;font-size:13px;margin-bottom:6px}.chatbox .sys{color:#8ea0b7;font-style:italic}
.status{position:fixed;right:12px;top:10px;z-index:30;font-size:12px;padding:4px 10px;border-radius:12px;background:#111827;border:1px solid #243044;pointer-events:none}.status.ok{color:#86efac}.status.bad{color:#fca5a5}
/* loja */
.shop{position:absolute;inset:0;z-index:25;background:rgba(5,8,12,.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;pointer-events:auto}
.shop .box{width:min(1040px,96vw);max-height:92vh;overflow:auto}
.shop .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.shop .hd b{font-size:26px}.shop .cash{font-size:28px;font-weight:900;color:#a3e635}
.tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.tabs button{background:#151d2b;border:1px solid #2c3647;color:#cbd5e1;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer}.tabs button.on{background:#2563eb;color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.card{background:#121926;border:1px solid #243044;border-radius:12px;padding:12px;cursor:pointer;transition:transform .1s,border-color .15s;position:relative}.card:hover{transform:translateY(-2px);border-color:#3b82f6}
.card.no{opacity:.5}.card.own{border-color:#22c55e}.card .p{font-weight:900;color:#a3e635;float:right}.card h5{margin:0 0 6px;font-size:15px}.card .st{font-size:11px;color:#9fb0c3;margin-top:6px}
.card .b{height:4px;background:#222c3b;border-radius:2px;margin-top:4px;overflow:hidden}.card .b i{display:block;height:100%;background:#60a5fa}
.card.flash-ok{animation:fok .5s}.card.flash-no{animation:fno .4s}
@keyframes fok{50%{background:#14532d}}@keyframes fno{20%,60%{transform:translateX(-5px);background:#4c1414}40%,80%{transform:translateX(5px)}}
.sb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(900px,96vw);z-index:22;display:none;pointer-events:none}
.sb table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px}.sb th{font-size:10px;letter-spacing:1px;color:#8ea0b7;text-align:right;padding:4px 8px}.sb th:first-child,.sb td:first-child{text-align:left}.sb td{padding:5px 8px;text-align:right;background:rgba(255,255,255,.04)}.sb tr.me td{background:rgba(250,204,21,.15)}.sb tr.dead td{opacity:.5}
.sb h4{margin:0 0 4px;letter-spacing:2px}
/* ajuda */
.help{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,.75);pointer-events:auto}.help .box{width:min(760px,94vw);max-height:92vh;overflow:auto}
.keys{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px 18px;margin:12px 0}.keys div{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px}
.set{position:absolute;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,.78);pointer-events:auto}.set .box{width:min(720px,95vw);max-height:92vh;overflow:auto}
.set input[type=range]{width:200px;padding:0}.kb{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}.kb div{display:flex;justify-content:space-between;align-items:center;font-size:13px}.kb button{min-width:84px}
/* toque */
.touch-ui{display:none;position:absolute;inset:0;z-index:15;touch-action:none}.mode-touch.in-game .touch-ui{display:block}
.t-look{position:absolute;right:0;top:0;width:55%;height:100%}.t-joy{position:absolute;left:0;bottom:0;width:45%;height:60%}
.t-joy-base{position:absolute;width:120px;height:120px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);opacity:.5;left:40px;bottom:40px}.t-joy-base.show{opacity:1}
.t-joy-knob{position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.45)}
.t-btn{position:absolute;border-radius:50%;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;color:#fff;touch-action:none}.t-btn small{font-size:9px;opacity:.8}.t-btn.on{background:rgba(59,130,246,.5)}
.touch-ui.editing .t-btn{outline:2px dashed #fbbf24}
.pause-note{font-size:13px;color:#fbbf24}
@media (max-width:800px){.menu .wrap{grid-template-columns:1fr}.mini{width:120px;height:120px}.hp-box{bottom:14px;left:10px}.ammo-box{bottom:14px;right:10px}.money{bottom:90px;right:14px}.logo h1{font-size:34px}}
`;
