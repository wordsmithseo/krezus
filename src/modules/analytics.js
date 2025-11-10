// src/modules/analytics.js - Moduł analityki z top3 + wykres słupkowy
import { getExpenses, getIncomes } from './dataManager.js';
import { getWarsawDateString, formatDateLabel } from '../utils/dateHelpers.js';

let currentPeriod = 'all'; // Domyślnie "Wszystko"
let customDateFrom = null;
let customDateTo = null;
let budgetUsersCache = [];

export function setBudgetUsersCache(users) {
  budgetUsersCache = users || [];
}

export function setAnalyticsPeriod(days) {
  if (days === 'custom') {
    currentPeriod = 'custom';
  } else if (days === 'all') {
    currentPeriod = 'all';
    customDateFrom = null;
    customDateTo = null;
  } else {
    currentPeriod = parseInt(days);
    customDateFrom = null;
    customDateTo = null;
  }
}

export function setCustomDateRange(from, to) {
  customDateFrom = from;
  customDateTo = to;
  currentPeriod = 'custom';
}

function getPeriodDates() {
  const today = getWarsawDateString();
  let dateFrom, dateTo;

  if (currentPeriod === 'custom') {
    dateFrom = customDateFrom || today;
    dateTo = customDateTo || today;
  } else if (currentPeriod === 'all') {
    // Wszystko - od początku czasu (rok 2000) do dzisiaj
    dateFrom = '2000-01-01';
    dateTo = today;
  } else {
    dateTo = today;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - currentPeriod);
    dateFrom = getWarsawDateString(fromDate);
  }

  return { dateFrom, dateTo };
}

function getPreviousPeriodDates() {
  // Dla okresu "Wszystko" nie ma sensu porównywać z poprzednim okresem
  if (currentPeriod === 'all') {
    return {
      dateFrom: '2000-01-01',
      dateTo: '2000-01-01'
    };
  }

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

function filterByPeriod(transactions, dateFrom, dateTo) {
  return transactions.filter(t => 
    t.type === 'normal' && 
    t.date >= dateFrom && 
    t.date <= dateTo
  );
}

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

export function getMostExpensiveCategories(limit = 3) {
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
  
  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

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

export function getUserExpensesBreakdown() {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  
  if (periodExpenses.length === 0) {
    return [];
  }
  
  const userMap = new Map();
  
  periodExpenses.forEach(exp => {
    const userId = exp.userId || 'unknown';
    userMap.set(userId, (userMap.get(userId) || 0) + (exp.amount || 0));
  });
  
  const total = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const getBudgetUserName = (userId) => {
    if (!userId || userId === 'unknown') return 'Nieznany';
    
    const user = budgetUsersCache.find(u => u.id === userId);
    if (!user) {
      return null;
    }
    return user.name;
  };
  
  const breakdown = Array.from(userMap.entries())
    .map(([userId, amount]) => {
      const userName = getBudgetUserName(userId);
      return {
        userId,
        userName,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      };
    })
    .filter(item => item.userName !== null)
    .sort((a, b) => b.amount - a.amount);
  
  return breakdown;
}

export function detectAnomalies() {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();

  // Kategorie wykluczane z detekcji anomalii (naturalne duże wydatki)
  const EXCLUDED_CATEGORIES = ['AGD', 'Elektronika', 'Meble', 'Urlop', 'Samochód', 'Remont'];

  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo)
    .filter(e => !EXCLUDED_CATEGORIES.includes(e.category)); // Wykluczenie kategorii

  if (periodExpenses.length < 5) {
    return [];
  }

  const amounts = periodExpenses.map(e => e.amount || 0);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];

  // Wyższy threshold dla okresu "Wszystko"
  const threshold = currentPeriod === 'all'
    ? Math.max(avg * 3, median * 5)  // Wyższy threshold dla "Wszystko"
    : Math.max(avg * 2, median * 3);

  // Limit max 10 anomalii, sortowane od największych
  const anomalies = periodExpenses
    .filter(e => (e.amount || 0) > threshold)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);  // Max 10 anomalii
  
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

export function getCategoryTransactions(categoryName) {
  const { dateFrom, dateTo } = getPeriodDates();
  const expenses = getExpenses();
  
  const periodExpenses = filterByPeriod(expenses, dateFrom, dateTo);
  
  return periodExpenses
    .filter(e => (e.category || 'Bez kategorii') === categoryName)
    .sort((a, b) => b.date.localeCompare(a.date));
}

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

export function getCurrentPeriod() {
  return currentPeriod;
}

export function getCustomDateRange() {
  return { from: customDateFrom, to: customDateTo };
}