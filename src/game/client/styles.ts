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
.topbar{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;gap:2px;font-weight:800}
.topbar div{padding:6px 16px;background:rgba(10,14,20,.7);text-align:center;min-width:64px}
.topbar .tA{border-radius:10px 0 0 10px;border-bottom:3px solid #3b82f6;font-size:24px}.topbar .tB{border-radius:0 10px 10px 0;border-bottom:3px solid #f59e0b;font-size:24px}
.topbar .tm{min-width:110px}.topbar .tm b{font-size:22px;display:block;letter-spacing:1px}.topbar .tm small{font-size:10px;color:#9fb0c3;letter-spacing:2px;text-transform:uppercase}
.alive{display:block;font-size:9px;letter-spacing:3px;color:#9fb0c3;font-weight:600}
.feed{position:absolute;top:70px;right:14px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;font-size:13px}
.feed .k{padding:4px 10px;background:rgba(8,11,16,.7);border-radius:6px;border-left:3px solid #888;animation:fin .2s}.feed .k.me{border:1px solid #f59e0b;background:rgba(60,35,5,.75)}
.feed .a0,.t0{color:#7fb2ff}.feed .a1,.t1{color:#ffb35c}.feed .w{color:#9fb0c3;margin:0 6px;font-size:11px}
@keyframes fin{from{opacity:0;transform:translateX(20px)}}
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
.touch-ui.editing .t-btn{outline:2px dashed #fbbf24}
.pause-note{font-size:13px;color:#fbbf24}
@media (max-width:800px){.menu .wrap{grid-template-columns:1fr}.mini{width:120px;height:120px}.logo h1{font-size:34px}}

/* lobby (menu principal) */
.lbx{height:100%;display:flex;flex-direction:column;position:relative}
.lbx::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(700px 420px at 50% 55%,rgba(59,130,246,.2),transparent 70%),repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 38px),repeating-linear-gradient(90deg,rgba(255,255,255,.022) 0 1px,transparent 1px 38px)}
.lb-top{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;min-height:46px;flex:none;background:linear-gradient(#0e1522,rgba(14,21,34,.65));border-bottom:1px solid #1f2b3d}
.lb-logo{display:flex;align-items:baseline;gap:10px}.lb-logo h1{margin:0;font-size:24px;font-weight:900;letter-spacing:5px;background:linear-gradient(90deg,#60a5fa,#fbbf24);-webkit-background-clip:text;color:transparent}.lb-logo small{color:#8ea0b7;letter-spacing:3px;font-size:10px}
.lb-top-r{display:flex;align-items:center;gap:8px;min-width:0}
.lbx .status{position:static;max-width:34vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ib{width:34px;height:34px;flex:none;border-radius:9px;border:1px solid #2c3647;background:#161c27;color:#cbd5e1;font-size:16px;cursor:pointer}.ib:hover{border-color:#3b82f6;color:#fff}
.lb-body{position:relative;z-index:1;flex:1;min-height:0;display:grid;grid-template-columns:minmax(170px,.9fr) minmax(240px,1.5fr) minmax(190px,1fr);gap:10px;padding:10px}
.lb-col{min-height:0;display:flex;flex-direction:column;gap:10px;overflow:auto}
.lbx .card{background:rgba(14,19,28,.88);border:1px solid #243044;border-radius:14px;padding:10px 12px}.lbx .card.grow{flex:1;min-height:0;overflow:auto}
.lbx .card h3{margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8ea0b7;display:flex;justify-content:space-between;align-items:baseline}.lbx .card h3 small{letter-spacing:0;color:#93c5fd;text-transform:none;font-size:12px}
.prow{display:flex;gap:8px;align-items:center;margin:6px 0}.prow label{font-size:11px;color:#8ea0b7;min-width:44px;text-transform:uppercase;letter-spacing:1px}.prow input{flex:1;min-width:0}
.skgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:6px}
.skt{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px 5px;background:#121926;border:2px solid #263247;border-radius:10px;cursor:pointer;color:#cbd5e1;font-size:10px;font-weight:700}.skt.on{border-color:#3b82f6;background:#1a2a48;color:#fff;box-shadow:0 0 14px rgba(59,130,246,.35)}
.skt .fig{display:flex;flex-direction:column;align-items:center;gap:1px;height:44px;justify-content:center}.skt .fig i{width:15px;height:14px;border-radius:5px;display:block}.skt .fig b{width:24px;height:16px;border-radius:3px;background:#3a7bd5;display:block}.skt .fig u{width:18px;height:11px;border-radius:2px;display:block}
.lb-stage{min-height:0;display:flex;flex-direction:column;gap:8px}
.stage-view{position:relative;flex:1;min-height:120px;border-radius:16px;overflow:hidden;background:radial-gradient(closest-side,rgba(96,165,250,.2),rgba(0,0,0,0)),linear-gradient(#0e1623,#0a0f18);border:1px solid #1f2b3d}
.stage-view canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}.stage-view canvas:active{cursor:grabbing}
.arr{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:52px;border:0;border-radius:10px;background:rgba(15,23,36,.72);color:#e8edf3;font-size:26px;cursor:pointer;z-index:2}.arr.l{left:8px}.arr.r{right:8px}.arr:hover{background:#2563eb}
.nametag{position:absolute;left:0;right:0;bottom:8px;text-align:center;pointer-events:none;z-index:2}.nametag b{display:block;font-size:17px;letter-spacing:1px;text-shadow:0 2px 6px #000}.nametag small{color:#93c5fd;font-size:11px;letter-spacing:2px;text-transform:uppercase}
.play{flex:none;display:flex;flex-direction:column;gap:8px}
.bigplay{border:0;border-radius:14px;padding:10px 14px;cursor:pointer;color:#fff;background:linear-gradient(#22c55e,#15a34a);box-shadow:0 5px 0 #166534,0 10px 30px rgba(34,197,94,.25);display:flex;flex-direction:column;align-items:center;transition:transform .08s}.bigplay span{font-size:clamp(18px,3.4vh,26px);font-weight:900;letter-spacing:3px}.bigplay small{font-size:11px;opacity:.92;letter-spacing:1px}.bigplay:active{transform:translateY(3px);box-shadow:0 2px 0 #166534}
.online{display:flex;gap:6px;align-items:center}.online .btn{white-space:nowrap;padding:9px 14px;font-size:13px}.online input{flex:1;min-width:0;text-transform:uppercase;text-align:center;letter-spacing:2px}
.tabs{display:flex;gap:6px;flex:none}.tabs button{flex:1;padding:9px 6px;border-radius:10px;border:1px solid #2c3647;background:#121926;color:#9fb0c3;font-weight:800;letter-spacing:1px;font-size:12px;cursor:pointer;text-transform:uppercase}.tabs button.on{background:#2563eb;border-color:#3b82f6;color:#fff}.tabs i{font-style:normal;background:#ef4444;color:#fff;border-radius:10px;padding:0 6px;margin-left:4px;font-size:11px}
.lbx .row{margin:7px 0}.lbx .row label{min-width:50px}.lbx .seg button{padding:6px 11px}.lbx select{max-width:100%}.lbx .hint{color:#6b7a90;font-size:11px;margin:10px 0 0}
@media (max-height:430px){.lb-top{min-height:40px;padding:4px 10px}.lb-logo h1{font-size:20px}.lb-logo small{display:none}.ib{width:30px;height:30px}.lb-body{padding:8px;gap:8px}.lbx .card{padding:8px 10px}.bigplay{padding:6px 12px}}
@media (orientation:portrait) and (max-width:820px){.lbx{height:auto;min-height:100%}.lb-body{grid-template-columns:1fr}.lb-stage{order:-1}.stage-view{min-height:340px}.lb-col{overflow:visible}.lbx .card.grow{overflow:visible}}

/* HUD no estilo blocos */

/* botão de menu da partida */
.set .box.pausebox{width:min(360px,92vw);text-align:center}.pcol{display:flex;flex-direction:column;gap:8px}.pcol .btn{width:100%;padding:12px 14px}

/* ===== HUD no estilo "painéis chanfrados + botões redondos escuros" ===== */
.mini{position:absolute;left:9px;top:9px;width:132px;height:132px;border-radius:8px;overflow:hidden;border:2px solid #23272d;background:rgba(8,12,18,.7);box-shadow:0 0 0 1px rgba(255,255,255,.1),0 4px 10px rgba(0,0,0,.5)}
.hp-box{position:absolute;left:9px;bottom:12px;display:flex;gap:4px;align-items:flex-end}
.stat,.money,.ammo-box{background:linear-gradient(#2c3138,#15181c);clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);box-shadow:inset 0 0 0 2px rgba(255,255,255,.07);color:#fff}
.stat{display:grid;grid-template-columns:24px auto 1fr;column-gap:7px;align-items:center;min-width:100px;padding:7px 12px 9px 12px}
.stat .ic{display:flex;width:22px;height:22px}.stat .ic svg{width:100%;height:100%}
.stat b{font-size:24px;font-weight:800;line-height:1}.stat small{font-size:9px;color:#9fb0c3;text-align:right}
.bar{grid-column:1/-1;height:6px;margin-top:6px;background:#3b3f45;overflow:hidden}.bar i{display:block;height:100%;background:#22c55e;transition:width .15s}
.bar.ar i{background:#60a5fa}.low b,.low .ic{color:#f87171}.low .bar i{background:#ef4444}
.money{position:absolute;right:8px;bottom:70px;display:flex;align-items:center;gap:7px;padding:5px 14px 5px 11px;font-size:20px;font-weight:800;color:#a3e635}
.money .ic{display:flex;width:24px;height:24px;color:#fbbf24}.money .ic svg{width:100%;height:100%}
.ammo-box{position:absolute;right:7px;bottom:10px;display:flex;align-items:center;gap:10px;padding:7px 14px 8px 12px;text-align:left}
.ammo-box .ic{display:flex;width:26px;height:26px;color:#e5e7eb}.ammo-box .ic svg{width:100%;height:100%}
.ammo-box .am small{display:block;font-size:9px;color:#9fb0c3;letter-spacing:.5px;min-height:11px;white-space:nowrap}
.ammo-box .nums b{font-size:26px;font-weight:800}.ammo-box .nums span{font-size:16px;color:#aab6c4}
.topbar{top:6px}.topbar div{background:linear-gradient(#2a2f36,#14171b);padding:4px 14px}
.topbar .tA{border-radius:0;clip-path:polygon(0 0,100% 0,100% 100%,9px 100%,0 calc(100% - 9px))}.topbar .tB{border-radius:0;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}
.fps{position:absolute;right:0;top:0;padding:6px 10px 7px 14px;font:700 11px/1.3 system-ui,sans-serif;color:#fff;text-align:left;background:linear-gradient(#2a2f36,#14171b);clip-path:polygon(9px 0,100% 0,100% 100%,0 100%,0 9px);min-width:66px}.fps:empty{display:none}
.sig{display:inline-flex;gap:2px;align-items:flex-end;height:13px;margin-left:5px;vertical-align:-2px;--c:#22c55e}.sig.s3{--c:#a3e635}.sig.s2{--c:#f59e0b}.sig.s1{--c:#ef4444}
.sig i{display:block;width:3px;background:#4b5058}.sig i:nth-child(1){height:4px}.sig i:nth-child(2){height:7px}.sig i:nth-child(3){height:10px}.sig i:nth-child(4){height:13px}.sig i.on{background:var(--c)}
.pausebtn{position:absolute;top:5px;right:98px;width:34px;height:34px;padding:0;font-size:18px;line-height:1;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(#2a2f36,#14171b);color:#e8edf3;z-index:18;cursor:pointer;display:flex;align-items:center;justify-content:center}.pausebtn:active{background:#2563eb}
/* botões de toque: círculos metálicos escuros com ícone branco */
.t-btn{position:absolute;border-radius:50%;background:radial-gradient(circle at 50% 28%,#40454d 0,#1b1e23 72%);border:2px solid #0c0e11;box-shadow:0 0 0 2px #535860,0 4px 10px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;color:#eceff3;touch-action:none}
.t-btn .ic{display:flex;width:56%;height:56%;pointer-events:none}.t-btn .ic svg{width:100%;height:100%;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.85))}
.t-btn small{display:none}.touch-ui.editing .t-btn small{display:block;position:absolute;bottom:-15px;font-size:9px;color:#fbbf24;white-space:nowrap}
.t-btn.on{background:radial-gradient(circle at 50% 28%,#4f8ef7 0,#1e3a8a 76%);box-shadow:0 0 0 2px #93c5fd,0 4px 10px rgba(0,0,0,.55)}
.t-btn .badge{display:none;position:absolute;right:-3px;bottom:-3px;min-width:19px;height:19px;padding:0 4px;box-sizing:border-box;border-radius:10px;background:#e5e7eb;color:#111;font:800 12px/19px system-ui,sans-serif;text-align:center;font-style:normal;pointer-events:none}
.t-btn.empty{opacity:.45}
.t-joy-base{position:absolute;width:120px;height:120px;border-radius:50%;left:34px;bottom:83px;border:2px solid rgba(255,255,255,.26);opacity:.75;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cg fill='rgba(255,255,255,.55)'%3E%3Cpath d='M60 9l8 13H52z'/%3E%3Cpath d='M60 111l8-13H52z'/%3E%3Cpath d='M9 60l13-8v16z'/%3E%3Cpath d='M111 60l-13-8v16z'/%3E%3C/g%3E%3C/svg%3E") center/100% no-repeat,radial-gradient(circle,rgba(22,26,32,.6) 58%,rgba(22,26,32,.28))}.t-joy-base.show{opacity:1}
.t-joy-knob{position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle at 40% 32%,#a3a9b1,#4a4f57 72%);box-shadow:0 2px 6px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.12)}

/* botão de atirar: miolo escuro, anel cinza, arcos brancos e lâminas vermelhas ao disparar */
.t-btn[data-id=fire]{background:#202020;border:0;box-shadow:0 0 0 5px #4a4a4a,0 5px 14px rgba(0,0,0,.6)}
.t-btn[data-id=fire] .ic{width:54%;height:54%}
.fire-ring{position:absolute;left:7%;top:7%;width:86%;height:86%;pointer-events:none;color:#fff}
.fire-fx{position:absolute;left:-30%;top:-30%;width:160%;height:160%;pointer-events:none;opacity:0;transform:scale(.8);transition:opacity .08s,transform .1s}
.t-btn.on[data-id=fire]{background:#2b1414;box-shadow:0 0 0 5px #b91c1c,0 0 20px rgba(239,68,68,.65)}
.t-btn.on[data-id=fire] .fire-ring{color:#fbbf24}.t-btn.on[data-id=fire] .fire-fx{opacity:1;transform:scale(1)}

/* editor de controles de toque */
.ce{position:fixed;inset:0;z-index:60;background:rgba(6,9,14,.84);touch-action:none;user-select:none;-webkit-user-select:none}
.ce-ghost{position:absolute;border:1.5px dashed rgba(255,255,255,.2);border-radius:8px;color:rgba(255,255,255,.3);font-size:10px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.ce-bar{position:absolute;left:50%;top:6px;transform:translateX(-50%);display:flex;gap:8px;padding:6px 8px;background:rgba(16,21,29,.95);border:1px solid #2c3647;border-radius:12px;z-index:3}
.ce .btn{padding:8px 12px;font-size:13px;white-space:nowrap}.ce .btn.sm{padding:6px 12px;font-size:16px}
.ce-el{cursor:grab;z-index:2}.ce-el.sel{outline:3px solid #fbbf24;outline-offset:4px}
.ce .t-btn small{display:block;position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:5px;font-size:9px;color:#fbbf24;white-space:nowrap;pointer-events:none}
.ce .t-joy-base{opacity:.9}.ce .t-joy-base small{display:block;position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:5px;font-size:9px;color:#fbbf24;pointer-events:none}
.ce-size{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:rgba(16,21,29,.95);border:1px solid #2c3647;border-radius:12px;padding:8px 14px;z-index:3;max-width:min(520px,60vw)}
.ce-sel{min-width:0}.ce-sel b{display:block;font-size:14px}.ce-sel small{display:block;font-size:10px;color:#8ea0b7;line-height:1.25}
.ce-ctl{display:flex;align-items:center;gap:8px}.ce-ctl input[type=range]{width:min(150px,22vw)}.ce-ctl span{font-size:12px;color:#cbd5e1;min-width:44px;text-align:right}

/* ===== Configurações em abas (cores originais do jogo: azul, painel com borda) ===== */
.set.cfgwrap{display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,.78)}
.cfg{display:grid;grid-template-columns:minmax(150px,24%) 1fr;width:min(940px,96vw);height:min(540px,94vh);overflow:hidden;color:#e8edf3;background:rgba(14,19,28,.96);border:1px solid #243044;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.55)}
.cfg-side{display:flex;flex-direction:column;gap:6px;padding:12px;background:rgba(8,12,18,.72);border-right:1px solid #243044;overflow:auto}
.cfg-title{padding:4px 4px 10px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8ea0b7}
.cfg-tab{all:unset;box-sizing:border-box;display:block;padding:11px 14px;border-radius:10px;border:1px solid #2c3647;background:#161c27;color:#cbd5e1;font-weight:700;font-size:14px;cursor:pointer}
.cfg-tab:hover{border-color:#3b82f6}.cfg-tab.on{background:#2563eb;border-color:#3b82f6;color:#fff}
.cfg-main{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;padding:14px 16px 12px}
.cfg-x{position:absolute;top:10px;right:12px;width:34px;height:34px;border-radius:9px;border:1px solid #2c3647;background:#161c27;color:#cbd5e1;font-size:16px;cursor:pointer;z-index:2}.cfg-x:hover{border-color:#3b82f6;color:#fff}
.cfg-panel{flex:1;min-height:0;margin-top:2px;padding:0 2px;overflow:auto}
.cfg-h{margin:0 40px 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8ea0b7;border-left:4px solid #3b82f6;padding-left:10px;line-height:1.2}
.cfg-row{display:flex;align-items:center;gap:12px;background:#121926;border:1px solid #243044;border-radius:10px;padding:9px 14px;margin-bottom:7px;min-height:42px}
.cfg-l{flex:0 0 34%;font-weight:700;font-size:14px}.cfg-v{flex:none;min-width:50px;text-align:right;font-weight:700;font-size:14px;color:#93c5fd}
.cfg-ctl{flex:1;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cfg-note{color:#6b7a90;font-size:12px}
.set input.cfg-r{flex:1;min-width:0;width:auto;-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;border:0;padding:0;outline:none;background:linear-gradient(90deg,#3b82f6 var(--p,50%),#2c3647 var(--p,50%))}
.cfg-r::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #2563eb}
.cfg-r::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #2563eb}.cfg-r::-moz-range-track{background:transparent}
.cfg-sw{position:relative;width:48px;height:26px;margin-left:auto;flex:none}.cfg-sw input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}
.cfg-sw i{position:absolute;inset:0;background:#2c3647;border-radius:13px;transition:.15s}.cfg-sw i::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.15s}
.cfg-sw input:checked+i{background:#2563eb}.cfg-sw input:checked+i::after{left:25px}
.cfg .seg{flex-wrap:wrap}.cfg .kb{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px}.cfg .kb>div{background:#121926;border:1px solid #243044;border-radius:10px;padding:6px 10px;font-size:13px}
.cfg-foot{display:flex;justify-content:flex-end;padding-top:10px}
.cfg-reset,.cfg-btn{border:0;color:#fff;font-weight:700;font-size:14px;padding:10px 24px;border-radius:10px;cursor:pointer;transition:transform .08s}
.cfg-reset{background:linear-gradient(#374151,#2b323d);box-shadow:0 4px 0 #1b2027}.cfg-btn{background:linear-gradient(#3b82f6,#2563eb);box-shadow:0 4px 0 #1d4ed8;padding:8px 16px}
.cfg-reset:active,.cfg-btn:active{transform:translateY(2px)}
@media (max-width:640px){.cfg{grid-template-columns:1fr;grid-template-rows:auto 1fr;width:100vw;height:100vh;border-radius:0;border:0}.cfg-side{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #243044}.cfg-title{display:none}.cfg-tab{white-space:nowrap}.cfg-l{flex-basis:40%}}
@media (max-height:430px){.cfg{height:96vh}.cfg-side{padding:8px;gap:4px}.cfg-title{padding:0 2px 6px}.cfg-tab{padding:8px 12px;font-size:13px}.cfg-main{padding:10px 12px 8px}.cfg-row{padding:5px 12px;min-height:34px;margin-bottom:5px}.cfg-l,.cfg-v{font-size:13px}.cfg-x{width:30px;height:30px;top:8px}.cfg-reset{padding:8px 20px}}

/* botão "Skins" no lobby */
.skbtn{width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;background:#121926;border:2px solid #263247;border-radius:12px;color:#e8edf3;cursor:pointer;text-align:left}.skbtn:hover{border-color:#3b82f6;background:#1a2a48}
.skbtn .fig{display:flex;flex-direction:column;align-items:center;gap:1px;width:34px}.skbtn .fig i{width:17px;height:16px;border-radius:5px;display:block}.skbtn .fig b{width:28px;height:19px;border-radius:3px;background:#3a7bd5;display:block}.skbtn .fig u{width:21px;height:13px;border-radius:2px;display:block}
.skbtn-t{flex:1;min-width:0}.skbtn-t strong{display:block;font-size:16px}.skbtn-t small{color:#93c5fd;font-size:12px}.skbtn-go{font-size:24px;color:#8ea0b7}
/* tela de Skins (grande) */
.set.skwrap{display:flex;align-items:center;justify-content:center;background:rgba(5,8,12,.82)}
.skw{display:grid;grid-template-columns:minmax(220px,38%) 1fr;width:min(1000px,97vw);height:min(560px,95vh);overflow:hidden;background:rgba(14,19,28,.97);border:1px solid #243044;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.55);color:#e8edf3}
.skw-view{position:relative;min-height:0;background:radial-gradient(closest-side,rgba(96,165,250,.22),rgba(0,0,0,0)),linear-gradient(#0e1623,#0a0f18);border-right:1px solid #243044}
.skw-view canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.skw-name{position:absolute;left:0;right:0;bottom:12px;text-align:center;pointer-events:none;z-index:2}.skw-name b{display:block;font-size:22px;letter-spacing:1px;text-shadow:0 2px 6px #000}.skw-name small{color:#93c5fd;font-size:12px;letter-spacing:2px;text-transform:uppercase}
.skw-main{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;padding:16px 18px 12px}
.skw-grid{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px;align-content:start;padding:2px}
.skc{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px 10px;background:#121926;border:2px solid #263247;border-radius:14px;color:#cbd5e1;font-weight:800;font-size:13px;cursor:pointer}
.skc:hover{border-color:#3b82f6}.skc.sel{border-color:#3b82f6;background:#1a2a48;color:#fff;box-shadow:0 0 18px rgba(59,130,246,.4)}
.skc .fig{display:flex;flex-direction:column;align-items:center;gap:2px;height:84px;justify-content:center}.skc .fig i{width:30px;height:28px;border-radius:9px;display:block}.skc .fig b{width:46px;height:32px;border-radius:5px;background:#3a7bd5;display:block}.skc .fig u{width:36px;height:22px;border-radius:3px;display:block}
.skc em{display:none;position:absolute;top:6px;right:6px;font-style:normal;font-size:9px;letter-spacing:1px;background:#16a34a;color:#fff;border-radius:6px;padding:2px 6px}.skc.eq em{display:block}
.skw-foot{display:flex;justify-content:flex-end;gap:10px;padding-top:12px}
@media (max-width:640px){.skw{grid-template-columns:1fr;grid-template-rows:38% 1fr;width:100vw;height:100vh;border-radius:0;border:0}.skw-view{border-right:0;border-bottom:1px solid #243044}}
@media (max-height:430px){.skw{grid-template-columns:minmax(180px,34%) 1fr;height:97vh}.skw-main{padding:10px 12px 8px}.skc{padding:10px 4px 8px}.skc .fig{height:66px}.skc .fig i{width:24px;height:22px}.skc .fig b{width:38px;height:26px}.skc .fig u{width:30px;height:17px}.skw-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}.skw-name b{font-size:18px}}
`;
