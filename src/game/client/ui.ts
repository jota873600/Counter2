// @ts-nocheck
/**
 * HUD e overlays: vida/colete/munição/dinheiro, placar do round, timer, kill feed, minimapa,
 * mira dinâmica, hitmarker, indicador de dano, números flutuantes, loja (B), placar (Tab),
 * dicas contextuais, overlays de Pointer Lock e painel "Como jogar" com teclas (keycaps).
 */
import { ICON } from './icons';
import * as THREE from 'three';
import { W, ITEMS, SHOP_CATS } from '../shared/weapons';
import { settings, bindLabel } from './settings';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (el, sel) => el.querySelector(sel);
export const key = (a) => `<span class="key">${esc(bindLabel(a))}</span>`;
export const TEAM = ['Azul', 'Laranja'];
const FAIL = {
  unsupported: 'Seu navegador não oferece Pointer Lock (travar o mouse).',
  error: 'O navegador bloqueou o travamento do mouse (Pointer Lock). Isso costuma acontecer quando o jogo roda dentro de um iframe sem a permissão "allow-pointer-lock" (como pré-visualizações em chats).',
  timeout: 'O travamento do mouse não foi confirmado em 500 ms. Provavelmente o Pointer Lock está bloqueado neste contexto (iframe/pré-visualização).',
};

export class HUD {
  constructor(root, app) {
    this.app = app; this.root = root; this.nums = []; this.cache = {}; this.feedItems = [];
    const h = (this.el = document.createElement('div'));
    h.className = 'layer hud';
    h.innerHTML = `
      <div class="mini"><canvas width="190" height="190"></canvas></div>
      <div class="topbar"><div class="tA">0<span class="alive" data-a="0"></span></div><div class="tm"><small data-k="ph">COMPRA</small><b data-k="tm">0:15</b><small data-k="rd">Round 1/15</small></div><div class="tB">0<span class="alive" data-a="1"></span></div></div>
      <div class="feed"></div>
      <div class="xh"><i class="l"></i><i class="r"></i><i class="u"></i><i class="d"></i><i class="c"></i></div><div class="fixedxh"></div><div class="hm"></div>
      <div class="scope"></div>
      <div class="dmgdir"></div>
      <div class="msg"><b></b><span></span></div>
      <div class="hint"></div><div class="medbar"><i></i></div><div class="spec"></div>
      <div class="hp-box"><div class="stat" data-s="hp"><span class="ic">${ICON.health}</span><b>100</b><div class="bar"><i style="width:100%"></i></div></div><div class="stat ar" data-s="ar"><span class="ic">${ICON.shield}</span><b>0</b><small data-k="hm"></small><div class="bar ar"><i style="width:0"></i></div></div></div>
      <div class="money"><span class="ic">${ICON.coins}</span><span data-k="mo">$800</span></div>
      <div class="ammo-box"><span class="ic">${ICON.bullet}</span><div class="am"><small data-k="wn"></small><div class="nums"><b data-k="mag">0</b> <span data-k="res">/ 0</span></div></div></div>
      <div class="chatlog"></div>
      <div class="keybar"></div>
      <div class="fps"></div><button class="pausebtn ui-block" data-x="pause" title="Menu">☰</button>`;
    root.appendChild(h);
    this.layer = document.createElement('div'); this.layer.className = 'layer hud'; root.appendChild(this.layer); // números flutuantes
    this.q = (s) => h.querySelector(s);
    this.mini = this.q('.mini canvas').getContext('2d'); this.mapCv = null;
    this.q('.pausebtn').onclick = () => this.app.menus.pause();
    // Placar, loja, ajuda, overlay
    this.sb = document.createElement('div'); this.sb.className = 'sb panel'; root.appendChild(this.sb);
    this.shop = document.createElement('div'); this.shop.className = 'shop hide ui-block'; root.appendChild(this.shop);
    this.help = document.createElement('div'); this.help.className = 'help hide ui-block'; root.appendChild(this.help);
    this.ov = document.createElement('div'); this.ov.className = 'overlay hide'; root.appendChild(this.ov);
    this.toasts = document.createElement('div'); this.toasts.className = 'toast'; root.appendChild(this.toasts);
    this.chatIn = document.createElement('input'); this.chatIn.className = 'chatin hide ui-block'; this.chatIn.dataset.chat = '1'; this.chatIn.maxLength = 140; this.chatIn.placeholder = 'Mensagem… (Enter envia, Esc cancela)'; h.appendChild(this.chatIn);
    this.chatIn.style.pointerEvents = 'auto';
    this.cat = 'pistols'; this.shopOpen = false;
    this.buildKeybar();
    this.buildHelp();
  }

