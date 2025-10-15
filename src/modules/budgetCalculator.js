// src/modules/budgetCalculator.js - Zaktualizowany z pełnym systemem kopert
import { 
  getIncomes, 
  getExpenses, 
  getEndDates, 
  getSavingGoal,
  getDailyEnvelope,
  loadDailyEnvelope,
  saveDailyEnvelope
} from './dataManager.js';
import { 
  getDaysLeftFor, 
  isRealised, 
  getWarsawDateString,
  getWeekStart
} from '../utils/dateHelpers.js';
import { DAILY_ENVELOPE } from '../utils/constants.js';

/**
 * Ustawienia koperty dnia
 */
let envelopeSettings = {
  rounding: DAILY_ENVELOPE.DEFAULT_ROUNDING,
  inflowTodayRatio: DAILY_ENVELOPE.DEFAULT_INFLOW_RATIO,
  rolloverCapRatio: DAILY_ENVELOPE.DEFAULT_ROLLOVER_CAP_RATIO,
  envelopePeriodEnd: DAILY_ENVELOPE.DEFAULT_PERIOD_END
};

/**
 * Oblicz sumy zrealizowanych przychodów i wydatków (bez dzisiejszych)
 */
export function calculateRealisedTotals() {
  const incomes = getIncomes();
  const expenses = getExpenses();
  const todayStr = getWarsawDateString();
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  incomes.forEach(inc => {
    if (isRealised(inc) && inc.date < todayStr) {
      totalIncome += inc.amount;
    }
  });
  
  expenses.forEach(exp => {
    if (isRealised(exp) && exp.date < todayStr) {
      totalExpense += exp.amount * (exp.quantity || 1);
    }
  });
  
  return { totalIncome, totalExpense };
}

/**
 * Oblicz bazową kwotę koperty dnia
 */
export function computeBaseEnvelope() {
  const { totalIncome, totalExpense } = calculateRealisedTotals();
  const savingGoal = getSavingGoal();
  const endDates = getEndDates();
  
  const remaining = (totalIncome - totalExpense) - savingGoal;
  const chosenEnd = envelopeSettings.envelopePeriodEnd === 'secondary' 
    ? endDates.secondary 
    : endDates.primary;
  
  const daysLeft = getDaysLeftFor(chosenEnd);
  
  let base = 0;
  if (daysLeft > 0 && remaining > 0) {
    const raw = remaining / daysLeft;
    const round = envelopeSettings.rounding || 1;
    base = Math.floor(raw / round) * round;
  }
  
  return Math.max(0, base);
}

/**
 * Aktualizuj/utwórz kopertę dnia
 */
export async function updateDailyEnvelope() {
  if (!DAILY_ENVELOPE.ENABLED) return null;
  
  const dateStr = getWarsawDateString();
  let record = await loadDailyEnvelope(dateStr);
  
  if (!record) {
    const base = computeBaseEnvelope();
    const now = new Date();
    const setAt = now.toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' });
    
    record = {
      date: dateStr,
      base_amount: base,
      set_at: setAt,
      today_extra_from_inflows: 0
    };
    
    await saveDailyEnvelope(dateStr, record);
  }
  
  return record;
}

/**
 * Oblicz medianę z tablicy liczb
 */
function median(arr) {
  const a = (Array.isArray(arr) ? arr : [])
    .filter(x => Number.isFinite(x))
    .sort((x, y) => x - y);
  
  if (!a.length) return 0;
  
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/**
 * Pobierz dzienne sumy wydatków z ostatnich N dni
 */
function getDailyExpenseTotalsLastNDays(n = 30) {
  const expenses = getExpenses();
  const totals = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const since = new Date(today);
  since.setDate(since.getDate() - (n - 1));
  
  expenses.forEach(exp => {
    if (exp && !exp.planned && exp.date) {
      const d = new Date(exp.date);
      d.setHours(0, 0, 0, 0);
      
      if (d >= since && d <= today) {
        const key = d.toISOString().slice(0, 10);
        const val = (exp.amount * (exp.quantity || 1)) || 0;
        totals.set(key, (totals.get(key) || 0) + val);
      }
    }
  });
  
  const result = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push(totals.get(key) || 0);
  }
  
  return result;
}

