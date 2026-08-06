// RPi-Monitor Service Worker
// Caches static assets for offline use
var CACHE_NAME = 'rpimonitor-v1';
var CACHE_URLS = [
  './',
  './index.html',
  './status.html',
  './statistics.html',
  './addons.html',
  './css/bootstrap.min.css',
  './css/bootstrap-icons.min.css',
  './css/rpimonitor.css',
  './js/jquery.min.js',
  './js/bootstrap.min.js',
  './js/rpimonitor.js',
  './js/rpimonitor.utils.js',
  './img/favicon.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS).catch(function() {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });
    })
  );
});
