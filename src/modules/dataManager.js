// src/modules/dataManager.js - Indywidualne budżety dla każdego użytkownika
import { ref, get, set, onValue, off } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { parseDateStr, parseDateTime, isRealised, getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

/**
 * WAŻNE: Każdy użytkownik ma swój własny budżet
 * Ścieżka danych: users/{userId}/budget/
 */

let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let endDate1Cache = '';
let endDate2Cache = '';
let savingGoalCache = 0;
let dailyEnvelopeCache = null;

// Referencje do listenerów
let activeListeners = {};

/**
 * Pobierz ścieżkę do budżetu użytkownika
 */
function getUserBudgetPath(path = '') {
  const userId = getUserId();
  if (!userId) {
    throw new Error('Użytkownik nie jest zalogowany');
  }
  return `users/${userId}/budget/${path}`;
}

/**
 * Załaduj kategorie z Firebase
 */
export async function loadCategories() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('categories')));
    const data = snapshot.val() || {};
    categoriesCache = Object.values(data);
    return categoriesCache;
  } catch (error) {
    console.error('Błąd ładowania kategorii:', error);
    return [];
  }
}

/**
 * Załaduj wydatki z Firebase
 */
export async function loadExpenses() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('expenses')));
    const data = snapshot.val() || {};
    expensesCache = Object.values(data);
    return expensesCache;
  } catch (error) {
    console.error('Błąd ładowania wydatków:', error);
    return [];
  }
}

/**
 * Załaduj źródła finansów z Firebase
 */
export async function loadIncomes() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('incomes')));
    const data = snapshot.val() || {};
    incomesCache = Object.values(data);
    return incomesCache;
  } catch (error) {
    console.error('Błąd ładowania źródeł finansów:', error);
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
    console.error('Błąd ładowania dat końcowych:', error);
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
    console.error('Błąd ładowania celu oszczędności:', error);
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
    console.error('Błąd ładowania koperty dnia:', error);
    return null;
  }
}

/**
 * Zapisz kategorie do Firebase
 */
export async function saveCategories(categories) {
  const obj = {};
  categories.forEach(cat => {
    obj[cat.id] = cat;
  });
  
  try {
    await set(ref(db, getUserBudgetPath('categories')), obj);
    categoriesCache = categories;
  } catch (error) {
    console.error('Błąd zapisywania kategorii:', error);
    throw error;
  }
}

/**
 * Zapisz wydatki do Firebase
 */
export async function saveExpenses(expenses) {
  const obj = {};
  expenses.forEach(exp => {
    obj[exp.id] = exp;
  });
  
  try {
    await set(ref(db, getUserBudgetPath('expenses')), obj);
    expensesCache = expenses;
  } catch (error) {
    console.error('Błąd zapisywania wydatków:', error);
    throw error;
  }
}

/**
 * Zapisz źródła finansów do Firebase
 */
export async function saveIncomes(incomes) {
  const obj = {};
  incomes.forEach(inc => {
    obj[inc.id] = inc;
  });
  
  try {
    await set(ref(db, getUserBudgetPath('incomes')), obj);
    incomesCache = incomes;
  } catch (error) {
    console.error('Błąd zapisywania źródeł finansów:', error);
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
    console.error('Błąd zapisywania dat końcowych:', error);
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
    console.error('Błąd zapisywania celu oszczędności:', error);
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
    console.error('Błąd zapisywania koperty dnia:', error);
    throw error;
  }
}

/**
 * Pobierz wszystkie dane budżetu użytkownika
 */
export async function fetchAllData() {
  try {
    const [categories, expenses, incomes, endDates, savingGoal] = await Promise.all([
      loadCategories(),
      loadExpenses(),
      loadIncomes(),
      loadEndDates(),
      loadSavingGoal()
    ]);
    
    const todayStr = getWarsawDateString();
    dailyEnvelopeCache = await loadDailyEnvelope(todayStr);
    
    return {
      categories,
      expenses,
      incomes,
      endDates,
      savingGoal,
      dailyEnvelope: dailyEnvelopeCache
    };
  } catch (error) {
    console.error('Błąd ładowania danych:', error);
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
  Object.values(activeListeners).forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  activeListeners = {};
}

/**
 * Nasłuchuj zmian w czasie rzeczywistym
 */
export function subscribeToRealtimeUpdates(callbacks) {
  // Wyczyść poprzednie listenery
  clearAllListeners();
  
  const userId = getUserId();
  if (!userId) return;
  
  // Categories listener
  const categoriesRef = ref(db, getUserBudgetPath('categories'));
  activeListeners.categories = onValue(categoriesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const newData = Object.values(data);
    
    // Sprawdź czy dane się zmieniły
    if (JSON.stringify(categoriesCache) !== JSON.stringify(newData)) {
      categoriesCache = newData;
      if (callbacks.onCategoriesChange) {
        callbacks.onCategoriesChange(categoriesCache);
      }
    }
  });
  
  // Expenses listener
  const expensesRef = ref(db, getUserBudgetPath('expenses'));
  activeListeners.expenses = onValue(expensesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const newData = Object.values(data);
    
    if (JSON.stringify(expensesCache) !== JSON.stringify(newData)) {
      expensesCache = newData;
      if (callbacks.onExpensesChange) {
        callbacks.onExpensesChange(expensesCache);
      }
    }
  });
  
  // Incomes listener
  const incomesRef = ref(db, getUserBudgetPath('incomes'));
  activeListeners.incomes = onValue(incomesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const newData = Object.values(data);
    
    if (JSON.stringify(incomesCache) !== JSON.stringify(newData)) {
      incomesCache = newData;
      if (callbacks.onIncomesChange) {
        callbacks.onIncomesChange(incomesCache);
      }
    }
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
  });
}

/**
 * Wyczyść cache przy wylogowaniu
 */
export function clearCache() {
  categoriesCache = [];
  incomesCache = [];
  expensesCache = [];
  endDate1Cache = '';
  endDate2Cache = '';
  savingGoalCache = 0;
  dailyEnvelopeCache = null;
}

/**
 * Gettery
 */
export function getCategories() {
  return categoriesCache;
}

export function getExpenses() {
  return expensesCache;
}

export function getIncomes() {
  return incomesCache;
}

export function getEndDates() {
  return { primary: endDate1Cache, secondary: endDate2Cache };
}

export function getSavingGoal() {
  return savingGoalCache;
}

export function getDailyEnvelope() {
  return dailyEnvelopeCache;
}