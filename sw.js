// 绩效分配系统 Service Worker
const CACHE_NAME = 'performance-system-v1';
const urlsToCache = [
  './',
  './index.html',
  './settings.html',
  './results.html',
  './history.html',
  './debug.html',
  './css/style.css',
  './js/main.js',
  './js/settings.js',
  './js/results.js',
  './js/history.js',
  './js/models.js',
  './js/storage.js',
  './js/debug.js',
  './manifest.json',
  // Bootstrap CDN 资源
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js',
  // Chart.js CDN 资源
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 安装事件 - 缓存资源
self.addEventListener('install', function(event) {
  console.log('Service Worker: 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: 缓存文件');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('Service Worker: 缓存失败', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', function(event) {
  console.log('Service Worker: 激活中...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果缓存中有该资源，直接返回
        if (response) {
          return response;
        }

        // 否则发起网络请求
        return fetch(event.request).then(function(response) {
          // 检查是否是有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆响应，因为响应流只能使用一次
          var responseToCache = response.clone();

          // 将新资源添加到缓存
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(function() {
          // 网络请求失败时的处理
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 处理消息事件
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 后台同步事件（用于离线数据同步）
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: 后台同步');
    // 这里可以添加离线数据同步逻辑
  }
});