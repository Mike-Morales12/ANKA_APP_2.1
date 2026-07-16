// Service worker de ANKA — cachea el "app shell" para que abra instantáneo y funcione
// sin conexión. Como ANKA no llama a ningún servidor (todo vive en localStorage), esto
// es simplemente cachear el HTML/manifest/íconos; no hay datos dinámicos que sincronizar.
//
// Si actualizas index.html y no ves los cambios reflejados tras subir a GitHub Pages,
// sube también este archivo con el número de CACHE_VERSION incrementado en +1 — eso
// fuerza a los navegadores que ya lo instalaron a descargar la versión nueva.
const CACHE_VERSION = 'anka-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
