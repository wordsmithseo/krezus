// src/modules/logger.js - System logowania akcji użytkownika
import { ref, get, set, push, remove } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

/**
 * Zapisz wpis w logach
 */
export async function log(action, details = {}) {
  try {
    const userId = getUserId();
    if (!userId) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      date: getWarsawDateString(),
      time: getCurrentTimeString(),
      action,
      details,
      userId
    };
    
    const logsRef = ref(db, `users/${userId}/logs`);
    await push(logsRef, logEntry);
    
    console.log('📝 Log:', action, details);
  } catch (error) {
    console.error('❌ Błąd zapisu logu:', error);
  }
}

/**
 * Pobierz wszystkie logi
 */
export async function getLogs() {
  try {
    const userId = getUserId();
    if (!userId) return [];
    
    const logsRef = ref(db, `users/${userId}/logs`);
    const snapshot = await get(logsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const logs = [];
    snapshot.forEach((child) => {
      logs.push({
        id: child.key,
        ...child.val()
      });
    });
    
    // Sortuj od najnowszych
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs;
  } catch (error) {
    console.error('❌ Błąd pobierania logów:', error);
    return [];
  }
}

/**
 * Wyczyść wszystkie logi
 */
export async function clearAllLogs() {
  try {
    const userId = getUserId();
    if (!userId) return;
    
    const logsRef = ref(db, `users/${userId}/logs`);
    await remove(logsRef);
    
    console.log('✅ Logi wyczyszczone');
    
    // Dodaj wpis o wyczyszczeniu logów
    await log('LOGS_CLEARED', { message: 'Wszystkie logi zostały wyczyszczone' });
  } catch (error) {
    console.error('❌ Błąd czyszczenia logów:', error);
    throw error;
  }
}

/**
 * Oblicz rozmiar logów w KB
 */
export function calculateLogsSize(logs) {
  const jsonString = JSON.stringify(logs);
  const bytes = new Blob([jsonString]).size;
  return (bytes / 1024).toFixed(2);
}

/**
 * Formatuj wpis logu do wyświetlenia
 */
export function formatLogEntry(logEntry) {
  const actionLabels = {
    'USER_LOGIN': '🔐 Logowanie',
    'USER_LOGOUT': '👋 Wylogowanie',
    'USER_REGISTER': '📝 Rejestracja',
    'EXPENSE_ADD': '💸 Dodanie wydatku',
    'EXPENSE_EDIT': '✏️ Edycja wydatku',
    'EXPENSE_DELETE': '🗑️ Usunięcie wydatku',
    'INCOME_ADD': '💰 Dodanie przychodu',
    'INCOME_EDIT': '✏️ Edycja przychodu',
    'INCOME_DELETE': '🗑️ Usunięcie przychodu',
    'CORRECTION_ADD': '🔧 Korekta środków',
    'CATEGORY_ADD': '🏷️ Dodanie kategorii',
    'CATEGORY_DELETE': '🗑️ Usunięcie kategorii',
    'SETTINGS_UPDATE': '⚙️ Aktualizacja ustawień',
    'BUDGET_USER_ADD': '👤 Dodanie użytkownika budżetu',
    'BUDGET_USER_EDIT': '✏️ Edycja użytkownika budżetu',
    'BUDGET_USER_DELETE': '🗑️ Usunięcie użytkownika budżetu',
    'PROFILE_UPDATE': '👤 Aktualizacja profilu',
    'LOGS_CLEARED': '🗑️ Wyczyszczenie logów',
    'ENVELOPE_UPDATE': '📩 Aktualizacja koperty dnia'
  };
  
  return {
    label: actionLabels[logEntry.action] || logEntry.action,
    timestamp: `${logEntry.date} ${logEntry.time}`,
    details: logEntry.details
  };
}
