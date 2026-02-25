// Service Worker for Bennett Hub PWA
const CACHE_NAME = 'bennett-hub-v1397-pwa-medications-scroll';

// Import Firebase messaging for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyAnUFxQTbEsfSPopMHIetVO71b2zAipuDo",
  authDomain: "bennett-hub-smart-dashboard.firebaseapp.com",
  projectId: "bennett-hub-smart-dashboard",
  storageBucket: "bennett-hub-smart-dashboard.firebasestorage.app",
  messagingSenderId: "234568062046",
  appId: "1:234568062046:web:d519bd469178f6498c50cf"
});

const messaging = firebase.messaging();

// Handle background push messages from FCM
// Note: When FCM sends a notification payload, it auto-displays the notification.
// This handler is for data-only messages or customizing the notification.
messaging.onBackgroundMessage((payload) => {
  console.log('Service Worker: Background message received', payload);
  
  // Cancel any matching local notification since we received the cloud version
  cancelMatchingLocalNotification(payload);
  
  // If there's already a notification payload, FCM handles display automatically
  // Only show custom notification for data-only messages
  if (payload.notification) {
    console.log('Service Worker: FCM auto-displaying notification, skipping custom display');
    return;
  }
  
  const data = payload.data || {};
  
  const notificationTitle = data.title || 'Bennett Hub';
  const notificationOptions = {
    body: data.body || 'You have a new notification',
    icon: '/smart-dashboard/icon-192.png',
    badge: '/smart-dashboard/icon-72.png',
    vibrate: [100, 50, 100],
    tag: 'bennett-hub-notification',
    data: {
      url: data.url || '/smart-dashboard/',
      action: data.action || 'open',
      ...data
    }
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Cancel local notification when cloud notification is received
function cancelMatchingLocalNotification(payload) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  
  // Check if this is a pain medication reminder
  if (notification.title && notification.title.includes('Pain Medication')) {
    // Extract profile from the URL in data
    const url = data.url || data.link || '';
    const painMatch = url.match(/[?&]pain=(\w+)/);
    if (painMatch) {
      const profile = painMatch[1];
      // Cancel all local pain notifications for this profile
      for (const [id, timerId] of localNotificationTimers.entries()) {
        if (id.startsWith(`pain-${profile}-`)) {
          clearTimeout(timerId);
          localNotificationTimers.delete(id);
          console.log(`Service Worker: Cancelled local notification ${id} (cloud version received)`);
        }
      }
    }
  }
  
  // Check if this is a dishwasher reminder
  if (notification.title && notification.title.includes('Dishwasher')) {
    for (const [id, timerId] of localNotificationTimers.entries()) {
      if (id.startsWith('dishwasher-')) {
        clearTimeout(timerId);
        localNotificationTimers.delete(id);
        console.log(`Service Worker: Cancelled local notification ${id} (cloud version received)`);
      }
    }
  }
}
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

// Store for local notification timers
const localNotificationTimers = new Map();

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message, activating immediately');
    self.skipWaiting();
  }
  
  // Handle local notification scheduling (offline fallback)
  if (event.data && event.data.type === 'SCHEDULE_LOCAL_NOTIFICATION') {
    const { id, title, body, delayMs, url, profile } = event.data;
    console.log(`Service Worker: Scheduling local notification "${title}" in ${delayMs}ms`);
    
    // Clear any existing timer with same ID
    if (localNotificationTimers.has(id)) {
      clearTimeout(localNotificationTimers.get(id));
    }
    
    // Schedule the notification
    const timerId = setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/smart-dashboard/icon-192.png',
        badge: '/smart-dashboard/icon-72.png',
        vibrate: [100, 50, 100],
        tag: `local-${id}`,
        data: {
          url: url || '/smart-dashboard/',
          profile: profile,
          isLocal: true
        }
      });
      localNotificationTimers.delete(id);
      console.log(`Service Worker: Local notification "${title}" shown`);
    }, delayMs);
    
    localNotificationTimers.set(id, timerId);
  }
  
  // Handle canceling local notifications
  if (event.data && event.data.type === 'CANCEL_LOCAL_NOTIFICATION') {
    const { id } = event.data;
    if (localNotificationTimers.has(id)) {
      clearTimeout(localNotificationTimers.get(id));
      localNotificationTimers.delete(id);
      console.log(`Service Worker: Cancelled local notification ${id}`);
    }
  }
  
  // Handle canceling all local notifications with a prefix
  if (event.data && event.data.type === 'CANCEL_ALL_LOCAL_NOTIFICATIONS') {
    const { prefix } = event.data;
    let cancelledCount = 0;
    for (const [id, timerId] of localNotificationTimers.entries()) {
      if (id.startsWith(prefix)) {
        clearTimeout(timerId);
        localNotificationTimers.delete(id);
        cancelledCount++;
      }
    }
    console.log(`Service Worker: Cancelled ${cancelledCount} local notifications with prefix "${prefix}"`);
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

// Push notification handling
// Note: FCM handles push events internally, so we skip if it's an FCM message
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  // Check if this is an FCM message (FCM handles these automatically)
  let payload;
  try {
    payload = event.data?.json();
  } catch (e) {
    payload = null;
  }
  
  // If it has FCM structure with notification, let FCM handle it
  if (payload?.notification || payload?.fcmMessageId) {
    console.log('Service Worker: FCM message detected, letting FCM handle display');
    return;
  }
  
  // Only handle non-FCM push messages
  const data = payload?.data || payload || {};
  const title = data.title || 'Bennett Hub';
  const body = data.body || (event.data ? event.data.text() : 'New notification');
  
  const options = {
    body: body,
    icon: '/smart-dashboard/icon-192.png',
    badge: '/smart-dashboard/icon-72.png',
    vibrate: [100, 50, 100],
    tag: 'bennett-hub-notification',
    data: {
      url: data.url || '/smart-dashboard/',
      action: data.action || 'open',
      ...data
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received', event.action);
  
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'dismiss') {
    return;
  }
  
  const data = event.notification.data || {};
  const urlToOpen = data.url || '/smart-dashboard/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes('/smart-dashboard/') && 'focus' in client) {
            // Send message to the client about the notification action
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: data.action,
              data: data
            });
            return client.focus();
          }
        }
        // Open a new window if no existing window found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
