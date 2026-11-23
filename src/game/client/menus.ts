// @ts-nocheck
/**
 * Menus: principal (offline/online), amigos (ID/nome, pedidos, convites), lobby de sala
 * (times, pronto, chat, convidar) e configurações (controles, sensibilidade, FOV, volume, qualidade, teclas).
 */
import { settings, saveSettings, DEFAULT_BINDS, BIND_LABELS, keyLabel, DEFAULTS } from './settings';
import { THEMES } from '../shared/map';
import { DIFFS } from '../shared/weapons';
import { $, TEAM } from './ui';
import { SKINS, clampSkin } from '../shared/skins';
import { CharPreview } from './preview';
import { openLayoutEditor } from './layoutEditor';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ST = { online: 'Online', offline: 'Offline', lobby: 'Em sala', match: 'Em partida' };

export class Menus {
  constructor(root, app) {
    this.app = app; this.root = root;
    this.cfg = { mode: 2, diff: 1, theme: 'day', size: 0 };
    this.menu = document.createElement('div'); this.menu.className = 'menu ui-block'; root.appendChild(this.menu);
    this.status = document.createElement('div'); this.status.className = 'status'; root.appendChild(this.status);
    this.setStatus('closed');
    this.preview = null; this.installEvt = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installEvt = e; const b = this.menu.querySelector('[data-x=install]'); if (b) b.style.display = ''; });
    window.addEventListener('appinstalled', () => { this.installEvt = null; const b = this.menu.querySelector('[data-x=install]'); if (b) b.style.display = 'none'; });
  }
  disposePreview() { if (this.preview) { this.preview.dispose(); this.preview = null; } }
  setStatus(s) {
    this.status.className = 'status ' + (s === 'open' ? 'ok' : 'bad');
    this.status.textContent = s === 'open' ? `● Servidor online · ping ${this.app.net.ping}ms` : s === 'connecting' ? '○ Conectando ao servidor…' : '● Sem servidor (offline funciona)';
  }
  show(on) { this.menu.style.display = on ? 'block' : 'none'; this.status.style.display = on ? 'block' : 'none'; if (!on) this.disposePreview(); }

  seg(name, opts, val) {
    return `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  }
  bindSeg(root, fn) {
    root.querySelectorAll('[data-seg]').forEach((s) => s.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      s.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); fn(s.dataset.seg, b.dataset.v);
    })));
  }
  cfgControls(host) {
    const c = this.cfg;
    return `<div class="row"><label>Modo</label>${this.seg('mode', [[1, '1v1'], [2, '2v2'], [3, '3v3'], [4, '4v4']], c.mode)}</div>
      <div class="row"><label>Mapa</label><select data-f="theme">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}" ${k === c.theme ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
      <select data-f="size"><option value="0">Tamanho: automático</option><option value="24" ${c.size === 24 ? 'selected' : ''}>Pequeno (1v1)</option><option value="32" ${c.size === 32 ? 'selected' : ''}>Médio (2v2–3v3)</option><option value="40" ${c.size === 40 ? 'selected' : ''}>Completo (4v4)</option></select></div>
      <div class="row"><label>Bots</label>${this.seg('diff', DIFFS.map((d, i) => [i, d.name]), c.diff)}</div>`;
  }

  /* ---------------- Menu principal (lobby) ---------------- */
  main() {
    const a = this.app, id = a.identity;
    this.disposePreview();
    this.root.appendChild(this.status); // tira o status do DOM que vai ser recriado
    this.screen = 'main';
    const sk0 = clampSkin(settings.skin), hex = (n) => '#' + n.toString(16).padStart(6, '0');
    const standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
    this.menu.innerHTML = `<div class="lbx">
      <header class="lb-top">
        <div class="lb-logo"><h1>BASTIÃO</h1><small>FPS TÁTICO</small></div>
        <div class="lb-top-r"><span data-slot="status"></span>
          <button class="ib" data-x="install" style="display:none" title="Instalar app">⬇</button>
          <button class="ib" data-x="fs" title="Tela cheia">⛶</button>
          <button class="ib" data-x="help" title="Como jogar">?</button>
          <button class="ib" data-x="settings" title="Configurações">⚙</button></div>
      </header>
      <div class="lb-body">
        <section class="lb-col">
          <div class="card"><h3>Perfil</h3>
            <div class="prow"><label>Nome</label><input data-x="name" value="${esc(id.name)}" maxlength="16"></div>
            <div class="prow"><label>ID</label><span class="idchip" data-x="id" title="Toque para copiar">${esc(id.id || '------')}</span></div></div>
          <div class="card"><h3>Visual</h3>
            <button class="skbtn" data-x="skins"><div class="fig"><i style="background:${hex(SKINS[sk0].skin)};${SKINS[sk0].accColor != null ? `box-shadow:0 -5px 0 ${hex(SKINS[sk0].accColor)}` : ''}"></i><b></b><u style="background:${hex(SKINS[sk0].legs)}"></u></div><div class="skbtn-t"><strong>👕 Skins</strong><small data-x="skname">${SKINS[sk0].name}</small></div><span class="skbtn-go">›</span></button></div>
        </section>
        <section class="lb-stage">
          <div class="stage-view" data-x="stage">
            <div class="nametag"><b data-x="nm">${esc(id.name)}</b><small data-x="skn">${SKINS[sk0].name}</small></div>
          </div>
          <div class="play">
            <button class="bigplay" data-x="offline"><span>▶ JOGAR</span><small data-x="sum"></small></button>
            <div class="online"><button class="btn" data-x="create">🌐 Criar sala</button>
              <input data-x="code" placeholder="CÓDIGO" maxlength="6"><button class="btn g" data-x="join">Entrar</button></div>
          </div>
        </section>
        <section class="lb-col">
          <div class="tabs"><button class="on" data-tab="match">Partida</button><button data-tab="friends">Amigos <i data-x="badge" style="display:none"></i></button></div>
          <div class="card grow" data-pane="match"><h3>Configurar partida</h3><div data-cfg>${this.cfgControls()}</div>
            <p class="hint">Online: crie uma sala e passe o código aos amigos. Vagas vazias viram bots.</p></div>
          <div class="card grow" data-pane="friends" style="display:none"><h3>Amigos</h3>
            <div class="prow"><input data-x="fadd" placeholder="ID ou nome do amigo"><button class="btn sm" data-x="fbtn">Adicionar</button></div>
            <div data-friends></div></div>
        </section>
      </div></div>`;
    const m = this.menu;
    $(m, '[data-slot=status]').appendChild(this.status);
    if (this.installEvt && !standalone) $(m, '[data-x=install]').style.display = '';

    // resumo no botão JOGAR
    const sum = () => { const c = this.cfg; $(m, '[data-x=sum]').textContent = `contra bots · ${c.mode}v${c.mode} · ${(THEMES[c.theme] || {}).name || ''} · ${DIFFS[c.diff].name}`; };
    sum();
    this.bindSeg(m, (k, v) => { this.cfg[k] = +v; sum(); });
    m.querySelector('[data-f=theme]').onchange = (e) => { this.cfg.theme = e.target.value; sum(); };
    m.querySelector('[data-f=size]').onchange = (e) => (this.cfg.size = +e.target.value);

    // ações
    $(m, '[data-x=offline]').onclick = () => a.startOffline({ ...this.cfg });
    $(m, '[data-x=create]').onclick = () => a.roomCmd({ op: 'create', mode: this.cfg.mode, theme: this.cfg.theme, diff: this.cfg.diff });
    const join = () => { const c = $(m, '[data-x=code]').value.trim(); if (!c) return a.hud.toast('Digite o código da sala', 'e'); a.roomCmd({ op: 'join', code: c }); };
    $(m, '[data-x=join]').onclick = join; $(m, '[data-x=code]').onkeydown = (e) => { if (e.key === 'Enter') join(); };
    $(m, '[data-x=name]').onchange = (e) => { a.setName(e.target.value); $(m, '[data-x=nm]').textContent = a.identity.name; };
    $(m, '[data-x=id]').onclick = () => { try { navigator.clipboard.writeText(a.identity.id); a.hud.toast('ID copiado!'); } catch { a.hud.toast('ID: ' + a.identity.id); } };
    $(m, '[data-x=settings]').onclick = () => this.settings();
    $(m, '[data-x=help]').onclick = () => a.hud.showHelp(true);
    $(m, '[data-x=fs]').onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* */ } };
    $(m, '[data-x=install]').onclick = () => { const ev = this.installEvt; if (!ev) return; ev.prompt(); ev.userChoice.finally(() => { this.installEvt = null; $(m, '[data-x=install]').style.display = 'none'; }); };

    // abas Partida / Amigos
    m.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
      m.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      m.querySelectorAll('[data-pane]').forEach((p) => (p.style.display = p.dataset.pane === b.dataset.tab ? '' : 'none'));
    }));
    const add = () => { const i = $(m, '[data-x=fadd]'); if (i.value.trim()) { a.net.send({ t: 'friend', op: 'add', who: i.value.trim() }); i.value = ''; } };
    $(m, '[data-x=fbtn]').onclick = add; $(m, '[data-x=fadd]').onkeydown = (e) => { if (e.key === 'Enter') add(); };

    // boneco 3D do lobby + tela de Skins
    this.initLobbyPreview();
    $(m, '[data-x=skins]').onclick = () => this.skins();
    this.friends();
  }

  /** Lista de amigos (reutilizada no menu e no lobby). */
  friends() {
    const host = this.menu.querySelector('[data-friends]');
    if (!host) return;
    const s = this.app.social || { friends: [], inc: [], out: [] }, inRoom = !!this.app.room;
    host.innerHTML = [
      ...s.inc.map((f) => `<div class="friend"><span class="n">${esc(f.name)} <small>${f.id}</small></span><button class="btn ok sm" data-a="accept" data-id="${f.id}">Aceitar</button><button class="btn r sm" data-a="decline" data-id="${f.id}">Recusar</button></div>`),
      ...s.friends.map((f) => `<div class="friend"><i class="dot ${f.st}"></i><span class="n">${esc(f.name)} <small>${f.id}</small></span><small>${ST[f.st]}</small>${inRoom && f.st === 'online' ? `<button class="btn sm" data-a="invite" data-id="${f.id}">Convidar</button>` : ''}<button class="btn g sm" data-a="remove" data-id="${f.id}" title="Remover">✕</button></div>`),
      ...s.out.map((f) => `<div class="friend"><i class="dot"></i><span class="n">${esc(f.name)}</span><small>pedido enviado</small></div>`),
    ].join('') || '<p style="color:#8ea0b7;font-size:13px">Nenhum amigo ainda. Adicione pelo ID ou nome.</p>';
    const bd = this.menu.querySelector('[data-x=badge]'); if (bd) { bd.textContent = s.inc.length; bd.style.display = s.inc.length ? '' : 'none'; }
    host.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const op = b.dataset.a, id = b.dataset.id;
      if (op === 'invite') this.app.roomCmd({ op: 'invite', who: id }); else this.app.net.send({ t: 'friend', op, who: id });
    }));
  }

  /* ---------------- Lobby ---------------- */
  lobby() {
    const a = this.app, r = a.room;
    if (!r) return this.main();
    if (this.screen !== 'lobby') { this.disposePreview(); this.root.appendChild(this.status); }
    const me = r.players.find((p) => p.id === a.identity.id), host = r.host === a.identity.id;
    if (this.screen !== 'lobby') {
      this.screen = 'lobby';
      this.menu.innerHTML = `<div class="wrap"><div class="logo"><h1>SALA</h1><small>aguardando jogadores</small></div>
        <div><div class="panel"><h3>Código da sala</h3><div class="row"><span class="idchip" data-x="rc" style="font-size:26px"></span><small style="color:#8ea0b7">compartilhe ou convide amigos</small></div>
          <div data-lcfg></div><div class="teams" data-teams style="margin-top:10px"></div>
          <div class="row" data-btns></div></div>
          <div class="panel" style="margin-top:14px"><h3>Chat da sala</h3><div class="chatbox" data-chat></div><input data-chat-in data-chat="1" placeholder="Digite e pressione Enter" maxlength="140" style="width:100%"></div></div>
        <div><div class="panel"><h3>Convidar amigos</h3><div data-friends></div></div></div></div>`;
      const ci = $(this.menu, '[data-chat-in]');
      ci.onkeydown = (e) => { if (e.key === 'Enter' && ci.value.trim()) { a.net.chat(ci.value.trim()); ci.value = ''; } };
      this.cfgDone = '';
    }
    const m = this.menu;
    $(m, '[data-x=rc]').textContent = r.code;
    $(m, '[data-x=rc]').onclick = () => { try { navigator.clipboard.writeText(r.code); a.hud.toast('Código copiado!'); } catch { /* */ } };
    const cfgKey = [host, r.mode, r.theme, r.diff, r.size].join();
    if (this.cfgDone !== cfgKey) {
      this.cfgDone = cfgKey;
      this.lcfg = { mode: r.mode, theme: r.theme, diff: r.diff, size: r.size === 'auto' ? 0 : r.size };
      const save = () => a.roomCmd({ op: 'config', ...this.lcfg });
      const box = $(m, '[data-lcfg]');
      const cc = this.cfg; this.cfg = this.lcfg; box.innerHTML = this.cfgControls(); this.cfg = cc;
      box.querySelectorAll('button,select').forEach((e) => (e.disabled = !host));
      this.bindSeg(box, (k, v) => { this.lcfg[k] = +v; save(); });
      box.querySelector('[data-f=theme]').onchange = (e) => { this.lcfg.theme = e.target.value; save(); };
      box.querySelector('[data-f=size]').onchange = (e) => { this.lcfg.size = +e.target.value; save(); };
    }
    $(m, '[data-teams]').innerHTML = [0, 1].map((t) => `<div class="team t${t}"><h4>${TEAM[t].toUpperCase()} (${r.players.filter((p) => p.team === t).length}/${r.mode})</h4>${r.players.filter((p) => p.team === t).map((p) => `<div class="pl"><span>${esc(p.name)} ${p.host ? '👑' : ''}</span><small style="color:#8ea0b7">${p.id}</small><span class="rd ${p.ready ? 'y' : ''}">${p.ready ? 'Pronto' : 'Aguardando'}</span>${host && p.id !== a.identity.id ? `<button class="btn r sm" data-k="${p.id}">✕</button>` : ''}</div>`).join('')}<p style="color:#6b7a90;font-size:12px;margin:4px 0 0">Vagas vazias = bots</p></div>`).join('');
    m.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => a.roomCmd({ op: 'kick', who: b.dataset.k })));
    $(m, '[data-btns]').innerHTML = `<button class="btn g" data-x="team">⇄ Trocar de time</button>${host ? '' : `<button class="btn ${me && me.ready ? 'g' : 'ok'}" data-x="ready">${me && me.ready ? 'Cancelar pronto' : 'Pronto'}</button>`}${host ? '<button class="btn ok" data-x="start">▶ Iniciar partida</button>' : ''}<button class="btn r" data-x="leave">Sair da sala</button>`;
    const b = (x) => $(m, `[data-x=${x}]`);
    b('team').onclick = () => a.roomCmd({ op: 'team', team: me && me.team ? 0 : 1 });
    if (b('ready')) b('ready').onclick = () => a.roomCmd({ op: 'ready' });
    if (b('start')) b('start').onclick = () => a.roomCmd({ op: 'start' });
    b('leave').onclick = () => a.roomCmd({ op: 'leave' });
    this.friends();
  }
  lobbyChat(text, cls) {
    const c = this.menu.querySelector('[data-chat]');
    if (!c) return;
    const d = document.createElement('div'); d.className = cls || ''; d.innerHTML = text; c.appendChild(d); c.scrollTop = c.scrollHeight;
  }

  /* ---------------- Configurações ---------------- */
  initLobbyPreview() {
    this.disposePreview();
    const host = this.menu.querySelector('[data-x=stage]'); if (!host) return;
    try { this.preview = new CharPreview(host); this.preview.setLook(clampSkin(settings.skin)); this.preview.start(); } catch { this.preview = null; }
  }

  /** Tela de Skins: grade grande + prévia 3D; "Equipar" aplica, "Voltar" descarta. */
  skins() {
    const a = this.app, hex = (n) => '#' + n.toString(16).padStart(6, '0');
    a.beforeModal();
    this.disposePreview(); // libera o desenho 3D do lobby enquanto esta tela está aberta
    const o = document.createElement('div'); o.className = 'set skwrap ui-block'; this.root.appendChild(o);
    let eq = clampSkin(settings.skin), sel = eq;
    o.innerHTML = `<div class="skw">
      <div class="skw-view" data-x="view"><div class="skw-name"><b data-x="sn"></b><small data-x="ss"></small></div></div>
      <div class="skw-main"><button class="cfg-x" data-x="close" title="Fechar">✕</button>
        <h3 class="cfg-h">Skins</h3>
        <div class="skw-grid">${SKINS.map((k, i) => `<button class="skc" data-sk="${i}"><div class="fig"><i style="background:${hex(k.skin)};${k.accColor != null ? `box-shadow:0 -6px 0 ${hex(k.accColor)}` : ''}"></i><b></b><u style="background:${hex(k.legs)}"></u></div><span>${k.name}</span><em>EQUIPADA</em></button>`).join('')}</div>
        <div class="skw-foot"><button class="btn g" data-x="back">← Voltar</button><button class="btn ok" data-x="equip">✔ Equipar</button></div></div></div>`;
    let pv = null;
    try { pv = new CharPreview($(o, '[data-x=view]')); pv.start(); } catch { pv = null; }
    const upd = () => {
      o.querySelectorAll('[data-sk]').forEach((c) => { const i = +c.dataset.sk; c.classList.toggle('sel', i === sel); c.classList.toggle('eq', i === eq); });
      $(o, '[data-x=sn]').textContent = SKINS[sel].name; $(o, '[data-x=ss]').textContent = sel === eq ? 'Equipada' : 'Toque em Equipar para usar';
      const b = $(o, '[data-x=equip]'); b.disabled = sel === eq;
      if (pv) pv.setLook(sel);
    };
    const close = () => {
      if (pv) pv.dispose();
      o.remove(); a.afterModal();
      const t = this.menu.querySelector('[data-x=skname]'); if (t) t.textContent = SKINS[eq].name;
      const n = this.menu.querySelector('[data-x=skn]'); if (n) n.textContent = SKINS[eq].name;
      this.initLobbyPreview();
    };
    o.querySelectorAll('[data-sk]').forEach((c) => (c.onclick = () => { sel = +c.dataset.sk; upd(); }));
    $(o, '[data-x=equip]').onclick = () => { a.setSkin(sel); eq = sel; upd(); a.hud.toast('Skin equipada: ' + SKINS[eq].name); };
    $(o, '[data-x=back]').onclick = close; $(o, '[data-x=close]').onclick = close;
    upd();
  }

  /** Menu da partida: abre por cima do jogo SEM pausá-lo (a simulação continua rodando). */
  pause() {
    const a = this.app;
    if (a.screen !== 'game' || this.pauseEl) return;
    a.beforeModal();
    const o = (this.pauseEl = document.createElement('div')); o.className = 'set ui-block'; this.root.appendChild(o);
    o.innerHTML = `<div class="box panel pausebox">
      <h2 style="margin:0 0 4px">Menu</h2>
      <p class="hint" style="margin:0 0 12px">O jogo não pausa: a partida continua enquanto este menu está aberto.</p>
      <div class="pcol">
        <button class="btn ok" data-x="close">▶ Continuar</button>
        <button class="btn g" data-x="set">⚙ Configurações</button>
        <button class="btn g" data-x="ctl">🎮 Controles de toque</button>
        <button class="btn g" data-x="help">❓ Como jogar</button>
        <button class="btn g" data-x="fs">⛶ Tela cheia</button>
        <button class="btn r" data-x="quit">🚪 Sair da partida</button>
      </div></div>`;
    const close = () => { if (!this.pauseEl) return; this.pauseEl.remove(); this.pauseEl = null; a.afterModal(); };
    o.onclick = (e) => { if (e.target === o) close(); };
    $(o, '[data-x=close]').onclick = close;
    $(o, '[data-x=set]').onclick = () => this.settings();
    $(o, '[data-x=ctl]').onclick = () => openLayoutEditor(a);
    $(o, '[data-x=help]').onclick = () => { close(); a.hud.showHelp(true); };
    $(o, '[data-x=fs]').onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* */ } };
    const q = $(o, '[data-x=quit]'); let armed = 0;
    q.onclick = () => {
      if (!armed) { armed = setTimeout(() => { armed = 0; q.textContent = '🚪 Sair da partida'; }, 3000); q.textContent = 'Toque de novo para confirmar'; return; }
      clearTimeout(armed); this.dropPause(); a.quitMatch();
    };
  }
  /** Remove o menu da partida sem reabrir o bloqueio do mouse (usado ao sair/terminar a partida). */
  dropPause() { if (this.pauseEl) { this.pauseEl.remove(); this.pauseEl = null; } }

  /** Configurações em abas (menu lateral à esquerda, opções à direita). */
  settings() {
    const a = this.app;
    a.beforeModal();
    const o = document.createElement('div'); o.className = 'set cfgwrap ui-block'; this.root.appendChild(o);
    let tab = Menus.lastTab || 'sens';
    const FMT = { sens: (v) => (+v).toFixed(2), touchSens: (v) => (+v).toFixed(2), fov: (v) => String(Math.round(v)), volume: (v) => Math.round(v * 100) + '%' };
    const fmt = (k, v) => (FMT[k] || String)(v);
    const slider = (k, label, min, max, step) => `<div class="cfg-row"><span class="cfg-l">${label}</span><span class="cfg-v" data-val="${k}">${fmt(k, settings[k])}</span><input class="cfg-r" type="range" min="${min}" max="${max}" step="${step}" value="${settings[k]}" data-r="${k}"></div>`;
    const toggle = (k, label) => `<div class="cfg-row"><span class="cfg-l">${label}</span><label class="cfg-sw"><input type="checkbox" data-c="${k}" ${settings[k] ? 'checked' : ''}><i></i></label></div>`;
    const segRow = (k, label, opts, note = '') => `<div class="cfg-row"><span class="cfg-l">${label}</span><div class="cfg-ctl">${this.seg(k, opts, settings[k])}${note}</div></div>`;
    const TABS = [['sens', 'Sensibilidade'], ['gfx', 'Gráfico'], ['kbm', 'Teclado e mouse'], ['ctl', 'Controles'], ['snd', 'Som']];
    const panel = () => ({
      sens: slider('sens', 'Mouse', 0.2, 4, 0.05) + slider('touchSens', 'Toque (arrastar na tela)', 0.3, 3, 0.05),
      gfx: segRow('quality', 'Qualidade', [['auto', 'Auto'], ['low', 'Baixa'], ['medium', 'Média'], ['high', 'Alta']])
        + segRow('style', 'Estilo visual', [['blocks', 'Blocos'], ['classic', 'Realista']], '<small class="cfg-note">vale na próxima partida</small>')
        + slider('fov', 'Campo de visão (FOV)', 60, 110, 1) + toggle('fps', 'Mostrar FPS e ping') + toggle('blood', 'Efeito de sangue'),
      kbm: `<div class="cfg-note" style="margin-bottom:8px">Clique em uma ação e aperte a nova tecla para remapear.</div><div class="kb">${Object.keys(DEFAULT_BINDS).map((k) => `<div><span>${BIND_LABELS[k]}</span><button class="btn g sm" data-b="${k}">${esc(keyLabel(settings.binds[k]))}</button></div>`).join('')}</div>`,
      ctl: segRow('control', 'Tipo de controle', [['auto', 'Automático'], ['kbm', 'Teclado e mouse'], ['touch', 'Toque']])
        + `<div class="cfg-row"><span class="cfg-l">Botões de toque</span><button class="cfg-btn" data-x="edit">🎮 Personalizar</button></div>`,
      snd: slider('volume', 'Volume geral', 0, 1, 0.02),
    })[tab];
    const title = Object.fromEntries(TABS)[tab];
    const render = () => {
      Menus.lastTab = tab;
      o.innerHTML = `<div class="cfg">
        <aside class="cfg-side"><div class="cfg-title">Configuração</div>${TABS.map(([id, l]) => `<button class="cfg-tab ${id === tab ? 'on' : ''}" data-tab="${id}">${l}</button>`).join('')}</aside>
        <main class="cfg-main"><button class="cfg-x" data-x="close" title="Fechar">✕</button>
          <section class="cfg-panel"><h3 class="cfg-h">${Object.fromEntries(TABS)[tab]}</h3>${panel()}</section>
          <div class="cfg-foot"><button class="cfg-reset" data-x="reset">Reiniciar</button></div></main></div>`;
      const paint = (r) => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      o.querySelectorAll('.cfg-tab').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
      this.bindSeg(o, (k, v) => { settings[k] = v; saveSettings(); a.applySettings(k); if (k === 'control') a.input.applyMode(); });
      o.querySelectorAll('[data-r]').forEach((r) => { paint(r); r.oninput = () => { const k = r.dataset.r; settings[k] = +r.value; o.querySelector(`[data-val=${k}]`).textContent = fmt(k, r.value); paint(r); saveSettings(); a.applySettings(k); }; });
      o.querySelectorAll('[data-c]').forEach((c) => (c.onchange = () => { settings[c.dataset.c] = c.checked; saveSettings(); }));
      o.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => {
        b.textContent = 'Pressione uma tecla…';
        a.input.hooks.capture = (e) => {
          e.preventDefault(); e.stopPropagation();
          a.input.hooks.capture = null;
          if (e.code !== 'Escape') {
            const act = b.dataset.b, old = settings.binds[act];
            for (const [k, v] of Object.entries(settings.binds)) if (v === e.code && k !== act) settings.binds[k] = old;
            settings.binds[act] = e.code; saveSettings(); a.input.rebuild(); a.hud.buildKeybar();
          }
          render(); return true;
        };
      }));
      const ed = o.querySelector('[data-x=edit]'); if (ed) ed.onclick = () => openLayoutEditor(a);
      // Reiniciar: volta ao padrão só as opções da aba aberta
      $(o, '[data-x=reset]').onclick = () => {
        const keys = { sens: ['sens', 'touchSens'], gfx: ['quality', 'style', 'fov', 'fps', 'blood'], ctl: ['control'], snd: ['volume'] }[tab] || [];
        for (const k of keys) settings[k] = DEFAULTS[k];
        if (tab === 'ctl') settings.touchLayout = {};
        if (tab === 'kbm') settings.binds = { ...DEFAULT_BINDS };
        saveSettings(); for (const k of keys) a.applySettings(k);
        if (tab === 'ctl') { a.input.applyMode(); if (a.touch) a.touch.applyLayout(); }
        if (tab === 'kbm') { a.input.rebuild(); a.hud.buildKeybar(); }
        render(); a.hud.toast('Opções restauradas ao padrão');
      };
      $(o, '[data-x=close]').onclick = () => { o.remove(); a.afterModal(); };
    };
    render();
  }
}
