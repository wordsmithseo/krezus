// src/modules/dataManager.js - Z AUTOMATYCZNĄ MIGRACJĄ realised → type

import { ref, get, set, update, push, serverTimestamp, onValue } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { getWarsawDateString, getCurrentTimeString, shouldBeRealisedNow, getWarsawTimeString } from '../utils/dateHelpers.js';
import { getCategoryIcon } from '../utils/iconMapper.js';

let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let endDate1Cache = '';
let endDate2Cache = '';
let savingsCache = { current: 0, history: [] };
let dailyEnvelopeCache = null;

let activeListeners = {};
let currentCachedUserId = null;
let autoRealisingInProgress = false;

let categoriesDebounceTimeout = null;
let expensesDebounceTimeout = null;
let incomesDebounceTimeout = null;

/**
 * Migruj starą strukturę (realised) na nową (type)
 */
function migrateTransaction(transaction) {
  if (!transaction) return transaction;
  
  // Jeśli już ma type, nie migruj
  if (transaction.type) return transaction;
  
  // Migruj z realised na type
  if (transaction.realised !== undefined) {
    transaction.type = transaction.realised ? 'normal' : 'planned';
    delete transaction.realised;
    delete transaction.planned;
  } else {
    // Domyślnie normal
    transaction.type = 'normal';
  }
  
  return transaction;
}

/**
 * Pobierz ścieżkę do budżetu użytkownika
 */
function getUserBudgetPath(path = '') {
  const userId = getUserId();
  if (!userId) {
    throw new Error('Użytkownik nie jest zalogowany');
  }
  
  if (currentCachedUserId && currentCachedUserId !== userId) {
    console.warn('⚠️ Wykryto zmianę użytkownika! Czyszczenie cache...');
    clearCacheInternal();
  }
  
  currentCachedUserId = userId;
  return `users/${userId}/budget/${path}`;
}

function clearCacheInternal() {
  categoriesCache = [];
  incomesCache = [];
  expensesCache = [];
  endDate1Cache = '';
  endDate2Cache = '';
  savingsCache = { current: 0, history: [] };
  dailyEnvelopeCache = null;
  currentCachedUserId = null;
}

/**
 * Załaduj kategorie z Firebase
 */
export async function loadCategories() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('categories')));
    const data = snapshot.val() || {};
    const newCategories = Object.values(data);

    const uniqueCategories = [];
    const seenIds = new Set();
    const seenNames = new Set();
    let needsMigration = false;

    newCategories.forEach(cat => {
      if (!cat) return;

      // MIGRACJA: dodaj ID jeśli kategoria go nie ma
      if (!cat.id) {
        cat.id = `cat_${crypto.randomUUID()}`;
        needsMigration = true;
      }

      // MIGRACJA: odśwież ikonę na podstawie nazwy (zawsze)
      // Używamy inteligentnego systemu dopasowania dla najlepszych wyników
      const smartIcon = getCategoryIcon(cat.name);
      if (!cat.icon || cat.icon !== smartIcon) {
        cat.icon = smartIcon;
        needsMigration = true;
      }

      // Unikalne kategorie - sprawdzaj zarówno ID jak i nazwę
      if (!seenIds.has(cat.id) && !seenNames.has(cat.name)) {
        seenIds.add(cat.id);
        seenNames.add(cat.name);
        uniqueCategories.push(cat);
      }
    });

    categoriesCache = uniqueCategories;

    // Zapisz zmigrowane dane
    if (needsMigration) {
  await saveCategories(categoriesCache);
    }

    return categoriesCache;
  } catch (error) {
    console.error('❌ Błąd ładowania kategorii:', error);
    return [];
  }
}

/**
 * Załaduj wydatki z Firebase + MIGRACJA
 */
