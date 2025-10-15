// src/modules/dataManager.js
import { ref, get, set, onValue } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { parseDateStr, parseDateTime, isRealised, getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

/**
 * Cache lokalnych danych
 */
let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let endDate1Cache = '';
let endDate2Cache = '';
let savingGoalCache = 0;
let dailyEnvelopeCache = null;

/**
 * Pobierz ścieżkę do danych użytkownika
 */
function getUserPath(path = '') {
  const userId = getUserId();
  if (!userId) throw new Error('Brak zalogowanego użytkownika');
  return `users/${userId}/${path}`;
}

/**
 * Załaduj kategorie z Firebase
 */
export async function loadCategories() {
  try {
    const snapshot = await get(ref(db, getUserPath('categories')));
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
    const snapshot = await get(ref(db, getUserPath('expenses')));
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
    const snapshot = await get(ref(db, getUserPath('incomes')));
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
    const snapshot = await get(ref(db, getUserPath('endDate')));
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
    const snapshot = await get(ref(db, getUserPath('savingGoal')));
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
    const snapshot = await get(ref(db, getUserPath(`daily_envelope/${dateStr}`)));
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
    await set(ref(db, getUserPath('categories')), obj);
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
    await set(ref(db, getUserPath('expenses')), obj);
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
    await set(ref(db, getUserPath('incomes')), obj);
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
    await set(ref(db, getUserPath('endDate')), { 
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
    await set(ref(db, getUserPath('savingGoal')), goal);
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
    await set(ref(db, getUserPath(`daily_envelope/${dateStr}`)), envelope);
    if (dateStr === getWarsawDateString()) {
      dailyEnvelopeCache = envelope;
    }
  } catch (error) {
    console.error('Błąd zapisywania koperty dnia:', error);
    throw error;
  }
}

/**
 * Pobierz wszystkie dane użytkownika
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
    
    // Załaduj kopertę dnia
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
  
  // Realizuj przeterminowane źródła finansów
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
  
  // Realizuj przeterminowane wydatki
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
  
  // Zapisz zmiany
  if (incomesUpdated) {
    await saveIncomes(incomesCache);
  }
  
  if (expensesUpdated) {
    await saveExpenses(expensesCache);
  }
  
  return { incomesUpdated, expensesUpdated };
}

/**
 * Nasłuchuj zmian w czasie rzeczywistym
 */
export function subscribeToRealtimeUpdates(callbacks) {
  const userId = getUserId();
  if (!userId) return;
  
  // Nasłuchuj kategorii
  onValue(ref(db, getUserPath('categories')), (snapshot) => {
    const data = snapshot.val() || {};
    categoriesCache = Object.values(data);
    if (callbacks.onCategoriesChange) {
      callbacks.onCategoriesChange(categoriesCache);
    }
  });
  
  // Nasłuchuj wydatków
  onValue(ref(db, getUserPath('expenses')), (snapshot) => {
    const data = snapshot.val() || {};
    expensesCache = Object.values(data);
    if (callbacks.onExpensesChange) {
      callbacks.onExpensesChange(expensesCache);
    }
  });
  
  // Nasłuchuj źródeł finansów
  onValue(ref(db, getUserPath('incomes')), (snapshot) => {
    const data = snapshot.val() || {};
    incomesCache = Object.values(data);
    if (callbacks.onIncomesChange) {
      callbacks.onIncomesChange(incomesCache);
    }
  });
  
  // Nasłuchuj dat końcowych
  onValue(ref(db, getUserPath('endDate')), (snapshot) => {
    const data = snapshot.val() || {};
    if (typeof data === 'string') {
      endDate1Cache = data;
      endDate2Cache = '';
    } else {
      endDate1Cache = data.primary || '';
      endDate2Cache = data.secondary || '';
    }
    if (callbacks.onEndDatesChange) {
      callbacks.onEndDatesChange({ primary: endDate1Cache, secondary: endDate2Cache });
    }
  });
  
  // Nasłuchuj celu oszczędności
  onValue(ref(db, getUserPath('savingGoal')), (snapshot) => {
    const val = snapshot.val();
    savingGoalCache = val ? parseFloat(val) : 0;
    if (callbacks.onSavingGoalChange) {
      callbacks.onSavingGoalChange(savingGoalCache);
    }
  });
}

/**
 * Gettery dla cache'owanych danych
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