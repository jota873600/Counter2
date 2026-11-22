# Colocar o BASTIÃO online (multiplayer + PWA)

O jogo já traz o servidor multiplayer (WebSocket em `/game-ws`, mesma porta do site). Para jogar com amigos
basta hospedar **um processo Node que fique sempre ligado**. Não funciona em Vercel/Netlify/serverless
(sem WebSocket persistente, e as salas ficam na memória do processo).

## Opção A — Testar hoje com seus amigos (grátis, do seu PC)
```bash
npm install
npm run build && npm start          # porta 3000
# em outro terminal (instale o cloudflared):
cloudflared tunnel --url http://localhost:3000
```
O Cloudflare imprime um link `https://xxxx.trycloudflare.com` (HTTPS, WebSocket incluso). Mande o link aos amigos.
Seu PC precisa ficar ligado, e a latência dos amigos depende da sua conexão. O link muda a cada execução.

## Opção B — Servidor 24h (Render, Railway, Fly.io ou VPS)
Qualquer um que rode Node/Docker com **WebSocket** e **disco persistente** serve.
- Build: `npm install --include=dev && npm run build`  · Start: `npm start`  · Health check: `/api/health`
- Variáveis: `NODE_ENV=production`; `DATA_DIR=/data` apontando para o disco/volume persistente
  (é onde ficam os IDs e as listas de amigos; sem volume, isso é apagado a cada deploy/reinício).
- Há um `Dockerfile` pronto (usa `/data` como volume).
- Use **uma única instância** (as salas ficam em memória). Evite planos que "dormem" por inatividade: derrubam as salas.
- Escolha a região mais próxima de vocês (ex.: São Paulo) para diminuir o ping.

## PWA (instalar como app)
Precisa de **HTTPS** (todos os hosts acima dão; `localhost` também vale).
- **Android/Chrome:** menu ⋮ → *Instalar app* (ou o aviso que aparece sozinho).
- **Windows/Mac/Linux (Chrome/Edge):** ícone de instalar na barra de endereço → *Instalar*.
- **iPhone/iPad (Safari):** Compartilhar → *Adicionar à Tela de Início*.
Depois de instalado, o modo **offline contra bots** abre mesmo sem internet. O multiplayer exige conexão.

Ao publicar uma versão nova, o service worker atualiza sozinho na próxima abertura. Se mudar a estratégia de cache,
aumente `VERSION` em `public/sw.js`.
