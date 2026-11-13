// LifeGame 3.0.2 Service Worker — обновляет кэш GitHub Pages без потери localStorage пользователя!
const CACHE_NAME = 'lifegame-v3.0.2';
const ASSETS = [
  "./",
  "./index.html",
  "./fonts.css",
  "./styles.css",
  "./data.js",
  "./kernel.js",
  "./companion-avatar.js",
  "./companion-db.js",
  "./views-core.js",
  "./views-extras.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return resp;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
  );
});
