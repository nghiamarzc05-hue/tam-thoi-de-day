const CACHE_NAME = 'flashcard-pro-v24';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './data/group_1.js',
    './data/group_2.js',
    './data/group_3.js',
    './data/group_4.js',
    './data/group_5.js',
    './data/group_6.js',
    './data/group_7.js',
    './data/group_8.js',
    './data/group_9.js',
    './data/group_10.js',
    './data/group_11.js',
    './data/group_12.js',
    './data/group_13.js'
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