export async function loadExpenses() {
  try {
    const path = getUserBudgetPath('expenses');
    const snapshot = await get(ref(db, path));
    const data = snapshot.val() || {};
    const newExpenses = Object.values(data);
    
    
    const uniqueExpenses = [];
    const seenIds = new Set();
    let needsMigration = false;
    
    newExpenses.forEach(exp => {
      if (exp && exp.id && !seenIds.has(exp.id)) {
        seenIds.add(exp.id);
        
        // MIGRACJA
        const migrated = migrateTransaction(exp);
        if (migrated.type && !exp.type) {
          needsMigration = true;
        }
        
        uniqueExpenses.push(migrated);
      }
    });
    
    expensesCache = uniqueExpenses;
    
    // Zapisz zmigrowane dane
    if (needsMigration) {
  await saveExpenses(expensesCache);
    }
    
    return expensesCache;
  } catch (error) {
    console.error('❌ Błąd ładowania wydatków:', error);
    return [];
  }
}

/**
 * Załaduj przychody z Firebase + MIGRACJA
 */
export async function loadIncomes() {
  try {
    const path = getUserBudgetPath('incomes');
    const snapshot = await get(ref(db, path));
    const data = snapshot.val() || {};
    const newIncomes = Object.values(data);
    
    
    const uniqueIncomes = [];
    const seenIds = new Set();
    let needsMigration = false;
    
    newIncomes.forEach(inc => {
      if (inc && inc.id && !seenIds.has(inc.id)) {
        seenIds.add(inc.id);
        
        // MIGRACJA
        const migrated = migrateTransaction(inc);
        if (migrated.type && !inc.type) {
          needsMigration = true;
        }
        
        uniqueIncomes.push(migrated);
      }
    });
    
    incomesCache = uniqueIncomes;
    
    // Zapisz zmigrowane dane
    if (needsMigration) {
  await saveIncomes(incomesCache);
    }
    
    return incomesCache;
  } catch (error) {
    console.error('❌ Błąd ładowania przychodów:', error);
    return [];
  }
}

/**
 * Załaduj daty końcowe
 */
export async function loadEndDates() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('endDate')));
    const data = snapshot.val();
    
    if (typeof data === 'string') {
      endDate1Cache = data;
      endDate2Cache = '';
    } else if (data && typeof data === 'object') {
      endDate1Cache = data.primary || '';
      endDate2Cache = data.secondary || '';
    } else {
      endDate1Cache = '';
      endDate2Cache = '';
    }
    
    return { primary: endDate1Cache, secondary: endDate2Cache };
  } catch (error) {
    console.error('❌ Błąd ładowania dat końcowych:', error);
    return { primary: '', secondary: '' };
  }
}

/**
 * Załaduj oszczędności (current + history) z Firebase
 */
export async function loadSavings() {
  try {
    const uid = getUserId();
    const snapshot = await get(ref(db, `users/${uid}/savings`));
    const val = snapshot.val() ?? {};
    const current = Number.isFinite(Number(val.current)) ? Number(val.current) : 0;
    const history = Object.entries(val.history ?? {})
      .map(([id, h]) => ({ id, ...h }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    savingsCache = { current, history };
    return savingsCache;
  } catch (error) {
    console.error('❌ Błąd ładowania oszczędności:', error);
    return { current: 0, history: [] };
  }
}


/**
 * Załaduj budżety celowe z Firebase
 */
export async function loadPurposeBudgets() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('purposeBudgets')));
    const data = snapshot.val() || {};
    const budgets = Object.values(data);

    const uniqueBudgets = [];
    const seenIds = new Set();

    budgets.forEach(budget => {
      if (budget && budget.id && !seenIds.has(budget.id)) {
        seenIds.add(budget.id);
        uniqueBudgets.push(budget);
      }
    });

    purposeBudgetsCache = uniqueBudgets;
    return purposeBudgetsCache;
  } catch (error) {
    console.error('❌ Błąd ładowania budżetów celowych:', error);
    return [];
  }
}

/**
 * Załaduj kopertę dnia
 */
export async function loadDailyEnvelope(dateStr) {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath(`daily_envelope/${dateStr}`)));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('❌ Błąd ładowania koperty dnia:', error);
    return null;
  }
}

/**
 * Zapisz kategorie
 */
