const CACHE_NAME = 'flashcard-pro-v22';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './group_1.js',
    './group_2.js',
    './group_3.js',
    './group_4.js',
    './group_5.js',
    './group_6.js',
    './group_7.js',
    './group_8.js',
    './group_9.js',
    './group_10.js',
    './group_11.js',
    './group_12.js',
    './group_13.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Luôn ưu tiên mạng trước (Network first) để không bao giờ bị kẹt file data/code cũ
    e.respondWith(
        fetch(e.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseClone);
                });
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(e.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return caches.match('./index.html');
            });
        })
    );
});
