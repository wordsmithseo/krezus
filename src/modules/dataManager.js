// src/modules/dataManager.js - Wspólny budżet dla wszystkich użytkowników
import { ref, get, set, onValue } from 'firebase/database';
import { db } from '../config/firebase.js';
import { parseDateStr, parseDateTime, isRealised, getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';

/**
 * WAŻNE: Ta aplikacja używa wspólnego budżetu dla wszystkich użytkowników.
 * Ścieżka danych: shared_budget/ (zamiast users/{userId}/)
 */

let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let endDate1Cache = '';
let endDate2Cache = '';
let savingGoalCache = 0;
let dailyEnvelopeCache = null;

/**
 * Pobierz ścieżkę do wspólnych danych budżetu
 */
function getSharedBudgetPath(path = '') {
  return `shared_budget/${path}`;
}

/**
 * Załaduj kategorie z Firebase
 */
export async function loadCategories() {
  try {
    const snapshot = await get(ref(db, getSharedBudgetPath('categories')));
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
    const snapshot = await get(ref(db, getSharedBudgetPath('expenses')));
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
    const snapshot = await get(ref(db, getSharedBudgetPath('incomes')));
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
    const snapshot = await get(ref(db, getSharedBudgetPath('endDate')));
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
    const snapshot = await get(ref(db, getSharedBudgetPath('savingGoal')));
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
    const snapshot = await get(ref(db, getSharedBudgetPath(`daily_envelope/${dateStr}`)));
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
    await set(ref(db, getSharedBudgetPath('categories')), obj);
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
    await set(ref(db, getSharedBudgetPath('expenses')), obj);
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
    await set(ref(db, getSharedBudgetPath('incomes')), obj);
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
    await set(ref(db, getSharedBudgetPath('endDate')), { 
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
    await set(ref(db, getSharedBudgetPath('savingGoal')), goal);
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
    await set(ref(db, getSharedBudgetPath(`daily_envelope/${dateStr}`)), envelope);
    if (dateStr === getWarsawDateString()) {
      dailyEnvelopeCache = envelope;
    }
  } catch (error) {
    console.error('Błąd zapisywania koperty dnia:', error);
    throw error;
  }
}

/**
 * Pobierz wszystkie dane wspólnego budżetu
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
 * Nasłuchuj zmian w czasie rzeczywistym
 */
export function subscribeToRealtimeUpdates(callbacks) {
  onValue(ref(db, getSharedBudgetPath('categories')), (snapshot) => {
    const data = snapshot.val() || {};
    categoriesCache = Object.values(data);
    if (callbacks.onCategoriesChange) {
      callbacks.onCategoriesChange(categoriesCache);
    }
  });
  
  onValue(ref(db, getSharedBudgetPath('expenses')), (snapshot) => {
    const data = snapshot.val() || {};
    expensesCache = Object.values(data);
    if (callbacks.onExpensesChange) {
      callbacks.onExpensesChange(expensesCache);
    }
  });
  
  onValue(ref(db, getSharedBudgetPath('incomes')), (snapshot) => {
    const data = snapshot.val() || {};
    incomesCache = Object.values(data);
    if (callbacks.onIncomesChange) {
      callbacks.onIncomesChange(incomesCache);
    }
  });
  
  onValue(ref(db, getSharedBudgetPath('endDate')), (snapshot) => {
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
  
  onValue(ref(db, getSharedBudgetPath('savingGoal')), (snapshot) => {
    const val = snapshot.val();
    savingGoalCache = val ? parseFloat(val) : 0;
    if (callbacks.onSavingGoalChange) {
      callbacks.onSavingGoalChange(savingGoalCache);
    }
  });
  
  const todayStr = getWarsawDateString();
  onValue(ref(db, getSharedBudgetPath(`daily_envelope/${todayStr}`)), (snapshot) => {
    if (snapshot.exists()) {
      dailyEnvelopeCache = snapshot.val();
      if (callbacks.onDailyEnvelopeChange) {
        callbacks.onDailyEnvelopeChange(dailyEnvelopeCache);
      }
    }
  });
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