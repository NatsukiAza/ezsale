const VERSION = "toque-pwa-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve(VERSION));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener vacío a propósito: Chrome exige un fetch handler para
// installability, pero respondWith(fetch()) en cada request mete un hop
// extra y deja la app (RSC, cookies, force-dynamic) más lenta al scrollear
// y al navegar. La landing no lo nota tanto porque es HTML estático.
self.addEventListener("fetch", () => {});
