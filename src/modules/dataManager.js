// src/modules/dataManager.js - NAPRAWIONY: Indywidualne budżety bez przecieków danych

import { ref, get, set, onValue } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

/**
 * KRYTYCZNE: Każdy użytkownik ma swój własny budżet
 * Ścieżka danych: users/{userId}/budget/
 * NIE MOŻE być przecieków danych między użytkownikami!
 */

let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let endDate1Cache = '';
let endDate2Cache = '';
let savingGoalCache = 0;
let dailyEnvelopeCache = null;

// Referencje do listenerów - MUSI być czyszczone przy wylogowaniu
let activeListeners = {};

// ID aktualnego użytkownika - dla weryfikacji
let currentCachedUserId = null;

/**
 * Pobierz ścieżkę do budżetu użytkownika
 */
function getUserBudgetPath(path = '') {
  const userId = getUserId();
  if (!userId) {
    throw new Error('Użytkownik nie jest zalogowany');
  }
  
  // KRYTYCZNE: Sprawdź czy cache jest dla tego samego użytkownika
  if (currentCachedUserId && currentCachedUserId !== userId) {
    console.warn('⚠️ Wykryto zmianę użytkownika! Czyszczenie cache...');
    clearCacheInternal();
  }
  
  currentCachedUserId = userId;
  return `users/${userId}/budget/${path}`;
}

/**
 * Wewnętrzne czyszczenie cache (nie eksportowane)
 */
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
    
    // Usuń duplikaty na podstawie ID
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
 * Załaduj wydatki z Firebase
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
    
    // Usuń duplikaty na podstawie ID
    const uniqueExpenses = [];
    const seenIds = new Set();
    
    newExpenses.forEach(exp => {
      if (exp && exp.id && !seenIds.has(exp.id)) {
        seenIds.add(exp.id);
        uniqueExpenses.push(exp);
      } else if (exp && exp.id) {
        console.warn('⚠️ Duplikat wydatku wykryty i pominięty:', exp.id);
      }
    });
    
    expensesCache = uniqueExpenses;
    console.log('✅ Załadowano unikalne wydatki:', expensesCache.length);
    return expensesCache;
  } catch (error) {
    console.error('❌ Błąd ładowania wydatków:', error);
    return [];
  }
}

/**
 * Załaduj źródła finansów z Firebase
 */
export async function loadIncomes() {
  try {
    const userId = getUserId();
    const path = getUserBudgetPath('incomes');
    
    console.log('📥 Ładowanie przychodów dla użytkownika:', userId);
    console.log('📍 Ścieżka:', path);
    
    const snapshot = await get(ref(db, path));
    const data = snapshot.val() || {};
    const newIncomes = Object.values(data);
    
    console.log('📊 Pobrano z Firebase:', newIncomes.length, 'przychodów');
    
    // Usuń duplikaty na podstawie ID
    const uniqueIncomes = [];
    const seenIds = new Set();
    
    newIncomes.forEach(inc => {
      if (inc && inc.id && !seenIds.has(inc.id)) {
        seenIds.add(inc.id);
        uniqueIncomes.push(inc);
      } else if (inc && inc.id) {
        console.warn('⚠️ Duplikat przychodu wykryty i pominięty:', inc.id);
      }
    });
    
    incomesCache = uniqueIncomes;
    console.log('✅ Załadowano unikalne przychody:', incomesCache.length);
    
    return incomesCache;
  } catch (error) {
    console.error('❌ Błąd ładowania źródeł finansów:', error);
    return [];
  }
}

/**
 * Załaduj daty końcowe okresów budżetowych
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
 * Zapisz kategorie do Firebase
 */