export async function saveCategories(categories) {
  const obj = {};
  const seenIds = new Set();
  
  categories.forEach(cat => {
    if (cat && cat.id && !seenIds.has(cat.id)) {
      seenIds.add(cat.id);
      obj[cat.id] = cat;
    }
  });
  
  try {
    await set(ref(db, getUserBudgetPath('categories')), obj);
    categoriesCache = Object.values(obj);
  } catch (error) {
    console.error('❌ Błąd zapisywania kategorii:', error);
    throw error;
  }
}

/**
 * Zapisz wydatki
 */
export async function saveExpenses(expenses) {
  const obj = {};
  const seenIds = new Set();

  expenses.forEach(exp => {
    if (exp && exp.id && !seenIds.has(exp.id)) {
      seenIds.add(exp.id);
      obj[exp.id] = exp;
    }
  });
  
  try {
    const path = getUserBudgetPath('expenses');
    await set(ref(db, path), obj);
    expensesCache = Object.values(obj);
  } catch (error) {
    console.error('❌ Błąd zapisywania wydatków:', error);
    throw error;
  }
}

/**
 * Zapisz przychody
 */
export async function saveIncomes(incomes) {
  const obj = {};
  const seenIds = new Set();

  incomes.forEach(inc => {
    if (inc && inc.id && !seenIds.has(inc.id)) {
      seenIds.add(inc.id);
      obj[inc.id] = inc;
    }
  });
  
  try {
    const path = getUserBudgetPath('incomes');
    await set(ref(db, path), obj);
    incomesCache = Object.values(obj);
  } catch (error) {
    console.error('❌ Błąd zapisywania przychodów:', error);
    throw error;
  }
}

/**
 * Zapisz daty końcowe
 */
export async function saveEndDates(primary, secondary) {
  try {
    await set(ref(db, getUserBudgetPath('endDate')), { 
      primary: primary || '', 
      secondary: secondary || '' 
    });
    endDate1Cache = primary || '';
    endDate2Cache = secondary || '';
  } catch (error) {
    console.error('❌ Błąd zapisywania dat końcowych:', error);
    throw error;
  }
}

/**
 * Zaktualizuj kwotę oszczędności i zapisz wpis w historii
 */
export async function updateSavings({ newAmount, note = '', date, byUserId }) {
  try {
    const uid = getUserId();
    const historyRef = ref(db, `users/${uid}/savings/history`);
    const newEntryRef = push(historyRef);
    await update(ref(db), {
      [`users/${uid}/savings/current`]: newAmount,
      [`users/${uid}/savings/history/${newEntryRef.key}`]: {
        date,
        fromAmount: savingsCache.current,
        toAmount: newAmount,
        userId: byUserId,
        note,
        createdAt: serverTimestamp()
      }
    });
  } catch (error) {
    console.error('❌ Błąd zapisywania oszczędności:', error);
    throw error;
  }
}


/**
 * Zapisz budżety celowe
 */
export async function savePurposeBudgets(budgets) {
  const obj = {};
  const seenIds = new Set();

  budgets.forEach(budget => {
    if (budget && budget.id && !seenIds.has(budget.id)) {
      seenIds.add(budget.id);
      obj[budget.id] = budget;
    }
  });

  try {
    await set(ref(db, getUserBudgetPath('purposeBudgets')), obj);
    purposeBudgetsCache = Object.values(obj);
  } catch (error) {
    console.error('❌ Błąd zapisywania budżetów celowych:', error);
    throw error;
  }
}

/**
 * Zapisz kopertę dnia
 */
export async function saveDailyEnvelope(dateStr, envelope) {
  try {
    await set(ref(db, getUserBudgetPath(`daily_envelope/${dateStr}`)), envelope);
    if (dateStr === getWarsawDateString()) {
      dailyEnvelopeCache = envelope;
    }
  } catch (error) {
    console.error('❌ Błąd zapisywania koperty dnia:', error);
    throw error;
  }
}

/**
 * Pobierz wszystkie dane
 */
