/* Service worker mínimo: Chrome lo exige para beforeinstallprompt.
   No cachea nada; el sistema sigue yendo a la red. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (!String(event.request.url).startsWith("http")) return;
  event.respondWith(fetch(event.request));
});
