// src/modules/logger.js
import { ref, get, set, push, remove } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

export async function log(action, details = {}) {
  try {
    const userId = getUserId();
    if (!userId) return;
    
    const budgetUser = details.budgetUser || 'System';
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      date: getWarsawDateString(),
      time: getCurrentTimeString(),
      action,
      details,
      userId,
      budgetUser: budgetUser,
      isSystemAction: budgetUser === 'System'
    };
    
    const logsRef = ref(db, `users/${userId}/logs`);
    await push(logsRef, logEntry);
    
    console.log('📝 Log:', action, details);
  } catch (error) {
    console.error('❌ Błąd zapisu logu:', error);
  }
}

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
    
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Ogranicz do 50 ostatnich wpisów
    return logs.slice(0, 50);
  } catch (error) {
    console.error('❌ Błąd pobierania logów:', error);
    return [];
  }
}

export async function clearAllLogs(budgetUserName = 'System') {
  try {
    const userId = getUserId();
    if (!userId) return;
    
    const logsRef = ref(db, `users/${userId}/logs`);
    await remove(logsRef);
    
    console.log('✅ Logi wyczyszczone');
    
    await log('LOGS_CLEARED', { 
      message: 'Wszystkie logi zostały wyczyszczone',
      budgetUser: budgetUserName
    });
  } catch (error) {
    console.error('❌ Błąd czyszczenia logów:', error);
    throw error;
  }
}

export function calculateLogsSize(logs) {
  const jsonString = JSON.stringify(logs);
  const bytes = new Blob([jsonString]).size;
  return (bytes / 1024).toFixed(2);
}

export function formatLogEntry(logEntry) {
  const actionLabels = {
    'USER_LOGIN': 'Logowanie',
    'USER_LOGOUT': 'Wylogowanie',
    'USER_REGISTER': 'Rejestracja',
    'EXPENSE_ADD': 'Dodanie wydatku',
    'EXPENSE_EDIT': 'Edycja wydatku',
    'EXPENSE_DELETE': 'Usunięcie wydatku',
    'EXPENSE_REALISE': 'Realizacja planowanego wydatku',
    'INCOME_ADD': 'Dodanie przychodu',
    'INCOME_EDIT': 'Edycja przychodu',
    'INCOME_DELETE': 'Usunięcie przychodu',
    'INCOME_REALISE': 'Realizacja planowanego przychodu',
    'CORRECTION_ADD': 'Korekta środków',
    'CATEGORY_ADD': 'Dodanie kategorii',
    'CATEGORY_DELETE': 'Usunięcie kategorii',
    'CATEGORY_EDIT': 'Edycja kategorii',
    'SETTINGS_UPDATE': 'Aktualizacja ustawień',
    'BUDGET_USER_ADD': 'Dodanie użytkownika budżetu',
    'BUDGET_USER_EDIT': 'Edycja użytkownika budżetu',
    'BUDGET_USER_DELETE': 'Usunięcie użytkownika budżetu',
    'PROFILE_UPDATE': 'Aktualizacja profilu',
    'LOGS_CLEARED': 'Wyczyszczenie logów',
    'ENVELOPE_UPDATE': 'Aktualizacja koperty dnia',
    'AUTO_REALISE': 'Automatyczna realizacja transakcji',
    'PURPOSE_BUDGET_ADD': 'Dodanie budżetu celowego',
    'PURPOSE_BUDGET_EDIT': 'Edycja budżetu celowego',
    'PURPOSE_BUDGET_DELETE': 'Usunięcie budżetu celowego',
    'SAVINGS_UPDATE': 'Zmiana kwoty oszczędności',
    'ENVELOPE_FORCE_RECALC': 'Wymuszone przeliczenie koperty dnia'
  };
  
  let userName = null;
  
  if (logEntry.isSystemAction || logEntry.budgetUser === 'System') {
    userName = 'System';
  } else if (logEntry.budgetUser) {
    userName = logEntry.budgetUser;
  }
  
  const processedDetails = { ...logEntry.details };
  
  delete processedDetails.budgetUser;
  delete processedDetails.isSystemAction;
  
  return {
    label: actionLabels[logEntry.action] || logEntry.action,
    timestamp: `${logEntry.date} ${logEntry.time}`,
    userName: userName,
    details: processedDetails
  };
}