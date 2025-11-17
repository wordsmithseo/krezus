// src/modules/dataManager.js - Z AUTOMATYCZNĄ MIGRACJĄ realised → type

import { ref, get, set, update, onValue } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getUserId } from './auth.js';
import { getWarsawDateString, getCurrentTimeString, shouldBeRealisedNow, getWarsawTimeString } from '../utils/dateHelpers.js';
import { getCategoryIcon } from '../utils/iconMapper.js';

let categoriesCache = [];
let incomesCache = [];
let expensesCache = [];
let purposeBudgetsCache = []; // Budżety celowe
let endDate1Cache = '';
let endDate2Cache = '';
let savingGoalCache = 0;
let dailyEnvelopeCache = null;
let envelopePeriodCache = 0; // Indeks okresu dla koperty dnia
let dynamicsPeriodCache = 0; // Indeks okresu dla dynamiki wydatków

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
  purposeBudgetsCache = [];
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
    const seenNames = new Set();
    let needsMigration = false;

    newCategories.forEach(cat => {
      if (!cat) return;

      // MIGRACJA: dodaj ID jeśli kategoria go nie ma
      if (!cat.id) {
        cat.id = `cat_${cat.name.replace(/\s+/g, '_')}_${Date.now()}`;
        needsMigration = true;
        console.log(`🔄 Dodano ID do kategorii: ${cat.name} -> ${cat.id}`);
      }

      // MIGRACJA: odśwież ikonę na podstawie nazwy (zawsze)
      // Używamy inteligentnego systemu dopasowania dla najlepszych wyników
      const smartIcon = getCategoryIcon(cat.name);
      if (!cat.icon || cat.icon !== smartIcon) {
        cat.icon = smartIcon;
        needsMigration = true;
        console.log(`🎨 Zaktualizowano ikonę kategorii: ${cat.name} -> ${cat.icon}`);
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
      console.log('💾 Zapisywanie zmigrowanych kategorii...');
      await saveCategories(categoriesCache);
    }

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
 * Załaduj okres dla koperty dnia
 */
export async function loadEnvelopePeriod() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('envelopePeriod')));
    const val = snapshot.val();
    envelopePeriodCache = val !== null && val !== undefined ? parseInt(val) : 0;
    return envelopePeriodCache;
  } catch (error) {
    console.error('❌ Błąd ładowania okresu koperty:', error);
    return 0;
  }
}

/**
 * Załaduj okres dla dynamiki wydatków
 */
export async function loadDynamicsPeriod() {
  try {
    const snapshot = await get(ref(db, getUserBudgetPath('dynamicsPeriod')));
    const val = snapshot.val();
    dynamicsPeriodCache = val !== null && val !== undefined ? parseInt(val) : 0;
    return dynamicsPeriodCache;
  } catch (error) {
    console.error('❌ Błąd ładowania okresu dynamiki:', error);
    return 0;
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
    console.log('✅ Załadowano budżety celowe:', purposeBudgetsCache.length);
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
 * Zapisz okres dla koperty dnia
 */
export async function saveEnvelopePeriod(periodIndex) {
  try {
    await set(ref(db, getUserBudgetPath('envelopePeriod')), periodIndex);
    envelopePeriodCache = periodIndex;
  } catch (error) {
    console.error('❌ Błąd zapisywania okresu koperty:', error);
    throw error;
  }
}

/**
 * Zapisz okres dla dynamiki wydatków
 */
export async function saveDynamicsPeriod(periodIndex) {
  try {
    await set(ref(db, getUserBudgetPath('dynamicsPeriod')), periodIndex);
    dynamicsPeriodCache = periodIndex;
  } catch (error) {
    console.error('❌ Błąd zapisywania okresu dynamiki:', error);
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
    console.log('✅ Zapisano budżety celowe:', purposeBudgetsCache.length);
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
    const userId = getUserId();
    console.log('📥 Ładowanie wszystkich danych dla użytkownika:', userId);

    const [categories, expenses, incomes, purposeBudgets, endDates, savingGoal, envelopePeriod, dynamicsPeriod] = await Promise.all([
      loadCategories(),
      loadExpenses(),
      loadIncomes(),
      loadPurposeBudgets(),
      loadEndDates(),
      loadSavingGoal(),
      loadEnvelopePeriod(),
      loadDynamicsPeriod()
    ]);

    const todayStr = getWarsawDateString();
    dailyEnvelopeCache = await loadDailyEnvelope(todayStr);

    console.log('✅ Załadowano wszystkie dane:', {
      categories: categories.length,
      expenses: expenses.length,
      incomes: incomes.length,
      purposeBudgets: purposeBudgets.length,
      userId
    });

    return {
      categories,
      expenses,
      incomes,
      purposeBudgets,
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
  let incomesUpdated = false;
  let expensesUpdated = false;

  incomesCache.forEach(inc => {
    if (shouldBeRealisedNow(inc)) {
      inc.type = 'normal';
      inc.wasPlanned = true;

      // Jeśli transakcja nie miała czasu, ustaw aktualny czas Warsaw
      if (!inc.time || inc.time.trim() === '') {
        inc.time = getWarsawTimeString();
      }

      incomesUpdated = true;
      console.log('🔄 Auto-realizacja przychodu:', inc.id, `(${inc.date} ${inc.time})`);
    }
  });

  expensesCache.forEach(exp => {
    if (shouldBeRealisedNow(exp)) {
      exp.type = 'normal';
      exp.wasPlanned = true;

      // Jeśli transakcja nie miała czasu, ustaw aktualny czas Warsaw
      if (!exp.time || exp.time.trim() === '') {
        exp.time = getWarsawTimeString();
      }

      expensesUpdated = true;
      console.log('🔄 Auto-realizacja wydatku:', exp.id, `(${exp.date} ${exp.time})`);
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

  // PurposeBudgets
  const purposeBudgetsRef = ref(db, getUserBudgetPath('purposeBudgets'));
  activeListeners.purposeBudgets = onValue(purposeBudgetsRef, (snapshot) => {
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

    if (JSON.stringify(purposeBudgetsCache) !== JSON.stringify(uniqueData)) {
      purposeBudgetsCache = uniqueData;
      console.log('🔄 Budżety celowe zaktualizowane:', purposeBudgetsCache.length);
      if (callbacks.onPurposeBudgetsChange) {
        callbacks.onPurposeBudgetsChange(purposeBudgetsCache);
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

export function getEnvelopePeriod() {
  return envelopePeriodCache;
}

export function getDynamicsPeriod() {
  return dynamicsPeriodCache;
}

export function getDailyEnvelope() {
  return dailyEnvelopeCache ? { ...dailyEnvelopeCache } : null;
}

export function getPurposeBudgets() {
  return [...purposeBudgetsCache];
}