export async function fetchAllData() {
  try {
    const [categories, expenses, incomes, endDates, savings] = await Promise.all([
      loadCategories(),
      loadExpenses(),
      loadIncomes(),
      loadEndDates(),
      loadSavings()
    ]);

    const todayStr = getWarsawDateString();
    dailyEnvelopeCache = await loadDailyEnvelope(todayStr);

    return {
      categories,
      expenses,
      incomes,
      endDates,
      savings,
      dailyEnvelope: dailyEnvelopeCache
    };
  } catch (error) {
    console.error('❌ Błąd ładowania danych:', error);
    throw error;
  }
}

/**
 * Automatycznie realizuj planowane transakcje z przeszłości
 */
export async function autoRealiseDueTransactions() {
  if (autoRealisingInProgress) return { incomesUpdated: false, expensesUpdated: false };
  autoRealisingInProgress = true;

  let incomesUpdated = false;
  let expensesUpdated = false;

  try {
  incomesCache.forEach(inc => {
    if (shouldBeRealisedNow(inc)) {
      inc.type = 'normal';
      inc.wasPlanned = true;
      if (!inc.time || inc.time.trim() === '') {
        inc.time = getWarsawTimeString();
      }
      incomesUpdated = true;
    }
  });

  expensesCache.forEach(exp => {
    if (shouldBeRealisedNow(exp)) {
      exp.type = 'normal';
      exp.wasPlanned = true;
      if (!exp.time || exp.time.trim() === '') {
        exp.time = getWarsawTimeString();
      }
      expensesUpdated = true;
    }
  });

  if (incomesUpdated) {
    await saveIncomes(incomesCache);
  }

  if (expensesUpdated) {
    await saveExpenses(expensesCache);
  }

  return { incomesUpdated, expensesUpdated };
  } finally {
    autoRealisingInProgress = false;
  }
}

/**
 * Wyczyść wszystkie listenery
 */
export function clearAllListeners() {
  clearTimeout(categoriesDebounceTimeout);
  clearTimeout(expensesDebounceTimeout);
  clearTimeout(incomesDebounceTimeout);
  categoriesDebounceTimeout = null;
  expensesDebounceTimeout = null;
  incomesDebounceTimeout = null;

  Object.entries(activeListeners).forEach(([key, unsubscribe]) => {
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe();
      } catch (error) {
        console.error('❌ Błąd usuwania listenera:', key, error);
      }
    }
  });

  activeListeners = {};
}

/**
 * Subskrybuj real-time updates
 */
