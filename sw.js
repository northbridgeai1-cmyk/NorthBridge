/* NorthBridge service worker — offline support.
   Strategy:
     · HTML  → network first, fall back to cache, then to offline.html.
       (Marketing copy and prices change; a stale page is worse than a slow one.)
     · Assets → stale-while-revalidate, so CSS/JS/fonts paint instantly and
       refresh quietly in the background.
   Bump CACHE when you ship a change you need visitors to see immediately. */

var CACHE = 'nb-v19';

var PRECACHE = [
  './',
  'index.html',
  'cinderella.html',
  'hermes.html',
  'socrates.html',
  'perceptfolio.html',
  'contact.html',
  'book.html',
  'terms.html',
  'privacy.html',
  'offline.html',
  'styles.css',
  'nb.css',
  'site.js',
  'nb.js',
  'search-index.js',
  'icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* addAll is all-or-nothing; cache individually so one 404 cannot
         break the whole install. */
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isFont = /fonts\.(googleapis|gstatic)\.com/.test(url.hostname);

  /* Never touch anything else cross-origin (analytics, form posts). */
  if (!sameOrigin && !isFont) return;

  /* --- HTML: network first --- */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('offline.html') || Response.error();
        });
      })
    );
    return;
  }

  /* --- assets: stale-while-revalidate --- */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
