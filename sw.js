// Offline cache so Numera works without a connection once installed.
const CACHE = 'numera-v3';
const FILES = ['./', './index.html', './css/app.css', './js/util.js', './js/skills.js', './js/engine.js', './js/sim.js', './js/fx.js', './js/whiteboard.js', './js/store.js', './js/app.js', './manifest.webmanifest', './icons/icon.svg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
