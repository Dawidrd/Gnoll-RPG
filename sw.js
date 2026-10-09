// Offline support: keep the app shell and fonts cached. Bump VERSION when files change.
const VERSION = "gnoll-0.2.0";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./css/app.css",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./js/main.js", "./js/config.js", "./js/dom.js", "./js/i18n.js", "./js/store.js", "./js/glossary.js",
  "./js/lang/pl.js", "./js/lang/en.js",
  "./js/rules/core.js", "./js/rules/index.js", "./js/rules/species.js", "./js/rules/backgrounds.js", "./js/rules/classes/monk.js",
  "./js/views/home.js", "./js/views/form.js", "./js/views/sheet.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Stale-while-revalidate: answer from cache at once, refresh it in the background.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (e.request.method !== "GET" || (url.origin !== location.origin && !fonts)) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: url.origin === location.origin });
    const net = fetch(e.request).then((res) => { if (res.ok || res.type === "opaque") cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
