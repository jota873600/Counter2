// @ts-nocheck
/**
 * Menus: principal (offline/online), amigos (ID/nome, pedidos, convites), lobby de sala
 * (times, pronto, chat, convidar) e configurações (controles, sensibilidade, FOV, volume, qualidade, teclas).
 */
import { settings, saveSettings, DEFAULT_BINDS, BIND_LABELS, keyLabel } from './settings';
import { THEMES } from '../shared/map';
import { DIFFS } from '../shared/weapons';
import { $, TEAM } from './ui';
import { SKINS, clampSkin } from '../shared/skins';
import { CharPreview } from './preview';

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
          <div class="card grow"><h3>Skins <small data-x="skname">${SKINS[sk0].name}</small></h3>
            <div class="skgrid">${SKINS.map((k, i) => `<button class="skt ${i === sk0 ? 'on' : ''}" data-sk="${i}"><div class="fig"><i style="background:${hex(k.skin)};${k.accColor != null ? `box-shadow:0 -4px 0 ${hex(k.accColor)}` : ''}"></i><b></b><u style="background:${hex(k.legs)}"></u></div><span>${k.name}</span></button>`).join('')}</div></div>
        </section>
        <section class="lb-stage">
          <div class="stage-view" data-x="stage">
            <button class="arr l" data-x="prev">‹</button><button class="arr r" data-x="next">›</button>
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

    // skins + boneco 3D
    try { this.preview = new CharPreview($(m, '[data-x=stage]')); this.preview.setLook(sk0); this.preview.start(); } catch { this.preview = null; }
    const pick = (i) => {
      i = (i + SKINS.length) % SKINS.length; a.setSkin(i);
      m.querySelectorAll('[data-sk]').forEach((x) => x.classList.toggle('on', +x.dataset.sk === i));
      $(m, '[data-x=skname]').textContent = SKINS[i].name; $(m, '[data-x=skn]').textContent = SKINS[i].name;
      if (this.preview) this.preview.setLook(i);
    };
    m.querySelectorAll('[data-sk]').forEach((b) => (b.onclick = () => pick(+b.dataset.sk)));
    $(m, '[data-x=prev]').onclick = () => pick(clampSkin(settings.skin) - 1);
    $(m, '[data-x=next]').onclick = () => pick(clampSkin(settings.skin) + 1);
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
  settings() {
    const a = this.app;
    a.beforeModal();
    const o = document.createElement('div'); o.className = 'set ui-block'; this.root.appendChild(o);
    const render = () => {
      o.innerHTML = `<div class="box panel"><h2 style="margin:0 0 8px">Configurações</h2>
        <div class="row"><label>Controles</label>${this.seg('control', [['auto', 'Automático'], ['kbm', 'Teclado e mouse'], ['touch', 'Toque']], settings.control)}</div>
        <div class="row"><label>Sensibilidade</label><input type="range" min="0.2" max="4" step="0.05" value="${settings.sens}" data-r="sens"><span data-v="sens">${settings.sens}</span></div>
        <div class="row"><label>Sens. toque</label><input type="range" min="0.3" max="3" step="0.05" value="${settings.touchSens}" data-r="touchSens"><span data-v="touchSens">${settings.touchSens}</span></div>
        <div class="row"><label>FOV</label><input type="range" min="60" max="110" step="1" value="${settings.fov}" data-r="fov"><span data-v="fov">${settings.fov}</span></div>
        <div class="row"><label>Volume</label><input type="range" min="0" max="1" step="0.02" value="${settings.volume}" data-r="volume"><span data-v="volume">${Math.round(settings.volume * 100)}%</span></div>
        <div class="row"><label>Qualidade</label>${this.seg('quality', [['low', 'Baixa'], ['medium', 'Média'], ['high', 'Alta']], settings.quality)}</div>
        <div class="row"><label>Estilo</label>${this.seg('style', [['blocks', 'Blocos'], ['classic', 'Realista']], settings.style)}<small style="color:#6b7a90">vale na próxima partida</small></div>
        <div class="row"><label>Mostrar FPS</label><input type="checkbox" data-c="fps" ${settings.fps ? 'checked' : ''}> <label style="min-width:60px;margin-left:16px">Sangue</label><input type="checkbox" data-c="blood" ${settings.blood ? 'checked' : ''}></div>
        <div class="row"><label>Botões toque</label><button class="btn g sm" data-x="edit">Editar posições</button><button class="btn g sm" data-x="reset">Restaurar</button></div>
        <h3 style="margin:14px 0 6px">Teclas (clique para remapear)</h3><div class="kb">${Object.keys(DEFAULT_BINDS).map((k) => `<div><span>${BIND_LABELS[k]}</span><button class="btn g sm" data-b="${k}">${esc(keyLabel(settings.binds[k]))}</button></div>`).join('')}</div>
        <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn g sm" data-x="defaults">Teclas padrão</button><button class="btn" data-x="close">Fechar</button></div></div>`;
      this.bindSeg(o, (k, v) => { settings[k] = v; saveSettings(); a.applySettings(k); if (k === 'control') a.input.applyMode(); });
      o.querySelectorAll('[data-r]').forEach((r) => (r.oninput = () => { const k = r.dataset.r; settings[k] = +r.value; o.querySelector(`[data-v=${k}]`).textContent = k === 'volume' ? Math.round(r.value * 100) + '%' : r.value; saveSettings(); a.applySettings(k); }));
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
      $(o, '[data-x=defaults]').onclick = () => { settings.binds = { ...DEFAULT_BINDS }; saveSettings(); a.input.rebuild(); a.hud.buildKeybar(); render(); };
      $(o, '[data-x=edit]').onclick = () => { a.touch && a.touch.setEdit(true); a.hud.toast('Arraste os botões na tela de jogo. Feche para sair da edição.'); };
      $(o, '[data-x=reset]').onclick = () => a.touch && a.touch.resetLayout();
      $(o, '[data-x=close]').onclick = () => { o.remove(); a.touch && a.touch.setEdit(false); a.afterModal(); };
    };
    render();
  }
}
