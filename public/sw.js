// PWA Service Worker for AImum
const CACHE_NAME = 'aimum-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/chat.html',
  '/tokens.html',
  '/plugins.html',
  '/progress.html',
  '/manifest.json',
  '/favicon.svg'
];

const CACHE_STRATEGIES = {
  static: {
    patterns: ['/*.js', '/*.css', '/*.svg', '/*.png', '/*.woff2'],
    strategy: 'cache-first'
  },
  api: {
    patterns: ['/api/'],
    strategy: 'network-first'
  },
  pages: {
    patterns: ['/*.html'],
    strategy: 'stale-while-revalidate'
  }
};

// 安装 Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // 立即激活
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // 立即控制所有页面
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳过 Chrome 扩展
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // API 请求使用网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // 静态资源使用缓存优先
  if (isStaticResource(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // 页面使用 stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// 判断是否为静态资源
function isStaticResource(pathname) {
  const staticExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// 缓存优先策略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    // 返回离线响应
    return new Response(
      JSON.stringify({ error: 'Offline', message: '请检查网络连接' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stale-while-revalidate 策略
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);
  
  return cached || fetchPromise || new Response('Offline', { status: 503 });
}

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// 同步消息
async function syncMessages() {
  // 获取待同步的消息
  const cache = await caches.open('aimum-messages');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/chat')) {
      try {
        const cached = await cache.match(request);
        const data = await cached.json();
        
        // 重新发送请求
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        // 删除已同步的消息
        await cache.delete(request);
        console.log('[SW] Synced message:', request.url);
      } catch (error) {
        console.error('[SW] Sync failed:', error);
      }
    }
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const data = event.data?.json() || {};
  const title = data.title || 'AImum';
  const options = {
    body: data.body || '您有一条新消息',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'default',
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 点击通知
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 如果有已打开的窗口，跳转到该窗口
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// 消息处理
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
});
