/* Cocina Vicuy · Service Worker (PWA) */
const CACHE = 'cocina-vicuy-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(SHELL.map(u =>
        fetch(new Request(u, { mode: 'no-cors' })).then(r => c.put(u, r)).catch(() => {})
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // APIs y base de datos: siempre a la red (no cachear ni interferir)
  const live = ['themealdb.com', 'spoonacular.com', 'firebaseio.com', 'firebasedatabase.app'];
  if (live.some(h => url.hostname.indexOf(h) >= 0)) return;

  // HTML / navegación: PRIMERO LA RED (así ves siempre la última versión), caché solo de respaldo
  const isHTML = req.mode === 'navigate' || req.destination === 'document' ||
                 url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  // Íconos, fuentes y scripts: caché primero (cambian poco)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