  /* ---- barra de teclas e painel de ajuda (rótulos refletem remapeamento) ---- */
  buildKeybar() {
    const it = [['forward', 'back', 'left', 'right'], 'Mover', 'Mouse|Mirar', 'Clique esq.|Atirar', 'Clique dir.|Mira aberta', ['reload'], 'Recarregar', ['jump'], 'Pular', ['crouch'], 'Agachar', ['shop'], 'Loja', ['score'], 'Placar'];
    const k = (a) => (Array.isArray(a) ? a.map((x) => key(x)).join('').replace(/<span class="key">(.*?)<\/span>(?=<span)/g, '<span class="key">$1</span>') : a);
    const wasd = ['forward', 'left', 'back', 'right'].map((a) => bindLabel(a)).join('');
    this.q('.keybar').innerHTML = [
      `<span class="i"><span class="key">${esc(wasd)}</span> Mover</span>`, '<span class="i"><span class="key">Mouse</span> Mirar</span>', '<span class="i"><span class="key">Clique esq.</span> Atirar</span>', '<span class="i"><span class="key">Clique dir.</span> Mira aberta</span>',
      `<span class="i">${key('reload')} Recarregar</span>`, `<span class="i">${key('jump')} Pular</span>`, `<span class="i">${key('crouch')} Agachar</span>`, `<span class="i">${key('shop')} Loja</span>`, `<span class="i">${key('score')} Placar</span>`,
    ].join('');
  }
  buildHelp() {
    const R = (a, t) => `<div><span>${t}</span><span>${a}</span></div>`;
    this.help.innerHTML = `<div class="box panel"><h2 style="margin:0 0 4px">Como jogar</h2><p style="color:#9fb0c3;margin:0">Teclas de acordo com o seu mapeamento atual.</p><div class="keys">
      ${R(['forward', 'left', 'back', 'right'].map(key).join(''), 'Mover')}${R('<span class="key">Mouse</span>', 'Mirar / olhar')}${R('<span class="key">Clique esq.</span>', 'Atirar (segure para rajada)')}${R('<span class="key">Clique dir.</span>', 'Mira aberta (segure)')}
      ${R(key('reload'), 'Recarregar')}${R(key('jump'), 'Pular')}${R(key('crouch') + '<span class="key">Ctrl</span>', 'Agachar')}${R(key('walk'), 'Andar silencioso')}
      ${R(['slot1', 'slot2', 'slot3', 'slot4', 'slot5'].map(key).join(''), 'Trocar arma')}${R(key('grenade'), 'Granada')}${R(key('medkit'), 'Kit médico')}${R(key('prev'), 'Arma anterior')}
      ${R(key('shop'), 'Loja (fase de compra)')}${R(key('use'), 'Usar / pegar arma')}${R(key('drop'), 'Largar arma')}${R(key('score'), 'Placar (segurar)')}
      ${R(key('chat'), 'Chat rápido')}${R(key('help'), 'Esta ajuda')}${R('<span class="key">Esc</span>', 'Menu / soltar mouse')}${R('<span class="key">Roda</span>', 'Zoom da luneta')}
      </div><div style="text-align:right"><button class="btn" data-x="ok">Entendi</button></div></div>`;
    $(this.help, '[data-x=ok]').onclick = () => this.showHelp(false);
  }
  showHelp(on) {
    if (on) this.buildHelp();
    this.help.classList.toggle('hide', !on);
    if (!on) { settings.helpSeen = true; this.app.saveSettings(); this.app.afterModal(); } else this.app.beforeModal();
  }
  helpOpen() { return !this.help.classList.contains('hide'); }

