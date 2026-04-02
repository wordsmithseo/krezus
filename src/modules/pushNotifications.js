// src/modules/pushNotifications.js
// Moduł zarządzania powiadomieniami push (Firebase Cloud Messaging)
//
// Wymagane kroki konfiguracji (jednorazowo w Firebase Console):
//   1. Project Settings → Cloud Messaging → Web Push certificates → "Generate key pair"
//   2. Skopiuj klucz VAPID i wstaw poniżej zamiast 'YOUR_VAPID_KEY_HERE'
//   3. Wdróż Firebase Cloud Functions: cd functions && npm install, a następnie firebase deploy --only functions

import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { ref, set, remove, get } from 'firebase/database';
import { app, db } from '../config/firebase.js';
import { getUserId } from './auth.js';

// ─────────────────────────────────────────────
// KONFIGURACJA – uzupełnij po wygenerowaniu klucza VAPID w Firebase Console
// Project Settings → Cloud Messaging → Web Push certificates
// ─────────────────────────────────────────────
const VAPID_KEY = 'BJjN5BSemp0b3SAfpudZVV_1U-bZMYhlWdmkFdGwcvD0tsvi_5nJVjtXEs8H3cA7MzmjASneOhIDtffMLcOg-CM';
const SW_PATH = '/firebase-messaging-sw.js';

let _messaging = null;

function getMessagingInstance() {
  if (!_messaging) {
    _messaging = getMessaging(app);
  }
  return _messaging;
}

// Prosty hash tokenu FCM na klucz Firebase (tokeny zawierają niedozwolone znaki)
function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = Math.imul(31, h) + token.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function detectDevice() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Inne';
}

// ─────────────────────────────────────────────
// Inicjalizacja – podpięcie handlera na wiadomości "foreground"
// (gdy użytkownik ma otwartą aplikację w aktywnej karcie)
// ─────────────────────────────────────────────
export function initPushNotifications() {
  if (!isPushSupported()) return;

  try {
    const msg = getMessagingInstance();
    onMessage(msg, (payload) => {
      console.log('[Push] Powiadomienie na pierwszym planie:', payload);

      // Pokaż powiadomienie przeglądarki jeśli karta jest w tle lub uprawnienie jest przyznane
      if (Notification.permission === 'granted') {
        const n = payload.notification || {};
        const icon = n.icon || '/icons/icon-192x192.png';
        new Notification(n.title || 'Krezus', {
          body: n.body || '',
          icon,
          badge: '/icons/icon-96x96.png',
          tag: (payload.data && payload.data.tag) || 'krezus'
        });
      }
    });
  } catch (err) {
    console.warn('[Push] Nie można zainicjalizować FCM messaging:', err.message);
  }
}

// ─────────────────────────────────────────────
// Sprawdź czy przeglądarka obsługuje push
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Czy klucz VAPID jest skonfigurowany?
// ─────────────────────────────────────────────
export function isVapidConfigured() {
  return VAPID_KEY !== 'YOUR_VAPID_KEY_HERE' && VAPID_KEY.length > 10;
}

// ─────────────────────────────────────────────
// Czy przeglądarka obsługuje push?
// ─────────────────────────────────────────────
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}

// ─────────────────────────────────────────────
// Czy powiadomienia są aktualnie włączone na tym urządzeniu?
// ─────────────────────────────────────────────
export async function isPushEnabled() {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const userId = getUserId();
  if (!userId) return false;

  try {
    const swReg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!swReg) return false;

    const msg = getMessagingInstance();
    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return false;

    const snap = await get(ref(db, `users/${userId}/budget/fcmTokens/${hashToken(token)}`));
    return snap.exists();
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Włącz powiadomienia push na tym urządzeniu
// ─────────────────────────────────────────────
export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('Twoja przeglądarka nie obsługuje powiadomień push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Odmówiono dostępu do powiadomień. Zmień ustawienia przeglądarki.');
  }

  const swReg = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;

  const msg = getMessagingInstance();
  const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });

  if (!token) {
    throw new Error('Nie udało się uzyskać tokenu FCM. Sprawdź konfigurację VAPID key.');
  }

  await _saveToken(token);
  return token;
}

// ─────────────────────────────────────────────
// Wyłącz powiadomienia push na tym urządzeniu
// ─────────────────────────────────────────────
export async function disablePush() {
  const userId = getUserId();
  if (!userId) return;

  try {
    const swReg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const msg = getMessagingInstance();

    let token = null;
    if (swReg) {
      token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg }).catch(() => null);
      if (token) {
        await deleteToken(msg).catch(() => {});
      }
    }

    if (token) {
      await remove(ref(db, `users/${userId}/budget/fcmTokens/${hashToken(token)}`));
    }
  } catch (err) {
    console.error('[Push] Błąd wyłączania push:', err);
  }
}

// ─────────────────────────────────────────────
// Zapisz token FCM w Firebase
// ─────────────────────────────────────────────
async function _saveToken(token) {
  const userId = getUserId();
  if (!userId) return;

  await set(ref(db, `users/${userId}/budget/fcmTokens/${hashToken(token)}`), {
    token,
    device: detectDevice(),
    createdAt: Date.now()
  });
}

// ─────────────────────────────────────────────
// Wstaw powiadomienie do kolejki – Cloud Function je pobierze i wyśle FCM
// Wywołaj po dodaniu wydatku lub przychodu.
// ─────────────────────────────────────────────
export async function queueNotification(type, data) {
  const userId = getUserId();
  if (!userId) return;

  // Jeśli nikt nie włączył powiadomień, nie twórz zbędnych rekordów
  const tokensSnap = await get(ref(db, `users/${userId}/budget/fcmTokens`));
  if (!tokensSnap.exists()) return;

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await set(ref(db, `users/${userId}/budget/notificationQueue/${notifId}`), {
    type,     // 'expense' | 'expense_realised' | 'income' | 'income_realised'
    data,     // payload zależny od typu
    createdAt: Date.now()
  });
}
