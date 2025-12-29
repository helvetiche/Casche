// Service Worker for Casche PWA
const CACHE_NAME = "casche-v1";
const urlsToCache = ["/", "/manifest.json", "/logo.png"];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch from Cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept requests for same-origin resources
  // Let external resources (Google APIs, fonts, images) pass through without interception
  if (url.origin !== self.location.origin) {
    return; // Let the browser handle external requests normally
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});

// Update Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
