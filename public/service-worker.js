// A simple service worker for handling push notifications.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received.');
  
  try {
    const pushData = event.data.json();
    const title = pushData.title || 'SuperModel AI';
    const options = {
      body: pushData.body || 'You have a new notification.',
      icon: '/vite.svg',
      badge: '/vite.svg'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Push event data was not valid JSON', e);
    const title = 'SuperModel AI';
    const options = {
      body: event.data.text(),
      icon: '/vite.svg',
      badge: '/vite.svg'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});
