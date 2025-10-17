// src/modules/dataManager.js - Z AUTOMATYCZNĄ MIGRACJĄ realised → type

import { ref, get, set, update, onValue } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let endDate1Cache = '';
let endDate2Cache = '';
let savingGoalCache = 0;
let dailyEnvelopeCache = null;

let activeListeners = {};
let currentCachedUserId = null;

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
    console.log('🔄 Migracja transakcji:', transaction.id, '→ type:', transaction.type);
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
  savingGoalCache = 0;
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
    
    newCategories.forEach(cat => {
      if (cat && cat.id && !seenIds.has(cat.id)) {
        seenIds.add(cat.id);
        uniqueCategories.push(cat);
      }
    });
    
    categoriesCache = uniqueCategories;
    console.log('✅ Załadowano kategorie:', categoriesCache.length);
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
    const userId = getUserId();
    const path = getUserBudgetPath('expenses');
    
    console.log('📥 Ładowanie wydatków dla użytkownika:', userId);
    
    const snapshot = await get(ref(db, path));
    const data = snapshot.val() || {};
    const newExpenses = Object.values(data);
    
    console.log('📊 Pobrano z Firebase:', newExpenses.length, 'wydatków');
    
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
      console.log('💾 Zapisywanie zmigrowanych wydatków...');
      await saveExpenses(expensesCache);
    }
    
    console.log('✅ Załadowano unikalne wydatki:', expensesCache.length);
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
    const userId = getUserId();
    const path = getUserBudgetPath('incomes');
    
    console.log('📥 Ładowanie przychodów dla użytkownika:', userId);
    
    const snapshot = await get(ref(db, path));
    const data = snapshot.val() || {};
    const newIncomes = Object.values(data);
    
    console.log('📊 Pobrano z Firebase:', newIncomes.length, 'przychodów');
    
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
      console.log('💾 Zapisywanie zmigrowanych przychodów...');
      await saveIncomes(incomesCache);
    }
    
    console.log('✅ Załadowano unikalne przychody:', incomesCache.length);
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
 * Załaduj cel oszczędności
 */
export async function loadSavingGoal() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('savingGoal')));
    const val = snapshot.val();
    savingGoalCache = val ? parseFloat(val) : 0;
    return savingGoalCache;
  } catch (error) {
    console.error('❌ Błąd ładowania celu oszczędności:', error);
    return 0;
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
    console.log('✅ Zapisano kategorie:', categoriesCache.length);
  } catch (error) {
    console.error('❌ Błąd zapisywania kategorii:', error);
    throw error;
  }
}

/**
 * Zapisz wydatki
 */
export async function saveExpenses(expenses) {
  const userId = getUserId();
  const obj = {};
  const seenIds = new Set();
  
  console.log('💾 Zapisywanie wydatków dla użytkownika:', userId);
  console.log('📊 Liczba wydatków do zapisu:', expenses.length);
  
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
    console.log('✅ Zapisano unikalne wydatki:', expensesCache.length);
  } catch (error) {
    console.error('❌ Błąd zapisywania wydatków:', error);
    throw error;
  }
}

/**
 * Zapisz przychody
 */
