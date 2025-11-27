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
    lastActivity: serverTimestamp(),
    isManualActivity: false
  };

  set(presenceRef, presenceData);

  // Ustaw usuwanie obecności przy rozłączeniu
  onDisconnect(presenceRef).remove();

  // Nasłuchuj na inne sesje tego samego użytkownika
  listenToOtherSessions(userId);

  // Rozpocznij heartbeat
  startHeartbeat();
}

/**
 * Aktualizuje timestamp ostatniej aktywności (tylko manualne akcje użytkownika)
 */
export function recordActivity() {
  const userId = getUserId();
  if (!userId || !presenceRef) return;

  lastActivityTime = Date.now();

  // Anuluj poprzedni timeout
  if (activityTimeout) {
    clearTimeout(activityTimeout);
  }

  // Aktualizuj timestamp w Firebase (throttled do raz na 0.5 sekundy)
  // Zmniejszono z 5s do 0.5s dla lepszej responsywności
  activityTimeout = setTimeout(() => {
    set(presenceRef, {
      sessionId: currentSessionId,
      timestamp: serverTimestamp(),
      lastActivity: serverTimestamp(),
      isManualActivity: true
    });
  }, 500);
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
      const activityTime = typeof lastActivity === 'number' ? lastActivity :
                          (lastActivity?.toMillis ? lastActivity.toMillis() : now);
      const timeDiff = now - activityTime;
      return timeDiff < 120000; // 2 minuty
    });

    if (activeSessions.length > 0) {
      showPresenceIndicator(activeSessions.length);

      // Sprawdź czy była MANUALNA aktywność w ostatnich 2 sekundach
      // Zmniejszono z 5s do 2s dla szybszej reakcji animacji
      const recentManualActivity = activeSessions.some(session => {
        if (!session.isManualActivity) return false;

        const lastActivity = session.lastActivity || session.timestamp;
        const activityTime = typeof lastActivity === 'number' ? lastActivity :
                            (lastActivity?.toMillis ? lastActivity.toMillis() : now);
        const timeDiff = now - activityTime;
        return timeDiff < 2000; // 2 sekundy
      });

      if (recentManualActivity) {
        triggerPulse();
      }
    } else {
      hidePresenceIndicator();
    }
  });
}

/**
 * Pokazuje wskaźnik obecności innych użytkowników
 * @param {number} count - Liczba aktywnych sesji
 */
function showPresenceIndicator(count = 0) {
  let indicator = document.getElementById('presenceIndicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'presenceIndicator';
    indicator.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <span class="presence-badge">${count}</span>
    `;
    const title = count === 1 ? 'Jedna inna sesja jest aktywna na Twoim koncie' : `${count} inne sesje są aktywne na Twoim koncie`;
    indicator.title = title;

    // Dodaj do header-user (obok przycisku profilu) zamiast do body
    const headerUser = document.querySelector('.header-user');
    if (headerUser) {
      // Wstaw przed pierwszym przyciskiem
      const firstButton = headerUser.querySelector('button');
      if (firstButton) {
        headerUser.insertBefore(indicator, firstButton);
      } else {
        headerUser.appendChild(indicator);
      }
    } else {
      // Fallback: dodaj do body jeśli header nie istnieje
      document.body.appendChild(indicator);
    }
  } else {
    // Zaktualizuj badge jeśli indicator już istnieje
    const badge = indicator.querySelector('.presence-badge');
    if (badge) {
      badge.textContent = count;
    }
    const title = count === 1 ? 'Jedna inna sesja jest aktywna na Twoim koncie' : `${count} inne sesje są aktywne na Twoim koncie`;
    indicator.title = title;
  }

  indicator.style.display = 'inline-flex';
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

  // Dodaj klasę active (czerwone tło) i szybkie pulsowanie na 2 sekundy
  indicator.classList.add('pulse-fast', 'active');

  pulseTimeout = setTimeout(() => {
    indicator.classList.remove('pulse-fast');
    indicator.classList.add('pulse-slow');

    // Usuń wolne pulsowanie i czerwone tło po 5 sekundach
    pulseLongerTimeout = setTimeout(() => {
      indicator.classList.remove('pulse-slow', 'active');
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

  currentSessionId = null;
}
