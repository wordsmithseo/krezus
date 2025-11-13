// src/modules/presence.js - Zarządzanie obecnością użytkowników
import { ref, onDisconnect, set, onValue, serverTimestamp, remove } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';

let currentSessionId = null;
let presenceRef = null;
let lastActivityTime = Date.now();
let activityTimeout = null;
let otherSessionsListener = null;
let pulseTimeout = null;
let pulseLongerTimeout = null;

/**
 * Inicjalizuje śledzenie obecności użytkownika
 */
export function initializePresence() {
  const userId = getUserId();
  if (!userId) return;

  // Utwórz unikalny ID sesji
  currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Ref do obecności tego użytkownika
  presenceRef = ref(db, `presence/${userId}/${currentSessionId}`);

  // Zapisz obecność
  const presenceData = {
    sessionId: currentSessionId,
    timestamp: serverTimestamp(),
    lastActivity: serverTimestamp()
  };

  set(presenceRef, presenceData);

  // Ustaw usuwanie obecności przy rozłączeniu
  onDisconnect(presenceRef).remove();

  // Nasłuchuj na inne sesje tego samego użytkownika
  listenToOtherSessions(userId);

  // Rozpocznij heartbeat
  startHeartbeat();

  console.log('👥 Inicjalizacja obecności dla sesji:', currentSessionId);
}

/**
 * Aktualizuje timestamp ostatniej aktywności
 */
export function recordActivity() {
  const userId = getUserId();
  if (!userId || !presenceRef) return;

  lastActivityTime = Date.now();

  // Anuluj poprzedni timeout
  if (activityTimeout) {
    clearTimeout(activityTimeout);
  }

  // Aktualizuj timestamp w Firebase (throttled do raz na 5 sekund)
  activityTimeout = setTimeout(() => {
    set(presenceRef, {
      sessionId: currentSessionId,
      timestamp: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
  }, 5000);
}

/**
 * Heartbeat - aktualizuj obecność co 30 sekund
 */
function startHeartbeat() {
  setInterval(() => {
    if (presenceRef) {
      set(presenceRef, {
        sessionId: currentSessionId,
        timestamp: serverTimestamp(),
        lastActivity: serverTimestamp()
      });
    }
  }, 30000);
}

/**
 * Nasłuchuj na inne sesje tego samego użytkownika
 */
function listenToOtherSessions(userId) {
  const allSessionsRef = ref(db, `presence/${userId}`);

  otherSessionsListener = onValue(allSessionsRef, (snapshot) => {
    if (!snapshot.exists()) {
      hidePresenceIndicator();
      return;
    }

    const sessions = [];
    snapshot.forEach((childSnapshot) => {
      if (childSnapshot.key !== currentSessionId) {
        sessions.push({
          sessionId: childSnapshot.key,
          ...childSnapshot.val()
        });
      }
    });

    // Filtruj sesje aktywne w ostatnich 2 minutach
    const now = Date.now();
    const activeSessions = sessions.filter(session => {
      const lastActivity = session.lastActivity || session.timestamp;
      const timeDiff = now - (typeof lastActivity === 'number' ? lastActivity : Date.now());
      return timeDiff < 120000; // 2 minuty
    });

    if (activeSessions.length > 0) {
      showPresenceIndicator();
      // Sprawdź czy była aktywność w ostatnich 5 sekundach (nowa aktywność)
      const recentActivity = activeSessions.some(session => {
        const lastActivity = session.lastActivity || session.timestamp;
        const timeDiff = now - (typeof lastActivity === 'number' ? lastActivity : Date.now());
        return timeDiff < 5000; // 5 sekund
      });

      if (recentActivity) {
        triggerPulse();
      }
    } else {
      hidePresenceIndicator();
    }
  });
}

/**
 * Pokazuje wskaźnik obecności innych użytkowników
 */
function showPresenceIndicator() {
  let indicator = document.getElementById('presenceIndicator');

  if (!indicator) {
    // Utwórz wskaźnik
    indicator = document.createElement('div');
    indicator.id = 'presenceIndicator';
    indicator.innerHTML = '👤';
    indicator.title = 'Ktoś inny jest aktywny na Twoim koncie';
    document.body.appendChild(indicator);
  }

  indicator.style.display = 'flex';
}

/**
 * Ukrywa wskaźnik obecności
 */
function hidePresenceIndicator() {
  const indicator = document.getElementById('presenceIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Uruchamia animację pulsowania
 */
function triggerPulse() {
  const indicator = document.getElementById('presenceIndicator');
  if (!indicator) return;

  // Anuluj poprzednie timeouty
  if (pulseTimeout) clearTimeout(pulseTimeout);
  if (pulseLongerTimeout) clearTimeout(pulseLongerTimeout);

  // Usuń poprzednie klasy
  indicator.classList.remove('pulse-fast', 'pulse-slow');

  // Wymusz reflow
  void indicator.offsetWidth;

  // Dodaj szybkie pulsowanie na 2 sekundy
  indicator.classList.add('pulse-fast');

  pulseTimeout = setTimeout(() => {
    indicator.classList.remove('pulse-fast');
    indicator.classList.add('pulse-slow');

    // Usuń wolne pulsowanie po 5 sekundach
    pulseLongerTimeout = setTimeout(() => {
      indicator.classList.remove('pulse-slow');
    }, 5000);
  }, 2000);
}

/**
 * Czyści obecność przy wylogowaniu
 */
export function cleanupPresence() {
  if (presenceRef) {
    remove(presenceRef);
    presenceRef = null;
  }

  if (otherSessionsListener) {
    otherSessionsListener();
    otherSessionsListener = null;
  }

  if (activityTimeout) {
    clearTimeout(activityTimeout);
  }

  if (pulseTimeout) {
    clearTimeout(pulseTimeout);
  }

  if (pulseLongerTimeout) {
    clearTimeout(pulseLongerTimeout);
  }

  hidePresenceIndicator();

  console.log('👋 Czyszczenie obecności dla sesji:', currentSessionId);
  currentSessionId = null;
}