/**
 * Oblicz globalną medianę wydatków dziennych z ostatnich 30 dni
 */
export function getGlobalMedian30d() {
  return median(getDailyExpenseTotalsLastNDays(30));
}

/**
 * Oblicz wydatki dzienne, tygodniowe i miesięczne
 */
export function calculateSpendingPeriods() {
  const expenses = getExpenses();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayStr = today.toISOString().slice(0, 10);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const weekStart = getWeekStart(today);
  
  let spentToday = 0;
  let spentWeek = 0;
  let spentMonth = 0;
  
  expenses.forEach(exp => {
    if (!isRealised(exp)) return;
    
    const cost = exp.amount * (exp.quantity || 1);
    const d = new Date(exp.date);
    d.setHours(0, 0, 0, 0);
    const dStr = d.toISOString().slice(0, 10);
    
    if (dStr === todayStr) spentToday += cost;
    
    if (d.getTime() >= weekStart.getTime() && d.getTime() <= today.getTime()) {
      spentWeek += cost;
    }
    
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      spentMonth += cost;
    }
  });
  
  return { spentToday, spentWeek, spentMonth };
}

/**
 * Oblicz limity dzienne dla obu okresów budżetowych
 */
export function calculateDailyLimits() {
  const incomes = getIncomes();
  const expenses = getExpenses();
  const savingGoal = getSavingGoal();
  const endDates = getEndDates();
  
  let totalIncomeReal = 0;
  let totalExpenseReal = 0;
  
  incomes.forEach(inc => {
    if (isRealised(inc)) totalIncomeReal += inc.amount;
  });
  
  expenses.forEach(exp => {
    if (isRealised(exp)) totalExpenseReal += exp.amount * (exp.quantity || 1);
  });
  
  const remainingReal = totalIncomeReal - totalExpenseReal;
  
  const daysLeft1 = getDaysLeftFor(endDates.primary);
  const daysLeft2 = getDaysLeftFor(endDates.secondary);
  
  const spendable1 = Math.max(0, remainingReal - savingGoal);
  const spendable2 = Math.max(0, remainingReal - savingGoal);
  
  const dailyLimit1 = daysLeft1 > 0 ? spendable1 / daysLeft1 : 0;
  const dailyLimit2 = daysLeft2 > 0 ? spendable2 / daysLeft2 : 0;
  
  return {
    daysLeft1,
    daysLeft2,
    dailyLimit1,
    dailyLimit2,
    spendable1,
    spendable2,
    remainingReal,
    totalIncomeReal,
    totalExpenseReal
  };
}

/**
 * Oblicz prognozowane limity (z uwzględnieniem planowanych transakcji)
 */
export function calculateForecastLimits() {
  const incomes = getIncomes();
  const expenses = getExpenses();
  const savingGoal = getSavingGoal();
  const endDates = getEndDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const computeForecastRemaining = (endDateStr) => {
    let forecastIncome = 0;
    let forecastExpense = 0;
    
    if (!endDateStr) return 0;
    
    const endDate = new Date(endDateStr);
    endDate.setHours(0, 0, 0, 0);
    
    let totalIncomeReal = 0;
    let totalExpenseReal = 0;
    
    incomes.forEach(inc => {
      if (isRealised(inc)) {
        totalIncomeReal += inc.amount;
      } else if (inc.planned) {
        const d = new Date(inc.date);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() <= endDate.getTime() && d.getTime() > today.getTime()) {
          forecastIncome += inc.amount;
        }
      }
    });
    
    expenses.forEach(exp => {
      if (isRealised(exp)) {
        totalExpenseReal += exp.amount * (exp.quantity || 1);
      } else if (exp.planned) {
        const d = new Date(exp.date);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() <= endDate.getTime() && d.getTime() > today.getTime()) {
          forecastExpense += exp.amount * (exp.quantity || 1);
        }
      }
    });
    
    return (totalIncomeReal + forecastIncome) - (totalExpenseReal + forecastExpense);
  };
  
  const forecastRemaining1 = computeForecastRemaining(endDates.primary);
  const forecastRemaining2 = computeForecastRemaining(endDates.secondary);
  
  const daysLeft1 = getDaysLeftFor(endDates.primary);
  const daysLeft2 = getDaysLeftFor(endDates.secondary);
  
  const forecastSpendable1 = Math.max(0, forecastRemaining1 - savingGoal);
  const forecastSpendable2 = Math.max(0, forecastRemaining2 - savingGoal);
  
  const forecastDailyLimit1 = daysLeft1 > 0 ? forecastSpendable1 / daysLeft1 : 0;
  const forecastDailyLimit2 = daysLeft2 > 0 ? forecastSpendable2 / daysLeft2 : 0;
  
  return {
    forecastDailyLimit1,
    forecastDailyLimit2,
    forecastSpendable1,
    forecastSpendable2,
    forecastRemaining1,
    forecastRemaining2
  };
}