export async function saveCategories(categories) {
  const obj = {};
  const seenIds = new Set();
  
  // Usuń duplikaty przed zapisem
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
 * Zapisz wydatki do Firebase
 */
export async function saveExpenses(expenses) {
  const userId = getUserId();
  const obj = {};
  const seenIds = new Set();
  
  console.log('💾 Zapisywanie wydatków dla użytkownika:', userId);
  console.log('📊 Liczba wydatków do zapisu:', expenses.length);
  
  // Usuń duplikaty przed zapisem
  expenses.forEach(exp => {
    if (exp && exp.id && !seenIds.has(exp.id)) {
      seenIds.add(exp.id);
      obj[exp.id] = exp;
    } else if (exp && exp.id) {
      console.warn('⚠️ Duplikat wydatku pominięty podczas zapisu:', exp.id);
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
 * Zapisz źródła finansów do Firebase
 */
export async function saveIncomes(incomes) {
  const userId = getUserId();
  const obj = {};
  const seenIds = new Set();
  
  console.log('💾 Zapisywanie przychodów dla użytkownika:', userId);
  console.log('📊 Liczba przychodów do zapisu:', incomes.length);
  
  // Usuń duplikaty przed zapisem
  incomes.forEach(inc => {
    if (inc && inc.id && !seenIds.has(inc.id)) {
      seenIds.add(inc.id);
      obj[inc.id] = inc;
    } else if (inc && inc.id) {
      console.warn('⚠️ Duplikat przychodu pominięty podczas zapisu:', inc.id);
    }
  });
  
  try {
    const path = getUserBudgetPath('incomes');
    console.log('📍 Zapisywanie do ścieżki:', path);
    
    await set(ref(db, path), obj);
    incomesCache = Object.values(obj);
    
    console.log('✅ Zapisano unikalne przychody:', incomesCache.length);
  } catch (error) {
    console.error('❌ Błąd zapisywania źródeł finansów:', error);
    throw error;
  }
}

/**
 * Zapisz daty końcowe okresów
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
 * Pobierz wszystkie dane budżetu użytkownika
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
 * Automatycznie realizuj planowane transakcje, których termin minął
 */
export async function autoRealiseDueTransactions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let incomesUpdated = false;
  let expensesUpdated = false;
  
  incomesCache.forEach(inc => {
    if (inc && inc.planned && inc.date) {
      const dueDate = new Date(inc.date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate.getTime() <= today.getTime()) {
        inc.wasPlanned = true;
        inc.planned = false;
        
        if (!inc.time || inc.time.trim() === '') {
          inc.time = getCurrentTimeString();
        }
        
        incomesUpdated = true;
      }
    }
  });
  
  expensesCache.forEach(exp => {
    if (exp && exp.planned && exp.date) {
      const dueDate = new Date(exp.date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate.getTime() <= today.getTime()) {
        exp.wasPlanned = true;
        exp.planned = false;
        
        if (!exp.time || exp.time.trim() === '') {
          exp.time = getCurrentTimeString();
        }
        
        expensesUpdated = true;
      }
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
 * Wyczyść wszystkie aktywne listenery
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
 * Nasłuchuj zmian w czasie rzeczywistym
 */
export function subscribeToRealtimeUpdates(callbacks) {
  // KRYTYCZNE: Wyczyść poprzednie listenery
  clearAllListeners();
  
  const userId = getUserId();
  if (!userId) {
    console.error('❌ Brak zalogowanego użytkownika - nie można subskrybować');
    return;
  }
  
  console.log('🔔 Konfigurowanie listenerów Real-time dla użytkownika:', userId);
  
  // Categories listener
  const categoriesRef = ref(db, getUserBudgetPath('categories'));
  activeListeners.categories = onValue(categoriesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const newData = Object.values(data);
    
    // Usuń duplikaty
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
  }, (error) => {
    console.error('❌ Błąd listenera kategorii:', error);
  });
  
  // Expenses listener
  const expensesRef = ref(db, getUserBudgetPath('expenses'));
  activeListeners.expenses = onValue(expensesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const newData = Object.values(data);
    
    // Usuń duplikaty
    const uniqueData = [];
    const seenIds = new Set();
    newData.forEach(item => {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueData.push(item);
      } else if (item && item.id) {
        console.warn('⚠️ Duplikat wydatku w listenerze:', item.id);
      }
    });
    
    if (JSON.stringify(expensesCache) !== JSON.stringify(uniqueData)) {
      expensesCache = uniqueData;
      console.log('🔄 Wydatki zaktualizowane:', expensesCache.length);
      if (callbacks.onExpensesChange) {
        callbacks.onExpensesChange(expensesCache);
      }
    }
  }, (error) => {
    console.error('❌ Błąd listenera wydatków:', error);
  });
  
  // Incomes listener
  const incomesRef = ref(db, getUserBudgetPath('incomes'));
  activeListeners.incomes = onValue(incomesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const newData = Object.values(data);
    
    console.log('🔄 Listener przychodów wywołany:', {
      userId,
      dataCount: newData.length,
      path: `users/${userId}/budget/incomes`
    });
    
    // Usuń duplikaty
    const uniqueData = [];
    const seenIds = new Set();
    newData.forEach(item => {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueData.push(item);
      } else if (item && item.id) {
        console.warn('⚠️ Duplikat przychodu w listenerze:', item.id);
      }
    });
    
    if (JSON.stringify(incomesCache) !== JSON.stringify(uniqueData)) {
      incomesCache = uniqueData;
      console.log('✅ Przychody zaktualizowane:', incomesCache.length);
      if (callbacks.onIncomesChange) {
        callbacks.onIncomesChange(incomesCache);
      }
    }
  }, (error) => {
    console.error('❌ Błąd listenera przychodów:', error);
  });
  
  // End dates listener
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
  }, (error) => {
    console.error('❌ Błąd listenera dat końcowych:', error);
  });
  
  // Saving goal listener
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
  }, (error) => {
    console.error('❌ Błąd listenera celu oszczędności:', error);
  });
  
  // Daily envelope listener
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
  }, (error) => {
    console.error('❌ Błąd listenera koperty dnia:', error);
  });
  
  console.log('✅ Wszystkie listenery skonfigurowane:', Object.keys(activeListeners));
}

/**
 * Wyczyść cache przy wylogowaniu - PUBLICZNE
 */
export function clearCache() {
  console.log('🧹 Czyszczenie cache danych...');
  clearCacheInternal();
  console.log('✅ Cache wyczyszczony');
}

/**
 * Gettery - ZAWSZE zwracają kopie, nigdy referencje
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