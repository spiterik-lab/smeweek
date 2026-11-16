/* SME Constellation 2.0 service worker: makes the app installable, shows push notifications,
   and keeps the app's own files on the phone so it opens quickly on conference Wi-Fi.
   Nothing from api.php is ever stored here. */
const CACHE = "smec-v2-5";
const SHELL = ["./", "assets/v2/app.css", "assets/v2/core.js", "assets/v2/flow.js", "assets/v2/app.js", "assets/match.js",
  "assets/img/brand-logos.png", "assets/img/swash.webp", "assets/img/icon-192.png", "assets/img/mark.svg", "assets/img/valletta-a.webp", "assets/img/valletta-b.webp", "assets/brief.json"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first, falling back to the saved copy when the connection drops.
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.endsWith(".php") || u.pathname.endsWith("sw.js")) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && r.type === "basic") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
    return r;
  }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || (e.request.mode === "navigate" ? caches.match("./") : Response.error()))));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {title: "SME Constellation", body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "SME Constellation", {
    body: d.body || "", tag: d.tag || "smec", renotify: true, icon: "assets/img/icon-192.png", badge: "assets/img/badge-96.png", data: {url: d.url || "./"}
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    const c = list.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({open: url}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