/**
 * Oblicz pozostałe kwoty dla każdego źródła finansów (FIFO)
 */
export function computeSourcesRemaining() {
  const incomes = getIncomes();
  const expenses = getExpenses();
  
  const realisedIncomes = incomes
    .filter(isRealised)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
      const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
      return dateA - dateB;
    });
  
  const remaining = realisedIncomes.map(inc => ({ 
    id: inc.id, 
    left: inc.amount 
  }));
  
  const realisedExpenses = expenses
    .filter(isRealised)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
      const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
      return dateA - dateB;
    });
  
  realisedExpenses.forEach(exp => {
    let cost = exp.amount * (exp.quantity || 1);
    let idx = 0;
    
    while (cost > 0 && idx < remaining.length) {
      const rem = remaining[idx];
      if (rem.left > 0) {
        const deduction = Math.min(rem.left, cost);
        rem.left -= deduction;
        cost -= deduction;
      }
      if (rem.left <= 0) {
        idx++;
      } else {
        break;
      }
    }
  });
  
  return remaining;
}

/**
 * Sprawdź anomalie budżetowe
 */
export function checkAnomalies() {
  const incomes = getIncomes();
  const expenses = getExpenses();
  const savingGoal = getSavingGoal();
  const endDates = getEndDates();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let totalIncome = 0;
  let totalSpent = 0;
  
  incomes.forEach(inc => {
    if (isRealised(inc)) totalIncome += inc.amount;
  });
  
  expenses.forEach(exp => {
    if (isRealised(exp)) totalSpent += exp.amount * (exp.quantity || 1);
  });
  
  const remaining = totalIncome - totalSpent;
  
  const startDate = getBudgetStartDate();
  const endDateStr = endDates.primary;
  const endDate = endDateStr 
    ? new Date(endDateStr) 
    : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  
  endDate.setHours(0, 0, 0, 0);
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.floor((endDate - startDate) / msPerDay) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.floor((today - startDate) / msPerDay) + 1));
  
  const expectedSpendable = Math.max(0, totalIncome - savingGoal);
  const expectedSpent = expectedSpendable * (elapsedDays / totalDays);
  const overspend = totalSpent - expectedSpent;
  
  const anomalies = [];
  
  if (remaining < savingGoal && savingGoal > 0) {
    anomalies.push('Pozostało mniej środków niż zakładany cel oszczędności.');
  }
  
  if (expectedSpendable > 0 && overspend > expectedSpendable * 0.1) {
    anomalies.push('Wydano więcej niż przewidywany poziom w tym momencie.');
  }
  
  if (anomalies.length > 0) {
    anomalies.push('Rozważ ograniczenie zbędnych wydatków, planowanie posiłków i zakupy według listy, renegocjację abonamentów lub poszukiwanie dodatkowych oszczędności.');
  }
  
  return {
    hasAnomalies: anomalies.length > 0,
    messages: anomalies,
    data: {
      remaining,
      savingGoal,
      overspend,
      expectedSpent
    }
  };
}

/**
 * Pobierz datę rozpoczęcia budżetu
 */