export function subscribeToRealtimeUpdates(userId, callbacks) {
  clearAllListeners();
  
  if (!userId) {
    console.error('❌ Brak zalogowanego użytkownika');
    return;
  }
  
  // Categories
  const categoriesRef = ref(db, getUserBudgetPath('categories'));
  activeListeners.categories = onValue(categoriesRef, (snapshot) => {
    clearTimeout(categoriesDebounceTimeout);
    categoriesDebounceTimeout = setTimeout(() => {
      const data = snapshot.val() || {};
      const newData = Object.values(data);
      
      const uniqueData = [];
      const seenIds = new Set();
      newData.forEach(item => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueData.push(item);
        }
      });
      
      if (JSON.stringify(categoriesCache) !== JSON.stringify(uniqueData)) {
        categoriesCache = uniqueData;
        if (callbacks.onCategoriesChange) {
          callbacks.onCategoriesChange(categoriesCache);
        }
      }
    }, 100);
  });
  
  // Expenses
  const expensesRef = ref(db, getUserBudgetPath('expenses'));
  activeListeners.expenses = onValue(expensesRef, (snapshot) => {
    clearTimeout(expensesDebounceTimeout);
    expensesDebounceTimeout = setTimeout(() => {
      const data = snapshot.val() || {};
      const newData = Object.values(data);
      
      const uniqueData = [];
      const seenIds = new Set();
      newData.forEach(item => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueData.push(migrateTransaction(item));
        }
      });
      
      if (JSON.stringify(expensesCache) !== JSON.stringify(uniqueData)) {
        expensesCache = uniqueData;
        if (callbacks.onExpensesChange) {
          callbacks.onExpensesChange(expensesCache);
        }
      }
    }, 100);
  });
  
  // Incomes
  const incomesRef = ref(db, getUserBudgetPath('incomes'));
  activeListeners.incomes = onValue(incomesRef, (snapshot) => {
    clearTimeout(incomesDebounceTimeout);
    incomesDebounceTimeout = setTimeout(() => {
      const data = snapshot.val() || {};
      const newData = Object.values(data);
      
      const uniqueData = [];
      const seenIds = new Set();
      newData.forEach(item => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueData.push(migrateTransaction(item));
        }
      });
      
      if (JSON.stringify(incomesCache) !== JSON.stringify(uniqueData)) {
        incomesCache = uniqueData;
        if (callbacks.onIncomesChange) {
          callbacks.onIncomesChange(incomesCache);
        }
      }
    }, 100);
  });
  
  // EndDates
  const endDateRef = ref(db, getUserBudgetPath('endDate'));
  activeListeners.endDate = onValue(endDateRef, (snapshot) => {
    const data = snapshot.val() || {};
    let newPrimary, newSecondary;
    
    if (typeof data === 'string') {
      newPrimary = data;
      newSecondary = '';
    } else {
      newPrimary = data.primary || '';
      newSecondary = data.secondary || '';
    }
    
    if (endDate1Cache !== newPrimary || endDate2Cache !== newSecondary) {
      endDate1Cache = newPrimary;
      endDate2Cache = newSecondary;
      if (callbacks.onEndDatesChange) {
        callbacks.onEndDatesChange({ primary: endDate1Cache, secondary: endDate2Cache });
      }
    }
  });
  
  // Savings
  const savingsRef = ref(db, `users/${userId}/savings`);
  activeListeners.savings = onValue(savingsRef, (snapshot) => {
    const val = snapshot.val() ?? {};
    const newCurrent = Number.isFinite(Number(val.current)) ? Number(val.current) : 0;
    const history = Object.entries(val.history ?? {})
      .map(([id, h]) => ({ id, ...h }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const changed = savingsCache.current !== newCurrent;
    savingsCache = { current: newCurrent, history };
    if (changed && callbacks.onSavingGoalChange) {
      callbacks.onSavingGoalChange(newCurrent);
    }
  });

  // DailyEnvelope
  const todayStr = getWarsawDateString();
  const envelopeRef = ref(db, getUserBudgetPath(`daily_envelope/${todayStr}`));
  activeListeners.envelope = onValue(envelopeRef, (snapshot) => {
    if (snapshot.exists()) {
      const newEnvelope = snapshot.val();
      if (JSON.stringify(dailyEnvelopeCache) !== JSON.stringify(newEnvelope)) {
        dailyEnvelopeCache = newEnvelope;
        if (callbacks.onDailyEnvelopeChange) {
          callbacks.onDailyEnvelopeChange(dailyEnvelopeCache);
        }
      }
    }
  });
  
}

/**
 * Wyczyść cache
 */
export function clearCache() {
  clearCacheInternal();
}

/**
 * Gettery
 */
export function getCategories() {
  return [...categoriesCache];
}

export function getExpenses() {
  return [...expensesCache];
}

export function getIncomes() {
  return [...incomesCache];
}

export function getEndDates() {
  return { primary: endDate1Cache, secondary: endDate2Cache };
}

export function getSavingGoal() {
  return savingsCache.current;
}

export function getSavings() {
  return { ...savingsCache, history: [...savingsCache.history] };
}


export function getDailyEnvelope() {
  return dailyEnvelopeCache ? { ...dailyEnvelopeCache } : null;
}

export function getPurposeBudgets() {
  return [...purposeBudgetsCache];
}

export async function getForceRecalcDate() {
  const userId = getUserId();
  if (!userId) return null;
  const snap = await get(ref(db, `users/${userId}/settings/forceRecalcDate`));
  return snap.exists() ? snap.val() : null;
}

export async function setForceRecalcDate(dateStr) {
  const userId = getUserId();
  if (!userId) return;
  await set(ref(db, `users/${userId}/settings/forceRecalcDate`), dateStr);
}