// Service worker GéoPlan (PWA niveau 1)
// Stratégie SÛRE pour une app qui se met à jour souvent :
//  - Navigation (HTML) : RÉSEAU D'ABORD → toujours la dernière version en ligne ; cache en secours si hors-ligne.
//  - Autres GET same-origin (favicon, icônes, css/js locaux) : stale-while-revalidate (rapide + mise à jour en arrière-plan).
//  - API (/api/...) et domaines externes (CDN, tuiles carte, OSRM, Webfleet) : jamais interceptés → comportement navigateur normal.
const CACHE = 'geoplan-v2';
const CORE = ['/', 'favicon.svg', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // CDN / tuiles carte / autres domaines : laisser le navigateur gérer
  if (url.pathname.startsWith('/api/')) return;        // API : jamais de cache

  // Navigation (chargement de l'app) : réseau d'abord, cache en secours (hors-ligne)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE); c.put('/', net.clone());
        return net;
      } catch (err) {
        return (await caches.match('/')) || (await caches.match(req)) || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // Autres ressources same-origin : stale-while-revalidate
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const netP = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return cached || (await netP) || new Response('', { status: 504 });
  })());
});
