# BASTIÃO — FPS tático multiplayer (Three.js + Node/WebSocket)

FPS em primeira pessoa no estilo Counter-Strike, 1v1 a 4v4, com bots, loja, economia, amigos por ID/nome e salas online.
Sem assets externos: modelos, texturas, efeitos e áudio são todos procedurais.

## Instalação e execução

```bash
npm install
npm run dev          # desenvolvimento: cliente + servidor multiplayer (WebSocket em /game-ws) na porta 3000
# ou, produção:
npm run build && npm start
```

Abra http://localhost:3000. O servidor multiplayer autoritativo (30 Hz) sobe junto com o servidor Next.js
(`src/instrumentation.ts` → `src/server/gameServer.ts`), na MESMA porta, no caminho `/game-ws`.
O modo **offline contra bots** roda 100% no navegador (mesma simulação do servidor) e não precisa de servidor.

> Observação: o projeto roda sobre Next.js (App Router) em vez de Vite por causa do ambiente da plataforma;
> o cliente continua sendo HTML + JS (ES modules) + Three.js, e o servidor é Node + `ws`.

## Como testar o multiplayer com dois navegadores
1. Navegador A: abra `http://localhost:3000`, escolha o modo e clique **Criar sala**. Anote o código (ex.: `K7QZ2`).
2. Navegador B (outro navegador ou janela anônima, para ter outro ID local): clique **Entrar na sala** e digite o código.
3. Amigos: no A, copie seu ID (chip azul), no B digite-o em **Amigos → Adicionar** (ou o nome). O A aceita o pedido.
   Depois use **Convidar** na lista de amigos dentro do lobby: o B recebe a notificação e entra com um clique.
4. No B clique **Pronto**; o dono (A) clica **Iniciar partida**. Vagas vazias viram bots. Se alguém sair/cair, um bot assume
   (reconectando com o mesmo ID, o jogador retoma o controle).

## Online e PWA
Veja `DEPLOY.md` para publicar o jogo (multiplayer com amigos) e instalar como app no celular e no PC.

## Estrutura
```
src/
  instrumentation.ts            # inicia o servidor multiplayer junto com o Next
  server/gameServer.ts          # WebSocket: identidade, amigos, salas, convites, loop 30 Hz, desconexão/reconexão
  app/                          # página Next que monta o jogo (GameClient.tsx)
  game/
    shared/                     # código compartilhado cliente/servidor (determinístico)
      weapons.ts                #   armas, preços, economia, recuo, spread, constantes
      map.ts                    #   mapa Bastião (2 objetivos A/B, rampas, escadas, alturas) em 3 tamanhos
      physics.ts                #   cápsula vs AABB/rampas, degraus, raycast, hitboxes por parte do corpo
      sim.ts                    #   simulação autoritativa: rounds, loja, dano, granadas, drops, kit médico
      bots.ts                   #   IA: malha de navegação + A*, visão, mira com erro por dificuldade, compra
    client/
      main.ts                   #   loop, predição/reconciliação, interpolação, eventos, câmera
      world.ts                  #   renderer, luzes/sombras, névoa, céu, pós-processamento, mapa PBR procedural
      models.ts / viewmodel.ts  #   armas com miras abertas, personagens, braços e animações do viewmodel
      fx.ts                     #   partículas, tracers, decalques, cápsulas/estilhaços (cannon-es)
      audio.ts                  #   sons procedurais (Web Audio)
      input.ts / touch.ts       #   teclado/mouse/Pointer Lock/modo borda/detecção de dispositivo; controles de toque
      ui.ts / menus.ts          #   HUD, loja, placar, minimapa; menus, amigos, lobby, configurações
      net.ts / settings.ts      #   WebSocket + transporte offline; configurações e identidade local
scripts/simtest*.ts             # testes headless da simulação (npx esbuild ... | node)
```

## Controles padrão (remapeáveis em Configurações)
WASD mover · Mouse mirar · Clique esq. atirar · Clique dir. mira aberta (sniper: luneta, roda do mouse = zoom; faca: ataque forte)
· R recarregar · Espaço pular · C/Ctrl agachar · Shift andar silencioso · 1–5 armas · G granada · H kit médico · B loja
· E pegar · X largar · Q anterior · Tab placar · Enter chat · F1 ajuda · Esc menu.
Detecção automática do dispositivo (teclado/mouse ↔ toque) ao vivo; se o Pointer Lock falhar (ex.: iframe), aparece o botão
“Abrir em tela cheia / nova aba” e o giro por borda de tela funciona como alternativa.

## Regras
Rounds de eliminação, melhor de 15 (vence quem fizer 8), troca de lados após o 7º round, compra de 15 s, ação de 1:45.
Economia: $800 inicial, abate por tipo de arma, vitória $3250, derrota $1400 + $500 por derrota seguida (máx. $16.000).
Itens persistem se sobreviver; ao morrer perde tudo.