  /* ---- overlay de Pointer Lock ---- */
  lockOverlay(kind, reason) {
    const ov = this.ov;
    if (!kind) { ov.classList.add('hide'); return; }
    ov.classList.remove('hide');
    if (kind === 'fail') {
      ov.innerHTML = `<h2>Mouse não pôde ser travado</h2><p>${esc(FAIL[reason] || FAIL.error)}</p><p>Recomendado: abra o jogo em tela cheia ou em uma nova aba.</p>
        <div class="row" style="justify-content:center"><button class="btn" data-x="fs">Abrir em tela cheia / nova aba</button><button class="btn g" data-x="edge">Jogar assim mesmo (giro por borda)</button></div>
        <p class="pause-note">Modo alternativo: mova o mouse perto das bordas da tela para girar a câmera. Os botões esquerdo/direito atiram e miram ao mesmo tempo.</p>`;
      $(ov, '[data-x=fs]').onclick = () => this.app.openFullscreenOrTab();
      $(ov, '[data-x=edge]').onclick = () => this.app.input.startFallback();
    } else {
      ov.innerHTML = `<h2>${kind === 'play' ? 'Clique para jogar' : 'Clique para continuar'}</h2><p>${kind === 'play' ? 'O cursor será travado para girar a câmera. Esc solta o mouse.' : 'Jogo pausado (entrada desativada).'}</p>
        <div class="row" style="justify-content:center"><button class="btn g sm" data-x="set">⚙ Configurações</button><button class="btn r sm" data-x="quit">Sair da partida</button></div>`;
      $(ov, '[data-x=set]').onclick = (e) => { e.stopPropagation(); this.app.menus.settings(); };
      $(ov, '[data-x=quit]').onclick = (e) => { e.stopPropagation(); this.app.quitMatch(); };
      ov.onclick = () => this.app.input.requestLock(); // requestPointerLock direto no clique (gesto do usuário); este clique NÃO atira
      ov.style.cursor = 'pointer';
    }
  }

