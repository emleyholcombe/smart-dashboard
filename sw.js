// Service Worker for Bennett Hub PWA
const CACHE_NAME = 'bennett-hub-v1337-desktop-close-button-fix';
const urlsToCache = [
  '/smart-dashboard/',
  '/smart-dashboard/index.html',
  '/smart-dashboard/manifest.json',
  '/smart-dashboard/icon-16.png',
  '/smart-dashboard/icon-32.png',
  '/smart-dashboard/icon-72.png',
  '/smart-dashboard/icon-96.png',
  '/smart-dashboard/icon-128.png',
  '/smart-dashboard/icon-144.png',
  '/smart-dashboard/icon-152.png',
  '/smart-dashboard/icon-167.png',
  '/smart-dashboard/icon-180.png',
  '/smart-dashboard/icon-192.png',
  '/smart-dashboard/icon-384.png',
  '/smart-dashboard/icon-512.png',
  '/smart-dashboard/favicon.ico',
  '/smart-dashboard/google_icon_with_white_outline.png?v=1126',
  '/smart-dashboard/to_do_list.png?v=1126',
  '/smart-dashboard/recipe_book.png?v=1126',
  '/smart-dashboard/shopping_cart.png?v=1126',
  '/smart-dashboard/to_do_history.png?v=1126',
  '/smart-dashboard/dashboard_icon.png?v=1126',
  '/smart-dashboard/to_do_calendar.png?v=1126',
  '/smart-dashboard/meals_icon.png?v=1126',
  '/smart-dashboard/medication.png?v=1126',
  '/smart-dashboard/clean_plate.png?v=1126',
  '/smart-dashboard/dirty_plate.png?v=1126',
  '/smart-dashboard/bubbles.png?v=1126'
];

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message, activating immediately');
    self.skipWaiting();
  }
});

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event - FORCING IMMEDIATE ACTIVATION');
  // Skip waiting to activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests and requests outside our scope
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Only handle requests within our GitHub Pages path
  if (!event.request.url.includes('/smart-dashboard/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/smart-dashboard/index.html');
        }
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Here you could sync any pending data when connection is restored
      console.log('Service Worker: Performing background sync')
    );
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Bennett Hub',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Bennett Hub', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/smart-dashboard/')
  );
});
