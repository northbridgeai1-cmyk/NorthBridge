/* NorthBridge service worker — offline support.
   Strategy:
     · HTML  → network first, fall back to cache, then to offline.html.
       (Marketing copy and prices change; a stale page is worse than a slow one.)
     · Assets → stale-while-revalidate, so CSS/JS/fonts paint instantly and
       refresh quietly in the background.
   Bump CACHE when you ship a change you need visitors to see immediately. */

var CACHE = 'nb-a9f4d4d3';

var PRECACHE = [
  './',
  'index.html',
  'cinderella.html',
  'hermes.html',
  'socrates.html',
  'contact.html',
  'book.html',
  'terms.html',
  'privacy.html',
  'pierce-tyrrell.html',
  'offline.html',
  'styles.css?v=316699bb',
  'nb.css?v=23a73db9',
  'site.js?v=928990a3',
  'nb.js?v=fa0a5282',
  'search-index.js?v=be7ad673',
  'home.css?v=79786dfe',
  'boot.js?v=03cfc8ae',
  'home.js?v=47d9664f',
  'book.js?v=61d84989',
  'contact.js?v=56843555',
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

  /* Videos stream in pieces (range requests); caching them here breaks
     playback in Safari, so leave them to the browser. */
  if (sameOrigin && /\.(mp4|webm)$/i.test(url.pathname)) return;

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
