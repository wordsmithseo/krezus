// src/modules/analytics.js - Moduł analityki z przedziałami czasowymi
import { getExpenses, getIncomes } from './dataManager.js';
import { getWarsawDateString, formatDateLabel } from '../utils/dateHelpers.js';

/**
 * Aktualnie wybrany okres (dni lub custom)
 */
let currentPeriod = 7;
let customDateFrom = null;
let customDateTo = null;

/**
 * Ustaw okres analizy
 */
export function setAnalyticsPeriod(days) {
  if (days === 'custom') {
    currentPeriod = 'custom';
  } else {
    currentPeriod = parseInt(days);
    customDateFrom = null;
    customDateTo = null;
  }
}

/**
 * Ustaw własny przedział dat
 */
export function setCustomDateRange(from, to) {
  customDateFrom = from;
  customDateTo = to;
  currentPeriod = 'custom';
}

/**
 * Pobierz daty początku i końca okresu
 */
function getPeriodDates() {
  const today = getWarsawDateString();
  let dateFrom, dateTo;
  
  if (currentPeriod === 'custom') {
    dateFrom = customDateFrom || today;
    dateTo = customDateTo || today;
  } else {
    dateTo = today;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - currentPeriod);
    dateFrom = getWarsawDateString(fromDate);
  }
  
  return { dateFrom, dateTo };
}

/**
 * Pobierz poprzedni okres (dla porównania)
 */
function getPreviousPeriodDates() {
  const { dateFrom, dateTo } = getPeriodDates();
  
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const diff = Math.floor((to - from) / (1000 * 60 * 60 * 24));
  
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - diff);
  
  return {
    dateFrom: getWarsawDateString(prevFrom),
    dateTo: getWarsawDateString(prevTo)
  };
}

/**
 * Filtruj transakcje według okresu
 */
function filterByPeriod(transactions, dateFrom, dateTo) {
  return transactions.filter(t => 
    t.type === 'normal' && 
    t.date >= dateFrom && 
    t.date <= dateTo
  );
}

/**
 * Oblicz statystyki dla okresu
 */
export function calculatePeriodStats() {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  const incomes = getIncomes();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  const periodIncomes = filterByPeriod(incomes, dateFrom, dateTo);
  
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalIncomes = periodIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const expensesCount = periodExpenses.length;
  const incomesCount = periodIncomes.length;
  
  return {
    totalExpenses,
    totalIncomes,
    expensesCount,
    incomesCount,
    dateFrom,
    dateTo
  };
}

/**
 * Porównaj z poprzednim okresem
 */
export function compareToPreviousPeriod() {
  const current = calculatePeriodStats();
  const { dateFrom: prevFrom, dateTo: prevTo } = getPreviousPeriodDates();
  
  const expenses = getExpenses();
  const incomes = getIncomes();
  
  const prevExpenses = filterByPeriod(expenses, prevFrom, prevTo);
  const prevIncomes = filterByPeriod(incomes, prevFrom, prevTo);
  
  const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const prevTotalIncomes = prevIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const prevExpensesCount = prevExpenses.length;
  const prevIncomesCount = prevIncomes.length;
  
  const expenseChange = prevTotalExpenses > 0 
    ? ((current.totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 
    : 0;
  
  const incomeChange = prevTotalIncomes > 0 
    ? ((current.totalIncomes - prevTotalIncomes) / prevTotalIncomes) * 100 
    : 0;
  
  const expenseCountChange = prevExpensesCount > 0 
    ? ((current.expensesCount - prevExpensesCount) / prevExpensesCount) * 100 
    : 0;
  
  const incomeCountChange = prevIncomesCount > 0 
    ? ((current.incomesCount - prevIncomesCount) / prevIncomesCount) * 100 
    : 0;
  
  return {
    expenseChange,
    incomeChange,
    expenseCountChange,
    incomeCountChange,
    previousPeriod: {
      dateFrom: prevFrom,
      dateTo: prevTo,
      totalExpenses: prevTotalExpenses,
      totalIncomes: prevTotalIncomes,
      expensesCount: prevExpensesCount,
      incomesCount: prevIncomesCount
    }
  };
}

/**
 * Najkosztowniejsza kategoria w okresie
 */
export function getMostExpensiveCategory() {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  
  if (periodExpenses.length === 0) {
    return null;
  }
  
  const categoryMap = new Map();
  
  periodExpenses.forEach(exp => {
    const cat = exp.category || 'Bez kategorii';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (exp.amount || 0));
  });
  
  let maxCategory = null;
  let maxAmount = 0;
  
  categoryMap.forEach((amount, category) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = category;
    }
  });
  
  const total = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const percentage = total > 0 ? (maxAmount / total) * 100 : 0;
  
  return {
    category: maxCategory,
    amount: maxAmount,
    percentage
  };
}

