// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker
// Plik MUSI znajdować się w katalogu publicznym (root), żeby FCM działało poprawnie.
// Obsługuje powiadomienia push gdy przeglądarka jest zamknięta lub strona nieaktywna.

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCnRc4rnq-xNf1Z9H_z-cfT7prqNgxQ_-0",
  authDomain: "krezus-e3070.firebaseapp.com",
  databaseURL: "https://krezus-e3070-default-rtdb.firebaseio.com",
  projectId: "krezus-e3070",
  storageBucket: "krezus-e3070.firebasestorage.app",
  messagingSenderId: "972913558013",
  appId: "1:972913558013:web:cf13f942374dadb99dd994"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Obsługa powiadomień push w tle (gdy przeglądarka jest zamknięta lub karta nieaktywna)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Otrzymano wiadomość w tle:', payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const options = {
    body: notification.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'krezus',
    data: { url: self.location.origin, ...data },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(
    notification.title || 'Krezus',
    options
  );
});

// Kliknięcie w powiadomienie – otwórz lub aktywuj kartę aplikacji
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
