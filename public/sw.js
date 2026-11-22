/* Service worker do BASTIÃO: permite instalar como app e abrir o modo offline (bots).
 * O multiplayer usa WebSocket (/game-ws), que o service worker nunca intercepta. */
const VERSION = "v1";
const SHELL = `bastiao-shell-${VERSION}`;
const STATIC = `bastiao-static-${VERSION}`;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, STATIC].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/game-ws")) return;

  // Páginas: rede primeiro (sempre pega a versão nova); sem rede, usa o app em cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put("/", copy)); }
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  // Arquivos com hash do Next (imutáveis) e ícones: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Resto: usa o cache enquanto atualiza em segundo plano.
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