/**
 * Udział wszystkich kategorii w wydatkach
 */
export function getCategoriesBreakdown() {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  
  if (periodExpenses.length === 0) {
    return [];
  }
  
  const categoryMap = new Map();
  
  periodExpenses.forEach(exp => {
    const cat = exp.category || 'Bez kategorii';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (exp.amount || 0));
  });
  
  const total = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const breakdown = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
  
  return breakdown;
}

/**
 * Wykryj anomalie w bieżącym okresie z opisem
 */
export function detectAnomalies() {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  
  if (periodExpenses.length < 5) {
    return [];
  }
  
  const amounts = periodExpenses.map(e => e.amount || 0);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
  
  const threshold = Math.max(avg * 2, median * 3);
  
  const anomalies = periodExpenses.filter(e => (e.amount || 0) > threshold);
  
  // Dodaj opis anomalii
  return anomalies.map(anomaly => {
    const timesAboveMedian = median > 0 ? (anomaly.amount / median).toFixed(1) : '∞';
    const timesAboveAvg = avg > 0 ? (anomaly.amount / avg).toFixed(1) : '∞';
    
    let reason = '';
    if (anomaly.amount > median * 3) {
      reason = `Kwota ${timesAboveMedian}× wyższa od mediany (${median.toFixed(2)} zł)`;
    } else if (anomaly.amount > avg * 2) {
      reason = `Kwota ${timesAboveAvg}× wyższa od średniej (${avg.toFixed(2)} zł)`;
    } else {
      reason = `Nietypowo wysoka kwota w tym okresie`;
    }
    
    return {
      ...anomaly,
      anomalyReason: reason
    };
  });
}

/**
 * Pobierz szczegóły transakcji dla kategorii
 */
export function getCategoryTransactions(categoryName) {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  
  return periodExpenses
    .filter(e => (e.category || 'Bez kategorii') === categoryName)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Eksportuj dane analityczne do CSV
 */
export function exportAnalyticsToCSV() {
  const stats = calculatePeriodStats();
  const breakdown = getCategoriesBreakdown();
  const comparison = compareToPreviousPeriod();
  
  let csv = 'ANALITYKA WYDATKÓW\n\n';
  csv += `Okres,${formatDateLabel(stats.dateFrom)} - ${formatDateLabel(stats.dateTo)}\n\n`;
  csv += 'PODSUMOWANIE\n';
  csv += `Wydatki,${stats.totalExpenses.toFixed(2)} zł\n`;
  csv += `Przychody,${stats.totalIncomes.toFixed(2)} zł\n`;
  csv += `Liczba wydatków,${stats.expensesCount}\n`;
  csv += `Liczba przychodów,${stats.incomesCount}\n\n`;
  csv += 'PORÓWNANIE Z POPRZEDNIM OKRESEM\n';
  csv += `Zmiana wydatków,${comparison.expenseChange.toFixed(1)}%\n`;
  csv += `Zmiana przychodów,${comparison.incomeChange.toFixed(1)}%\n`;
  csv += `Zmiana liczby wydatków,${comparison.expenseCountChange.toFixed(1)}%\n`;
  csv += `Zmiana liczby przychodów,${comparison.incomeCountChange.toFixed(1)}%\n\n`;
  csv += 'KATEGORIE\n';
  csv += 'Kategoria,Kwota,Procent\n';
  
  breakdown.forEach(cat => {
    csv += `${cat.category},${cat.amount.toFixed(2)},${cat.percentage.toFixed(1)}%\n`;
  });
  
  return csv;
}

/**
 * Pobierz aktualny okres
 */
export function getCurrentPeriod() {
  return currentPeriod;
}

/**
 * Pobierz daty własnego przedziału
 */
export function getCustomDateRange() {
  return { from: customDateFrom, to: customDateTo };
}