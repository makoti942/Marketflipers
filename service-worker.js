// Service Worker for Dylan Trades PWA
const CACHE_NAME = 'dylantrades-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through to network, fallback to cache if available
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
