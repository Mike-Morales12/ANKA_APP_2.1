// Service worker de ANKA — cachea el "app shell" para que abra instantáneo y funcione
// sin conexión. Como ANKA no llama a ningún servidor (todo vive en localStorage), esto
// es simplemente cachear el HTML/manifest/íconos; no hay datos dinámicos que sincronizar.
//
// Cómo publicar una actualización:
// Cada vez que subas un index.html nuevo, sube también este archivo con CACHE_VERSION
// incrementado (ej. 'anka-v1-5-0' -> 'anka-v1-5-1'). Eso hace que los navegadores que
// ya tenían ANKA instalada detecten la versión nueva y le avisen al usuario para que
// la actualice (ver el mensaje "Hay una nueva versión de ANKA disponible" en index.html).
// Si NO subes este archivo con la versión cambiada, los navegadores van a seguir
// sirviendo el HTML viejo desde caché aunque el index.html en GitHub ya esté actualizado.
const CACHE_VERSION = 'anka-v1-5-0b';
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
  // OJO: ya NO se llama self.skipWaiting() aquí a propósito. Antes, el service worker
  // nuevo tomaba control de inmediato y sin avisar; ahora se queda "esperando" hasta que
  // el usuario confirme el aviso de "Hay una nueva versión disponible" en index.html,
  // que es quien le manda el mensaje SKIP_WAITING cuando la persona toca "Actualizar".
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
