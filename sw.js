// ===== SERVICE WORKER — CatatDuit v2 =====
const CACHE_NAME = "catatduit-v2-cache-v16";

const ASSETS_TO_CACHE = [
  "/catatduit/",
  "/catatduit/index.html",
  "/catatduit/style.css",
  "/catatduit/manifest.json",
  "/catatduit/chart.min.js",
  "/catatduit/lucide.min.js",
  "/catatduit/js/state.js",
  "/catatduit/js/utils.js",
  "/catatduit/js/storage.js",
  "/catatduit/js/license.js",
  "/catatduit/js/ui.js",
  "/catatduit/js/dashboard.js",
  "/catatduit/js/input.js",
  "/catatduit/js/riwayat.js",
  "/catatduit/js/tabungan.js",
  "/catatduit/js/settings.js",
  "/catatduit/js/kategori.js",
  "/catatduit/js/app.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          ASSETS_TO_CACHE.map((url) =>
            cache
              .add(url)
              .catch((err) => console.warn(`Failed to cache: ${url}`, err)),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/catatduit/index.html");
          }
        });
    }),
  );
});
