// ===== SERVICE WORKER — CatatDuit v2 =====
// Cache-first strategy for all local assets + CDN dependencies

const CACHE_NAME = "catatduit-v2-cache-v11";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/manifest.json",
  "/js/state.js",
  "/js/utils.js",
  "/js/storage.js",
  "/js/license.js",
  "/js/ui.js",
  "/js/dashboard.js",
  "/js/input.js",
  "/js/riwayat.js",
  "/js/tabungan.js",
  "/js/settings.js",
  "/js/kategori.js",
  "/js/app.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
];

// Install — cache all assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map((url) =>
            cache
              .add(url)
              .catch((err) => console.warn(`Failed to cache: ${url}`, err)),
          ),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch — cache-first, network fallback
self.addEventListener("fetch", (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    }),
  );
});
