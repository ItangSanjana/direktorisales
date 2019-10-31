/**
 *   Copyright 2019 Itang Sanjana
 */

const cacheName = 'ds-v722';
const urlsToCache = [
  '/offline',
  '/offline/script.js',
  '/offline/style.css',
  '/404'
];

self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(urlsToCache))));

self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key))))));

self.addEventListener('fetch', event => {
    const crossOrigin = ['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'];
    const requestURL = new URL(event.request.url);

    if (requestURL.origin === self.location.origin) {
        if (event.request.method === 'GET') {
            event.respondWith(caches.open(cacheName).then(cache => cache.match(event.request).then(response => response || fetch(event.request).then(response => {
                cache.put(event.request, response.clone());
                return response;
            })).catch(() => caches.match('/offline'))));
            return;
        }
    }

    if (/\w+\.googleusercontent\.com/.test(requestURL.hostname) || crossOrigin.includes(requestURL.hostname)) {
        if (event.request.method === 'GET') {
            event.respondWith(caches.open(cacheName).then(cache => cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                return response || fetchPromise;
            })));
            return;
        }
    }
});
