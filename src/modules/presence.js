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
  console.log('👥 initializePresence() wywołana dla userId:', userId);

  if (!userId) {
    console.log('❌ Brak userId - anulowanie inicjalizacji presence');
    return;
  }

  // Utwórz unikalny ID sesji
  currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('👥 Utworzono sessionId:', currentSessionId);

  // Ref do obecności tego użytkownika
  presenceRef = ref(db, `presence/${userId}/${currentSessionId}`);

  // Zapisz obecność
  const presenceData = {
    sessionId: currentSessionId,
    timestamp: serverTimestamp(),
    lastActivity: serverTimestamp()
  };

  console.log('👥 Zapisywanie obecności do Firebase:', `presence/${userId}/${currentSessionId}`);
  set(presenceRef, presenceData)
    .then(() => console.log('✅ Obecność zapisana w Firebase'))
    .catch(err => console.error('❌ Błąd zapisu obecności:', err));

  // Ustaw usuwanie obecności przy rozłączeniu
  onDisconnect(presenceRef).remove();

  // Nasłuchuj na inne sesje tego samego użytkownika
  listenToOtherSessions(userId);

  // Rozpocznij heartbeat
  startHeartbeat();

  console.log('👥 Inicjalizacja obecności zakończona dla sesji:', currentSessionId);
}

/**
 * Aktualizuje timestamp ostatniej aktywności
 */
export function recordActivity() {
  const userId = getUserId();
  if (!userId || !presenceRef) {
    if (!userId) console.log('⚠️ recordActivity: brak userId');
    if (!presenceRef) console.log('⚠️ recordActivity: brak presenceRef');
    return;
  }

  lastActivityTime = Date.now();

  // Anuluj poprzedni timeout
  if (activityTimeout) {
    clearTimeout(activityTimeout);
  }

  // Aktualizuj timestamp w Firebase (throttled do raz na 5 sekund)
  activityTimeout = setTimeout(() => {
    console.log('📝 Aktualizuję aktywność w Firebase');
    set(presenceRef, {
      sessionId: currentSessionId,
      timestamp: serverTimestamp(),
      lastActivity: serverTimestamp()
    })
      .then(() => console.log('✅ Aktywność zaktualizowana'))
      .catch(err => console.error('❌ Błąd aktualizacji aktywności:', err));
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
    console.log('👥 Sprawdzanie obecności innych sesji...');

    if (!snapshot.exists()) {
      console.log('👥 Brak danych o sesjach w Firebase');
      hidePresenceIndicator();
      return;
    }

    const sessions = [];
    let totalSessions = 0;
    snapshot.forEach((childSnapshot) => {
      totalSessions++;
      if (childSnapshot.key !== currentSessionId) {
        sessions.push({
          sessionId: childSnapshot.key,
          ...childSnapshot.val()
        });
      }
    });

    console.log(`👥 Znaleziono ${totalSessions} sesji (włącznie z obecną)`);
    console.log(`👥 Innych sesji: ${sessions.length}`);

    // Filtruj sesje aktywne w ostatnich 2 minutach
    const now = Date.now();
    const activeSessions = sessions.filter(session => {
      const lastActivity = session.lastActivity || session.timestamp;
      // Zamień Firebase timestamp na liczbę jeśli potrzeba
      const activityTime = typeof lastActivity === 'number' ? lastActivity :
                          (lastActivity?.toMillis ? lastActivity.toMillis() : now);
      const timeDiff = now - activityTime;

      console.log(`👥 Sesja ${session.sessionId.substring(0, 20)}... - ostatnia aktywność: ${Math.round(timeDiff / 1000)}s temu`);

      return timeDiff < 120000; // 2 minuty
    });

    console.log(`👥 Aktywnych innych sesji: ${activeSessions.length}`);

    if (activeSessions.length > 0) {
      console.log('✅ Pokazuję ikonkę obecności');
      showPresenceIndicator();

      // Sprawdź czy była aktywność w ostatnich 5 sekundach (nowa aktywność)
      const recentActivity = activeSessions.some(session => {
        const lastActivity = session.lastActivity || session.timestamp;
        const activityTime = typeof lastActivity === 'number' ? lastActivity :
                            (lastActivity?.toMillis ? lastActivity.toMillis() : now);
        const timeDiff = now - activityTime;
        return timeDiff < 5000; // 5 sekund
      });

      if (recentActivity) {
        console.log('⚡ Wykryto świeżą aktywność - pulsowanie');
        triggerPulse();
      }
    } else {
      console.log('❌ Brak aktywnych innych sesji - ukrywam ikonkę');
      hidePresenceIndicator();
    }
  });
}

/**
 * Pokazuje wskaźnik obecności innych użytkowników
 */
function showPresenceIndicator() {
  console.log('👁️ showPresenceIndicator() wywołana');
  let indicator = document.getElementById('presenceIndicator');

  if (!indicator) {
    console.log('🆕 Tworzenie nowej ikonki obecności');
    // Utwórz wskaźnik
    indicator = document.createElement('div');
    indicator.id = 'presenceIndicator';
    indicator.innerHTML = '👤';
    indicator.title = 'Ktoś inny jest aktywny na Twoim koncie';
    document.body.appendChild(indicator);
    console.log('✅ Ikonka dodana do DOM');
  } else {
    console.log('ℹ️ Ikonka już istnieje w DOM');
  }

  console.log('👁️ Ustawiam display: flex');
  indicator.style.display = 'flex';

  // Sprawdź czy rzeczywiście jest widoczna
  const computedStyle = window.getComputedStyle(indicator);
  console.log('👁️ Computed display:', computedStyle.display);
  console.log('👁️ Computed visibility:', computedStyle.visibility);
  console.log('👁️ Position:', computedStyle.position, 'Top:', computedStyle.top, 'Right:', computedStyle.right);
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