export async function saveIncomes(incomes) {
  const userId = getUserId();
  const obj = {};
  const seenIds = new Set();
  
  console.log('💾 Zapisywanie przychodów dla użytkownika:', userId);
  console.log('📊 Liczba przychodów do zapisu:', incomes.length);
  
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
    console.log('✅ Zapisano unikalne przychody:', incomesCache.length);
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
 * Zapisz cel oszczędności
 */
export async function saveSavingGoal(goal) {
  try {
    await set(ref(db, getUserBudgetPath('savingGoal')), goal);
    savingGoalCache = goal;
  } catch (error) {
    console.error('❌ Błąd zapisywania celu oszczędności:', error);
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
    const userId = getUserId();
    console.log('📥 Ładowanie wszystkich danych dla użytkownika:', userId);
    
    const [categories, expenses, incomes, endDates, savingGoal] = await Promise.all([
      loadCategories(),
      loadExpenses(),
      loadIncomes(),
      loadEndDates(),
      loadSavingGoal()
    ]);
    
    const todayStr = getWarsawDateString();
    dailyEnvelopeCache = await loadDailyEnvelope(todayStr);
    
    console.log('✅ Załadowano wszystkie dane:', {
      categories: categories.length,
      expenses: expenses.length,
      incomes: incomes.length,
      userId
    });
    
    return {
      categories,
      expenses,
      incomes,
      endDates,
      savingGoal,
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
  const today = getWarsawDateString();
  
  let incomesUpdated = false;
  let expensesUpdated = false;
  
  incomesCache.forEach(inc => {
    if (inc && inc.type === 'planned' && inc.date < today) {
      inc.type = 'normal';
      inc.wasPlanned = true;
      
      if (!inc.time || inc.time.trim() === '') {
        inc.time = getCurrentTimeString();
      }
      
      incomesUpdated = true;
      console.log('🔄 Auto-realizacja przychodu:', inc.id);
    }
  });
  
  expensesCache.forEach(exp => {
    if (exp && exp.type === 'planned' && exp.date < today) {
      exp.type = 'normal';
      exp.wasPlanned = true;
      
      if (!exp.time || exp.time.trim() === '') {
        exp.time = getCurrentTimeString();
      }
      
      expensesUpdated = true;
      console.log('🔄 Auto-realizacja wydatku:', exp.id);
    }
  });
  
  if (incomesUpdated) {
    await saveIncomes(incomesCache);
  }
  
  if (expensesUpdated) {
    await saveExpenses(expensesCache);
  }
  
  return { incomesUpdated, expensesUpdated };
}

/**
 * Wyczyść wszystkie listenery
 */
export function clearAllListeners() {
  console.log('🧹 Czyszczenie listenerów Firebase...');
  
  Object.entries(activeListeners).forEach(([key, unsubscribe]) => {
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe();
        console.log('✅ Usunięto listener:', key);
      } catch (error) {
        console.error('❌ Błąd usuwania listenera:', key, error);
      }
    }
  });
  
  activeListeners = {};
  console.log('✅ Wszystkie listenery wyczyszczone');
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
  
  console.log('🔔 Konfigurowanie listenerów Real-time dla użytkownika:', userId);
  
  let categoriesTimeout = null;
  let expensesTimeout = null;
  let incomesTimeout = null;
  
  // Categories
  const categoriesRef = ref(db, getUserBudgetPath('categories'));
  activeListeners.categories = onValue(categoriesRef, (snapshot) => {
    clearTimeout(categoriesTimeout);
    categoriesTimeout = setTimeout(() => {
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
        console.log('🔄 Kategorie zaktualizowane:', categoriesCache.length);
        if (callbacks.onCategoriesChange) {
          callbacks.onCategoriesChange(categoriesCache);
        }
      }
    }, 100);
  });
  
  // Expenses
  const expensesRef = ref(db, getUserBudgetPath('expenses'));
  activeListeners.expenses = onValue(expensesRef, (snapshot) => {
    clearTimeout(expensesTimeout);
    expensesTimeout = setTimeout(() => {
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
        console.log('🔄 Wydatki zaktualizowane:', expensesCache.length);
        if (callbacks.onExpensesChange) {
          callbacks.onExpensesChange(expensesCache);
        }
      }
    }, 100);
  });
  
  // Incomes
  const incomesRef = ref(db, getUserBudgetPath('incomes'));
  activeListeners.incomes = onValue(incomesRef, (snapshot) => {
    clearTimeout(incomesTimeout);
    incomesTimeout = setTimeout(() => {
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
        console.log('🔄 Przychody zaktualizowane:', incomesCache.length);
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
  
  // SavingGoal
  const savingGoalRef = ref(db, getUserBudgetPath('savingGoal'));
  activeListeners.savingGoal = onValue(savingGoalRef, (snapshot) => {
    const val = snapshot.val();
    const newGoal = val ? parseFloat(val) : 0;
    
    if (savingGoalCache !== newGoal) {
      savingGoalCache = newGoal;
      if (callbacks.onSavingGoalChange) {
        callbacks.onSavingGoalChange(savingGoalCache);
      }
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
  
  console.log('✅ Wszystkie listenery skonfigurowane:', Object.keys(activeListeners));
}

/**
 * Wyczyść cache
 */
export function clearCache() {
  console.log('🧹 Czyszczenie cache danych...');
  clearCacheInternal();
  console.log('✅ Cache wyczyszczony');
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
  return savingGoalCache;
}

export function getDailyEnvelope() {
  return dailyEnvelopeCache ? { ...dailyEnvelopeCache } : null;
}