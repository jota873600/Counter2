/** Inicia o servidor multiplayer (WebSocket) junto com o servidor Next.js. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const mod = await import("./server/gameServer");
    mod.startGameServer();
  }
}
