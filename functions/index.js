// functions/index.js
// Firebase Cloud Functions – obsługa kolejki powiadomień push (FCM)
//
// Deployment:
//   cd functions && npm install
//   firebase deploy --only functions
//
// Wymagania:
//   - Plan Blaze (pay-as-you-go) w Firebase Console
//   - Zainstalowane Firebase CLI: npm install -g firebase-tools

'use strict';

const { onValueCreated } = require('firebase-functions/v2/database');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

/**
 * Buduje tytuł i treść powiadomienia na podstawie typu i danych.
 */
function buildNotificationContent(type, data) {
  const amount = data.amount ? parseFloat(data.amount).toFixed(2) + ' zł' : '';
  const by = data.addedBy ? ` • ${data.addedBy}` : '';

  switch (type) {
    case 'expense': {
      const label = data.transactionType === 'planned' ? 'Zaplanowany wydatek' : 'Nowy wydatek';
      const desc = [data.description, data.category].filter(Boolean).join(' / ');
      return {
        title: label,
        body: `${desc}${amount ? ' – ' + amount : ''}${by}`
      };
    }
    case 'expense_realised':
      return {
        title: 'Wydatek zrealizowany',
        body: `${data.description || ''}${data.category ? ' (' + data.category + ')' : ''}${amount ? ' – ' + amount : ''}${by}`
      };
    case 'income': {
      const label = data.transactionType === 'planned' ? 'Zaplanowany przychód' : 'Nowy przychód';
      return {
        title: label,
        body: `${data.source || ''}${amount ? ' – ' + amount : ''}${by}`
      };
    }
    case 'income_realised':
      return {
        title: 'Przychód zrealizowany',
        body: `${data.source || ''}${amount ? ' – ' + amount : ''}${by}`
      };
    default:
      return { title: 'Krezus', body: 'Nowa transakcja w budżecie' };
  }
}

/**
 * Cloud Function triggerowana gdy pojawi się nowy wpis w kolejce powiadomień.
 * Wysyła FCM do wszystkich zarejestrowanych urządzeń użytkownika,
 * a następnie usuwa wpis z kolejki.
 */
exports.processNotificationQueue = onValueCreated(
  {
    ref: 'users/{userId}/budget/notificationQueue/{notifId}',
    instance: 'krezus-e3070-default-rtdb',
    region: 'us-central1'
  },
  async (event) => {
    const { userId, notifId } = event.params;
    const notifData = event.data.val();

    if (!notifData) return;

    const db = getDatabase();
    const tokensSnap = await db.ref(`users/${userId}/budget/fcmTokens`).get();

    // Usuń wpis z kolejki niezależnie od dalszego wyniku
    await db.ref(`users/${userId}/budget/notificationQueue/${notifId}`).remove();

    if (!tokensSnap.exists()) {
      console.log(`[FCM] Brak tokenów dla użytkownika ${userId}`);
      return;
    }

    const tokens = Object.values(tokensSnap.val())
      .map((t) => t.token)
      .filter(Boolean);

    if (tokens.length === 0) return;

    const { title, body } = buildNotificationContent(notifData.type, notifData.data || {});

    const message = {
      notification: { title, body },
      data: {
        tag: `krezus-${notifData.type || 'transaction'}`,
        type: notifData.type || ''
      },
      tokens,
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#4a9960',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png'
        },
        fcmOptions: {
          link: '/'
        }
      }
    };

    try {
      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`[FCM] Wysłano do ${tokens.length} urządzeń. Sukces: ${response.successCount}, błędy: ${response.failureCount}`);

      // Usuń nieważne tokeny
      const invalidTokenKeys = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errCode = res.error && res.error.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            invalidTokenKeys.push(idx);
          }
        }
      });

      if (invalidTokenKeys.length > 0) {
        const allTokenEntries = Object.entries(tokensSnap.val());
        const removeOps = invalidTokenKeys.map((idx) => {
          const [key] = allTokenEntries[idx];
          return db.ref(`users/${userId}/budget/fcmTokens/${key}`).remove();
        });
        await Promise.all(removeOps);
        console.log(`[FCM] Usunięto ${invalidTokenKeys.length} nieważnych tokenów`);
      }
    } catch (err) {
      console.error('[FCM] Błąd wysyłania FCM:', err);
    }
  }
);
