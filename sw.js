/* Service worker de Mis Finanzas — sube el número de versión al actualizar la app */
const CACHE = 'mis-finanzas-v29';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Solo gestionamos archivos propios; Firebase y CDNs van directo a la red.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');
  if (isHTML) {
    // La app (HTML) va primero a la red para tener siempre la última versión; si no hay red, usa la copia guardada.
    e.respondWith(
      fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Íconos/recursos: primero la copia guardada (rápido), y si no, la red.
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; }))
    );
  }
});
