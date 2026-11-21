const CACHE_NAME = 'deutschwort-cache-v5';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/firebase-config.js',
  './js/speech.js',
  './js/sm2.js',
  './js/sync.js',
  './js/app.js',
  './data/a1.json',
  './data/a2.json',
  './data/b1.json',
  './data/b2.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const BYPASS_HOST_PATTERN = /(^|\.)(firebaseapp\.com|firebaseio\.com|firebase\.google\.com|googleapis\.com|gstatic\.com|google\.com|googleusercontent\.com)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 严格跳过 Firebase / Google APIs / 任何跨域网络请求，避免拦截认证与 Firestore 实时同步
  if (
    BYPASS_HOST_PATTERN.test(url.hostname) ||
    url.hostname.indexOf('firebase') !== -1 ||
    url.hostname.indexOf('googleapis') !== -1 ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 词库 JSON 使用网络优先 + 离线缓存回退，方便更新词库后及时生效
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 静态资源使用缓存优先 + 后台更新
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