function getBudgetStartDate() {
  const incomes = getIncomes();
  
  if (incomes && incomes.length > 0) {
    const dates = incomes.map(i => new Date(i.date));
    dates.sort((a, b) => a - b);
    const d = dates[0];
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Oblicz wskaźnik tempa wydatków (spending gauge)
 */
export function calculateSpendingGauge(spentMonth, dailyLimit, daysElapsed) {
  let ratio = 0;
  
  if (daysElapsed > 0 && dailyLimit > 0) {
    ratio = (spentMonth / daysElapsed) / dailyLimit;
  }
  
  const clamped = Math.max(0, Math.min(1, ratio));
  const minRatio = 0.05;
  const maxRatio = 0.95;
  const pointerRatio = Math.min(maxRatio, Math.max(minRatio, clamped));
  
  return {
    ratio,
    pointerRatio,
    isOverspending: ratio > 1
  };
}

/**
 * Pobierz top N najpopularniejszych kategorii
 */
export function getTopCategories(n = 5) {
  const expenses = getExpenses();
  const counts = {};
  
  expenses.forEach(exp => {
    if (!exp || !exp.categoryId) return;
    counts[exp.categoryId] = (counts[exp.categoryId] || 0) + 1;
  });
  
  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  return sorted.slice(0, n);
}

/**
 * Pobierz top N najpopularniejszych opisów dla kategorii
 */
export function getTopDescriptionsForCategory(categoryId, n = 5) {
  const expenses = getExpenses();
  const counts = {};
  
  expenses.forEach(exp => {
    if (!exp || exp.categoryId !== categoryId) return;
    const d = (exp.description || '').trim();
    if (!d) return;
    counts[d] = (counts[d] || 0) + 1;
  });
  
  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  return sorted.slice(0, n);
}

/**
 * Oblicz porównania okresowe (tygodniowe lub miesięczne)
 */
export function computeComparisons(periodType, userFilter) {
  const incomes = getIncomes();
  const expenses = getExpenses();
  const results = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (periodType === 'weekly') {
    const current = new Date(now);
    const diff = (current.getDay() + 6) % 7;
    current.setDate(current.getDate() - diff);
    current.setHours(0, 0, 0, 0);
    
    for (let i = 3; i >= 0; i--) {
      const start = new Date(current);
      start.setDate(current.getDate() - i * 7);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      const label = start.toISOString().slice(0, 10) + ' – ' + end.toISOString().slice(0, 10);
      const totals = computePeriodTotals(incomes, expenses, start, end, userFilter, now);
      totals.avgDailySpend = totals.expenseSum / 7;
      
      results.push({ label, ...totals });
    }
  } else {
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
      const start = new Date(month);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      
      const monthName = month.toLocaleString('pl-PL', { month: 'long' });
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + month.getFullYear();
      
      const totals = computePeriodTotals(incomes, expenses, start, end, userFilter, now);
      const daysInMonth = end.getDate();
      totals.avgDailySpend = daysInMonth > 0 ? totals.expenseSum / daysInMonth : 0;
      
      results.push({ label, ...totals });
    }
  }
  
  return results;
}

/**
 * Oblicz sumy dla okresu
 */
function computePeriodTotals(incomes, expenses, start, end, userFilter, today) {
  let incomeSum = 0;
  let expenseSum = 0;
  let transactionCount = 0;
  
  incomes.forEach(inc => {
    if (inc.planned) {
      const dCheck = new Date(inc.date);
      dCheck.setHours(0, 0, 0, 0);
      if (dCheck.getTime() > today.getTime()) return;
    }
    
    if (userFilter !== 'all' && inc.user !== userFilter) return;
    
    const d = new Date(inc.date);
    d.setHours(0, 0, 0, 0);
    
    if (d >= start && d <= end) {
      incomeSum += inc.amount;
      transactionCount += 1;
    }
  });
  
  expenses.forEach(exp => {
    if (exp.planned) {
      const dCheck = new Date(exp.date);
      dCheck.setHours(0, 0, 0, 0);
      if (dCheck.getTime() > today.getTime()) return;
    }
    
    if (userFilter !== 'all' && exp.user !== userFilter) return;
    
    const d = new Date(exp.date);
    d.setHours(0, 0, 0, 0);
    
    if (d >= start && d <= end) {
      const cost = exp.amount * (exp.quantity || 1);
      expenseSum += cost;
      transactionCount += 1;
    }
  });
  
  return {
    incomeSum,
    expenseSum,
    transactionCount,
    avgDailySpend: 0
  };
}