  /* ---- feedback ---- */
  toast(text, cls = '', ms = 3200) {
    const d = document.createElement('div'); d.className = cls; d.textContent = text; this.toasts.appendChild(d);
    setTimeout(() => d.remove(), ms);
  }
  toastHtml(html, cls, ms) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; this.toasts.appendChild(d); setTimeout(() => d.remove(), ms); return d; }
  msg(t, s = '', ms = 2200) {
    const m = this.q('.msg'); m.querySelector('b').textContent = t; m.querySelector('span').textContent = s; m.classList.add('on');
    clearTimeout(this.msgT); this.msgT = setTimeout(() => m.classList.remove('on'), ms);
  }
  hint(html) { const e = this.q('.hint'); if (html === this.cache.hint) return; this.cache.hint = html; e.style.display = html ? 'block' : 'none'; e.innerHTML = html || ''; }
  hit(kind) { const e = this.q('.hm'); e.className = 'hm on ' + kind; clearTimeout(this.hmT); this.hmT = setTimeout(() => (e.className = 'hm ' + kind), 60); }
  dmgDir(ang) {
    const c = this.q('.dmgdir'), i = document.createElement('i'); i.style.transform = `rotate(${ang}rad)`; c.appendChild(i); setTimeout(() => i.remove(), 1200);
  }
  medbar(p) { const b = this.q('.medbar'); b.style.display = p >= 0 ? 'block' : 'none'; if (p >= 0) b.firstChild.style.width = p * 100 + '%'; }
  chatLine(text, cls) {
    const l = this.q('.chatlog'), d = document.createElement('div'); d.innerHTML = text; if (cls) d.className = cls; l.appendChild(d);
    while (l.children.length > 6) l.firstChild.remove();
    setTimeout(() => d.remove(), 9000);
  }
  killfeed(k, meId) {
    const f = this.q('.feed'), d = document.createElement('div');
    const wn = (W[k.w] || {}).name || k.w;
    d.className = 'k' + (k.a === meId || k.v === meId ? ' me' : '');
    d.innerHTML = k.a && k.a !== k.v ? `<span class="t${k.at}">${esc(k.an)}</span><span class="w">${esc(wn)} ${k.h ? '🎯' : ''}</span><span class="t${k.vt}">${esc(k.vn)}</span>` : `<span class="t${k.vt}">${esc(k.vn)}</span><span class="w">morreu ${k.w === 'frag' ? '(explosão)' : ''}</span>`;
    f.appendChild(d); while (f.children.length > 6) f.firstChild.remove();
    setTimeout(() => d.remove(), 7000);
  }
  /** Número de dano flutuante no ponto do impacto (projetado a cada frame). */
  number(pos, text, cls) {
    const e = document.createElement('div'); e.className = 'dn ' + cls; e.textContent = text; this.layer.appendChild(e);
    this.nums.push({ e, p: new THREE.Vector3(pos[0], pos[1], pos[2]), age: 0, head: cls === 'head', dx: (Math.random() - 0.5) * 30 });
    if (this.nums.length > 30) this.nums.shift().e.remove();
  }
  tickNumbers(dt, cam) {
    const w = innerWidth, h = innerHeight, v = new THREE.Vector3();
    this.nums = this.nums.filter((n) => {
      n.age += dt;
      if (n.age > 1.1) { n.e.remove(); return false; }
      v.copy(n.p); v.y += n.age * 0.9; v.project(cam);
      if (v.z > 1) { n.e.style.opacity = 0; return true; }
      const pop = n.head ? 1 + 0.6 * Math.max(0, Math.sin(Math.min(1, n.age * 5) * Math.PI)) : 1;
      n.e.style.opacity = Math.min(1, (1.1 - n.age) * 2);
      n.e.style.transform = `translate(${(v.x * 0.5 + 0.5) * w + n.dx * n.age}px,${(-v.y * 0.5 + 0.5) * h - (n.head ? Math.abs(Math.sin(n.age * 7)) * 14 * (1 - n.age) : 0)}px) translate(-50%,-50%) scale(${pop})`;
      n.e.style.left = '0'; n.e.style.top = '0';
      return true;
    });
  }

  /* ---- atualização por frame ---- */
  set(k, v) { if (this.cache[k] === v) return false; this.cache[k] = v; return true; }
  update(s) {
    const q = this.q;
    if (this.set('hp', s.hp)) { const e = q('[data-s=hp]'); e.querySelector('b').textContent = s.hp; e.querySelector('i').style.width = s.hp + '%'; e.classList.toggle('low', s.hp <= 30); }
    if (this.set('ar', s.ar + '|' + s.hm)) { const e = q('[data-s=ar]'); e.querySelector('b').textContent = s.ar; e.querySelector('i').style.width = s.ar + '%'; q('[data-k=hm]').textContent = s.hm ? '+cap' : ''; }
    if (this.set('mo', s.mo)) q('[data-k=mo]').textContent = '$' + s.mo;
    if (this.set('wn', s.wn)) q('[data-k=wn]').textContent = s.wn;
    if (this.set('mag', s.mag + '|' + s.res + '|' + s.rl)) { q('[data-k=mag]').textContent = s.mag < 0 ? '' : s.mag; q('[data-k=res]').textContent = s.mag < 0 ? '' : '/ ' + s.res + (s.rl ? ' ↻' : ''); }
    if (this.set('sc', s.sc + '|' + s.al)) { q('.tA').firstChild.nodeValue = s.sc[0]; q('.tB').firstChild.nodeValue = s.sc[1]; q('[data-a="0"]').textContent = '●'.repeat(s.al[0]); q('[data-a="1"]').textContent = '●'.repeat(s.al[1]); }
    if (this.set('tm', s.tm)) q('[data-k=tm]').textContent = s.tm;
    if (this.set('ph', s.ph + '|' + s.rd)) { q('[data-k=ph]').textContent = s.ph; q('[data-k=rd]').textContent = s.rd; }
    // mira dinâmica
    const g = Math.max(3, Math.min(90, s.gap));
    if (this.set('gap', Math.round(g))) { const x = q('.xh'); x.querySelector('.l').style.left = -g - 9 + 'px'; x.querySelector('.r').style.left = g + 'px'; x.querySelector('.u').style.top = -g - 9 + 'px'; x.querySelector('.d').style.top = g + 'px'; }
    const showX = !s.scoped && !s.dead && !s.fixed;
    if (this.set('xh', showX)) q('.xh').style.display = showX ? 'block' : 'none';
    if (this.set('fx', !!s.fixed && !s.scoped)) q('.fixedxh').style.display = s.fixed && !s.scoped ? 'block' : 'none';
    if (this.set('scope', s.scoped)) q('.scope').style.display = s.scoped ? 'block' : 'none';
    if (this.set('spec', s.spec || '')) { const e = q('.spec'); e.style.display = s.spec ? 'block' : 'none'; e.innerHTML = s.spec || ''; }
    if (s.fps !== undefined && this.set('fps', s.fps)) q('.fps').innerHTML = s.fps;
  }

  /* ---- placar ---- */
  scoreboard(show, world, meId, myTeam) {
    this.sb.style.display = show ? 'block' : 'none';
    if (!show || !world) return;
    const rows = (t) => world.ps.filter((p) => p.t === t).sort((a, b) => b.k - a.k).map((p) => `<tr class="${p.i === meId ? 'me' : ''} ${p.al ? '' : 'dead'}"><td>${esc(p.n)}${p.b ? ' 🤖' : ''}</td><td>${p.k}</td><td>${p.d}</td><td>${p.as}</td><td>${p.dm}</td><td>${t === myTeam ? '$' + p.mo : '-'}</td><td>${p.b ? '-' : p.pg}</td></tr>`).join('');
    const tb = (t) => `<h4 class="t${t}">${TEAM[t].toUpperCase()} — ${world.sc[t]}</h4><table><tr><th>Jogador</th><th>Abates</th><th>Mortes</th><th>Assist.</th><th>Dano</th><th>Dinheiro</th><th>Ping</th></tr>${rows(t)}</table>`;
    const html = tb(0) + tb(1);
    if (this.cache.sbh !== html) { this.cache.sbh = html; this.sb.innerHTML = html; }
  }

  /* ---- loja ---- */
  openShop(on) {
    this.shopOpen = on; this.shop.classList.toggle('hide', !on);
    if (on) this.renderShop(); 
  }
  renderShop() {
    const y = this.app.you || { mo: 0, inv: {}, ar: 0, hm: 0 };
    const own = (id) => (W[id] && (y.inv.primary === id || y.inv.secondary === id)) || (id === 'vest' && y.ar >= 100) || (id === 'vesthelm' && y.ar >= 100 && y.hm) || (id === 'medkit' && y.inv.medkit > 0);
    const list = Object.values({ ...W, ...ITEMS }).filter((d, i, a) => d.cat === this.cat && d.id !== 'knife' && a.findIndex((x) => x.id === d.id) === i);
    const stat = (d) => d.dmg ? `<div class="st">Dano ${d.dmg}${d.pel > 1 ? '×' + d.pel : ''} · ${d.rpm || '-'} rpm · pente ${d.mag}</div><div class="b"><i style="width:${Math.min(100, (d.dmg * (d.pel || 1)) / 1.3)}%"></i></div><div class="b"><i style="width:${Math.min(100, (d.rpm || 0) / 9)}%"></i></div><div class="b"><i style="width:${Math.min(100, d.range / 2)}%"></i></div>` : `<div class="st">${{ vest: 'Reduz dano de balas e absorve até acabar.', vesthelm: 'Colete + capacete: reduz também o dano na cabeça.', medkit: 'Cura gradual (~3,5 s). Cancela se tomar dano. Tecla H.', frag: 'Dano em raio, com linha de visão.', smoke: 'Bloqueia a visão por 18 s.', flash: 'Cega quem olhar para ela.' }[d.id] || ''}</div>`;
    this.shop.innerHTML = `<div class="box panel"><div class="hd"><b>Loja</b><span class="cash">$${y.mo}</span><button class="btn g sm" data-x="close">Fechar (${esc(bindLabel('shop'))})</button></div>
      <div class="tabs">${SHOP_CATS.map(([id, n]) => `<button data-c="${id}" class="${id === this.cat ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="grid">${list.map((d) => { const price = d.id === 'vesthelm' && y.ar >= 100 && !y.hm ? 350 : d.price; return `<div class="card ${y.mo < price ? 'no' : ''} ${own(d.id) ? 'own' : ''}" data-i="${d.id}"><span class="p">$${price}</span><h5>${esc(d.name)}</h5>${stat(d)}${own(d.id) ? '<div class="st" style="color:#86efac">✔ Você possui</div>' : ''}</div>`; }).join('')}</div>
      <p style="color:#8ea0b7;font-size:12px;margin:10px 0 0">${this.app.phase === 'buy' ? 'Fase de compra ativa.' : 'Compras só são permitidas na fase de compra.'}</p></div>`;
    this.shop.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { this.cat = b.dataset.c; this.renderShop(); this.app.audio.play('ui'); }));
    this.shop.querySelectorAll('.card').forEach((c) => (c.onclick = () => this.app.buy(c.dataset.i)));
    $(this.shop, '[data-x=close]').onclick = () => this.app.closeShop();
  }
  shopFeedback(item, ok) {
    const c = this.shop.querySelector(`.card[data-i="${item}"]`);
    if (c) { c.classList.remove('flash-ok', 'flash-no'); void c.offsetWidth; c.classList.add(ok ? 'flash-ok' : 'flash-no'); }
    if (ok && this.shopOpen) setTimeout(() => this.renderShop(), 350);
  }

  /* ---- minimapa ---- */
  buildMinimap(map) {
    const S = 3, N = 96, cv = document.createElement('canvas'); cv.width = cv.height = N * S; const x = cv.getContext('2d');
    x.fillStyle = '#10161f'; x.fillRect(0, 0, cv.width, cv.height);
    for (const s of map.solids) {
      if (s.y1 <= 0.01) continue;
      const tall = s.y1 > 3.5;
      x.fillStyle = tall ? '#8795ab' : s.m === 'crate' ? '#a98458' : s.k === 'r' ? '#6f7f95' : s.m.startsWith('site') ? '#3b4a62' : '#56627a';
      x.fillRect((s.x0 + N / 2) * S, (s.z0 + N / 2) * S, (s.x1 - s.x0) * S, (s.z1 - s.z0) * S);
    }
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center';
    for (const st of map.sites) x.fillText(st.name, (st.x + N / 2) * S, (st.z + N / 2) * S + 8);
    this.mapCv = cv; this.mapS = S; this.mapN = N;
  }
  drawMinimap(me, world, spotted, myTeam) {
    if (!this.mapCv) return;
    const c = this.mini, S = this.mapS, N = this.mapN;
    c.clearRect(0, 0, 190, 190);
    c.save(); c.translate(95, 95); c.rotate(me.yaw); c.translate(-me.x * S, -me.z * S);
    c.drawImage(this.mapCv, -N / 2 * S, -N / 2 * S);
    for (const s of world.sm) { c.fillStyle = 'rgba(200,200,200,.55)'; c.beginPath(); c.arc(s[0] * S, s[2] * S, 3.8 * S, 0, 7); c.fill(); }
    for (const p of world.ps) {
      if (p.i === me.id) continue;
      const ally = p.t === myTeam;
      if (!ally && !spotted.has(p.i)) continue;
      c.fillStyle = !p.al ? '#555' : p.t === 0 ? '#60a5fa' : '#fb923c';
      c.beginPath(); c.arc(p.x * S, p.z * S, ally ? 4 : 5, 0, 7); c.fill();
    }
    c.restore();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(95, 86); c.lineTo(100, 102); c.lineTo(95, 98); c.lineTo(90, 102); c.closePath(); c.fill();
  }
}
