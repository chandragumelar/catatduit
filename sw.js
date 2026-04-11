// ===== SERVICE WORKER — CatatDuit v3 =====
const CACHE_NAME = 'catatduit-v3-cache-v2';

const ASSETS_CORE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/chart.min.js',
  '/lucide.min.js',
  '/js/state.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/bottom-sheet.js',
  '/js/budget.js',
  '/js/health-score.js',
  '/js/quick-capture.js',
  '/js/cerita.js',
  '/js/dashboard.calc.js',
  '/js/dashboard.insight.js',
  '/js/dashboard.chart.js',
  '/js/dashboard.js',
  '/js/input.js',
  '/js/riwayat.js',
  '/js/goals.js',
  '/js/tagihan.js',
  '/js/tabungan.js',
  '/js/settings.js',
  '/js/kategori.js',
  '/js/app.js',
];

// Font di-cache terpisah — tidak block install kalau gagal
const ASSETS_OPTIONAL = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
];

// ===== INSTALL — cache semua asset core =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled([
        // Core: gagal satu = log tapi lanjut
        ...ASSETS_CORE.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))),
        // Optional: silent fail
        ...ASSETS_OPTIONAL.map(url =>
          cache.add(url).catch(() => {})),
      ]))
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE — hapus cache lama =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH — cache-first untuk assets, network-first untuk navigasi =====
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  // Navigasi: network-first supaya app selalu up-to-date kalau online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS/assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => null);
    })
  );
});

// ===== PUSH NOTIFICATION — tagihan reminder =====
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CatatDuit', {
      body: data.body || 'Ada tagihan yang perlu dicek.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'catatduit-reminder',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        const url = event.notification.data?.url || '/';
        for (const client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

// ===== BACKGROUND SYNC — kirim update ke semua tab kalau ada perubahan =====
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
