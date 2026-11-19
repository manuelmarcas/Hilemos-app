// Service worker de los avisos. Tiene que llamarse así y servirse desde la raíz del dominio: es donde
// lo busca el SDK de mensajería de Firebase.
//
// No carga el SDK a propósito: las Cloud Functions mandan mensajes solo de datos (sin bloque
// "notification"), así que el aviso lo compone este fichero. Evita fijar una versión del SDK en un CDN
// y evita el aviso duplicado que sale cuando el navegador pinta uno y el SDK pinta otro.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const d = payload.data || payload;
  if (!d.title && !d.body) return;
  event.waitUntil(self.registration.showNotification(d.title || "Hilemos", {
    body: d.body || "",
    lang: "es",
    tag: d.tag || "votaciones",
    renotify: true,
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of windows) {
      if (!w.url.startsWith(self.location.origin)) continue;
      await w.focus();
      if ("navigate" in w) await w.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
