const CACHE_NAME = "sampada-cache-v4";

// Absolute paths ನೀಡುವುದರಿಂದ ಬ್ರೌಸರ್ ಲಿಂಕ್‌ಗಳ ಜೊತೆ ಸರಿಯಾಗಿ Match ಆಗುತ್ತದೆ
const CACHE_FILES = [
  "/",
  "/index.html",
  "/sampada_categories.html",
  "/ad-submit.html",
  "/admin.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png"
];

// 1. INSTALL: ಹೊಸ ಫೈಲ್‌ಗಳನ್ನು ಕ್ಯಾಶ್‌ನಲ್ಲಿ ಸೇರಿಸುವುದು
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting(); // ಹೊಸ Service Worker ತಕ್ಷಣ Activate ಆಗಲು
});

// 2. ACTIVATE: ಹಳೆಯ ವೃಥಾ ಕ್ಯಾಶ್‌ಗಳನ್ನು ತಕ್ಷಣ ಡಿಲೀಟ್ ಮಾಡುವುದು
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // ತಕ್ಷಣವೇ ಎಲ್ಲಾ ಪೇಜ್‌ಗಳ ನಿಯಂತ್ರಣ ತೆಗೆದುಕೊಳ್ಳಲು
});

// 3. FETCH: Network First, Fallback to Cache (ಅತ್ಯುತ್ತಮ ಸ್ಟ್ರಾಟಜಿ)
self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;

  // Firebase / External API ಲಿಂಕ್‌ಗಳನ್ನು Service Worker ಹಿಡಿಯುವುದಿಲ್ಲ
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function(networkResponse) {
        // ನೆಟ್‌ವರ್ಕ್‌ನಿಂದ ಫೈಲ್ ಸಿಕ್ಕರೆ, ಅದನ್ನು ಕ್ಯಾಶ್‌ಗೆ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ ತೋರಿಸುತ್ತದೆ
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(function() {
        // ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದಾಗ ಅಥವಾ ನೆಟ್‌ವರ್ಕ್ ಫೇಲ್ ಆದಾಗ ಕ್ಯಾಶ್‌ನಿಂದ ಫೈಲ್ ನೀಡುತ್ತದೆ
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          // ಪೇಜ್ ನೇವಿಗೇಶನ್ ಫೇಲ್ ಆದಾಗ index.html ಗೆ ಕರೆದೊಯ್ಯುತ್ತದೆ
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ", { status: 503, statusText: "Service Unavailable" });
        });
      })
  );
});