/* ==========================================================
   ಸಂಪದ — Service Worker (PWA Offline Cache)
   Network First Strategy (ಹೊಸ ಫೈಲ್‌ಗಳು ಯಾವಾಗಲೂ ಲೋಡ್ ಆಗುತ್ತವೆ)
========================================================== */

const CACHE_NAME = "sampada-cache-v20";  // v10 -> v20 (ಹಳೆಯ cache ಅಳಿಸಲು)

const CACHE_FILES = [
  "./",
  "./index.html",
  "./sampada_categories.html",
  "./ad-submit.html",
  "./admin.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;

  // Network First: ಮೊದಲು ಇಂಟರ್ನೆಟ್‌ನಿಂದ ಲೋಡ್ ಮಾಡಿ
  event.respondWith(
    fetch(event.request).then(function(response){
      if(response && response.status === 200){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(event.request, copy);
        });
      }
      return response;
    }).catch(function(){
      // ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದರೆ ಮಾತ್ರ Cache ಬಳಸಿ
      return caches.match(event.request).then(function(cached){
        return cached || caches.match("./index.html");
      });
    })
  );
});
