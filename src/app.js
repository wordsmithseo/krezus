// src/app.js - Główna aplikacja Krezus v1.1.1 - NAPRAWIONA
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthChange,
  getDisplayName,
  updateDisplayName,
  getCurrentUser,
  getUnreadMessagesCount
} from './modules/auth.js';

import {
  fetchAllData,
  getCategories,
  getExpenses,
  getIncomes,
  getEndDates,
  getSavingGoal,
  getDailyEnvelope,
  saveCategories,
  saveExpenses,
  saveIncomes,
  saveEndDates,
  saveSavingGoal,
  autoRealiseDueTransactions,
  subscribeToRealtimeUpdates,
  clearAllListeners,
  clearCache
} from './modules/dataManager.js';

import {
  calculateRealisedTotals,
  calculateSpendingPeriods,
  calculateDailyLimits,
  calculateForecastLimits,
  computeSourcesRemaining,
  checkAnomalies,
  getGlobalMedian30d,
  updateDailyEnvelope,
  calculateSpendingGauge,
  getTopCategories,
  getTopDescriptionsForCategory,
  computeComparisons
} from './modules/budgetCalculator.js';

import { 
  showProfileModal, 
  showMessagesModal
} from './components/modals.js';

import {
  showErrorMessage,
  showSuccessMessage,
  initGlobalErrorHandler
} from './utils/errorHandler.js';

import {
  validateAmount,
  validateCategoryName,
  attachValidator
} from './utils/validators.js';

import { 
  getWarsawDateString, 
  getCurrentTimeString,
  formatDateLabel
} from './utils/dateHelpers.js';

import { PAGINATION } from './utils/constants.js';

// Stan aplikacji
let currentExpensePage = 1;
let currentIncomePage = 1;
let editingExpenseId = null;
let editingIncomeId = null;

// Wersja aplikacji
const APP_VERSION = '1.1.1';

// Inicjalizacja
console.log('🚀 Aplikacja Krezus uruchomiona');
initGlobalErrorHandler();

// Callbacks dla powiadomień
window.onMessagesCountChange = (count) => {
  updateNotificationBadge('messagesBadge', count);
};

// Callback dla aktualizacji nazwy użytkownika
window.onDisplayNameUpdate = (newName) => {
  updateDisplayNameInUI(newName);
};

/**
 * Aktualizuj nazwę użytkownika we wszystkich miejscach UI
 */
function updateDisplayNameInUI(displayName) {
  // Nagłówek aplikacji
  const usernameSpan = document.getElementById('username');
  if (usernameSpan) {
    usernameSpan.textContent = displayName;
  }
  
  // Przycisk profilu
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.textContent = `👤 ${displayName}`;
  }
  
  // Inne miejsca gdzie może być wyświetlana nazwa
  const allUsernameElements = document.querySelectorAll('[data-username]');
  allUsernameElements.forEach(el => {
    el.textContent = displayName;
  });
}

/**
 * Aktualizuj badge powiadomień
 */
function updateNotificationBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Sprawdź i ukryj paginację jeśli nie jest potrzebna
 */
function updatePaginationVisibility(tableId, totalItems) {
  const paginationContainer = document.querySelector(`#${tableId} + .pagination-container`);
  if (!paginationContainer) return;
  
  const itemsPerPage = tableId.includes('expense') ? PAGINATION.EXPENSES_PER_PAGE : PAGINATION.INCOMES_PER_PAGE;
  
  if (totalItems <= itemsPerPage) {
    paginationContainer.style.display = 'none';
  } else {
    paginationContainer.style.display = 'flex';
  }
}

/**
 * Załaduj wszystkie dane
 */
async function loadAllData() {
  try {
    const userId = getCurrentUser()?.uid;
    if (!userId) {
      console.error('❌ Brak zalogowanego użytkownika');
      return;
    }

    console.log('📥 Ładowanie danych dla użytkownika:', userId);
    
    // Wyczyść cache przed załadowaniem
    await clearCache();
    
    // Załaduj dane
    await fetchAllData(userId);
    
    // Automatyczna realizacja transakcji
    await autoRealiseDueTransactions();
    
    // Aktualizuj kopertę dnia
    await updateDailyEnvelope();
    
    // Renderuj wszystko
    await renderAll();
    
    // Subskrybuj real-time updates
    await subscribeToRealtimeUpdates(userId, {
      onCategoriesUpdate: renderCategories,
      onExpensesUpdate: renderExpenses,
      onIncomesUpdate: renderSources,
      onEndDateUpdate: renderSummary,
      onSavingGoalUpdate: renderSummary,
      onEnvelopeUpdate: () => {
        renderSummary();
        renderDailyEnvelope();
      }
    });
    
  } catch (error) {
    console.error('❌ Błąd ładowania danych:', error);
    showErrorMessage('Nie udało się załadować danych. Spróbuj odświeżyć stronę.');
  }
}

/**
 * Renderuj wszystko
 */
async function renderAll() {
  renderCategories();
  renderExpenses();
  renderSources();
  renderSummary();
  renderDailyEnvelope();
  renderAnalytics();
}

/**
 * Renderuj podsumowanie - POPRAWIONE: pokazuj limit2 gdy date2 istnieje
 */
function renderSummary() {
  const { sumIncome, sumExpense } = calculateRealisedTotals();
  const { available, savingGoal, toSpend, limit1, limit2 } = calculateDailyLimits();
  const { date1, date2, daysLeft1, daysLeft2 } = calculateSpendingPeriods();
  const { projectedAvailable, projectedLimit1, projectedLimit2, futureIncome, futureExpense } = calculateForecastLimits();

  // Stan środków
  document.getElementById('availableFunds').textContent = available.toFixed(2);
  document.getElementById('savingGoal').textContent = savingGoal.toFixed(2);
  document.getElementById('toSpend').textContent = toSpend.toFixed(2);

  // Limity dzienne - POPRAWKA: sprawdź czy date2 JEST (nie jest puste)
  document.getElementById('dailyLimit1').textContent = limit1.toFixed(2);
  document.getElementById('daysLeft1').textContent = daysLeft1;
  
  // POPRAWKA: pokazuj limit2 TYLKO gdy date2 istnieje i nie jest puste
  const limit2Section = document.getElementById('limit2Section');
  if (date2 && date2.trim() !== '') {
    limit2Section.style.display = 'block';
    document.getElementById('dailyLimit2').textContent = limit2.toFixed(2);
    document.getElementById('daysLeft2').textContent = daysLeft2;
  } else {
    limit2Section.style.display = 'none';
  }

  // Prognozy - POPRAWKA: pokazuj projectedLimit2 gdy date2 istnieje
  document.getElementById('projectedAvailable').textContent = projectedAvailable.toFixed(2);
  document.getElementById('projectedLimit1').textContent = projectedLimit1.toFixed(2);
  
  const projectedLimit2Section = document.getElementById('projectedLimit2Section');
  if (date2 && date2.trim() !== '') {
    projectedLimit2Section.style.display = 'block';
    document.getElementById('projectedLimit2').textContent = projectedLimit2.toFixed(2);
  } else {
    projectedLimit2Section.style.display = 'none';
  }

  // Planowane
  document.getElementById('futureIncome').textContent = futureIncome.toFixed(2);
  document.getElementById('futureExpense').textContent = futureExpense.toFixed(2);
}

/**
 * Renderuj kopertę dnia
 */
function renderDailyEnvelope() {
  const envelope = getDailyEnvelope();
  const { spent, total, percentage, remaining } = calculateSpendingGauge();

  if (!envelope) {
    document.getElementById('envelopeAmount').textContent = '0.00';
    document.getElementById('envelopeSpent').textContent = '0.00';
    document.getElementById('envelopeRemaining').textContent = '0.00';
    document.getElementById('spendingGauge').style.width = '0%';
    return;
  }

  document.getElementById('envelopeAmount').textContent = total.toFixed(2);
  document.getElementById('envelopeSpent').textContent = spent.toFixed(2);
  document.getElementById('envelopeRemaining').textContent = remaining.toFixed(2);
  
  const gauge = document.getElementById('spendingGauge');
  gauge.style.width = `${percentage}%`;
  
  // Kolor gauge
  if (percentage < 50) {
    gauge.style.background = 'linear-gradient(90deg, #10b981, #059669)';
  } else if (percentage < 80) {
    gauge.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
  } else {
    gauge.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  }
}

/**
 * Renderuj analitykę
 */
function renderAnalytics() {
  // Top kategorie
  const topCats = getTopCategories(5);
  const topCatsHtml = topCats.length > 0
    ? topCats.map(cat => `
        <div class="top-category-item">
          <span>${cat.name}</span>
          <span class="amount">${cat.amount.toFixed(2)} zł</span>
        </div>
      `).join('')
    : '<p class="empty-state">Brak danych do wyświetlenia</p>';
  
  document.getElementById('topCategoriesList').innerHTML = topCatsHtml;

  // Porównania
  const comp = computeComparisons();
  document.getElementById('last7Days').textContent = comp.last7Days.toFixed(2);
  document.getElementById('prev7Days').textContent = comp.prev7Days.toFixed(2);
  
  const changeEl = document.getElementById('weeklyChange');
  const change = comp.change;
  changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  changeEl.className = change > 0 ? 'change-up' : 'change-down';

  // Anomalie
  const anomalies = checkAnomalies();
  const anomaliesHtml = anomalies.length > 0
    ? anomalies.map(a => `
        <div class="anomaly-item">
          <div>
            <strong>${a.description || 'Brak opisu'}</strong>
            <small>${a.category || 'Brak kategorii'} • ${formatDateLabel(a.date)}</small>
          </div>
          <span class="amount">${a.amount.toFixed(2)} zł</span>
        </div>
      `).join('')
    : '<p class="empty-state">Brak wykrytych anomalii</p>';
  
  document.getElementById('anomaliesList').innerHTML = anomaliesHtml;
}

/**
 * Renderuj kategorie
 */
function renderCategories() {
  const categories = getCategories();
  const container = document.getElementById('categoriesList');
  
  if (categories.length === 0) {
    container.innerHTML = '<p class="empty-state">Brak kategorii. Dodaj pierwszą kategorię!</p>';
    return;
  }

  const html = categories.map(cat => `
    <div class="category-item">
      <span class="category-name">${cat.name}</span>
      <button class="btn-icon" onclick="window.deleteCategory('${cat.id}')">🗑️</button>
    </div>
  `).join('');

  container.innerHTML = html;
}

/**
 * Renderuj wydatki
 */
function renderExpenses() {
  const expenses = getExpenses();
  const totalExpenses = expenses.length;
  
  // Sortuj: najpierw niezrealizowane, potem po dacie malejąco
  const sorted = [...expenses].sort((a, b) => {
    if (a.realised !== b.realised) {
      return a.realised ? 1 : -1;
    }
    return b.date.localeCompare(a.date);
  });

  const startIdx = (currentExpensePage - 1) * PAGINATION.EXPENSES_PER_PAGE;
  const endIdx = startIdx + PAGINATION.EXPENSES_PER_PAGE;
  const paginatedExpenses = sorted.slice(startIdx, endIdx);

  const tbody = document.getElementById('expensesTableBody');
  
  if (totalExpenses === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Brak wydatków do wyświetlenia</td></tr>';
    updatePaginationVisibility('expensesTableBody', totalExpenses);
    return;
  }

  const html = paginatedExpenses.map(exp => `
    <tr class="${exp.realised ? 'realised' : 'planned'}">
      <td>${formatDateLabel(exp.date)}</td>
      <td>${exp.amount.toFixed(2)} zł</td>
      <td>${exp.category || 'Brak'}</td>
      <td>${exp.description || '-'}</td>
      <td>${exp.source || 'Brak'}</td>
      <td>
        <span class="status-badge ${exp.realised ? 'status-realised' : 'status-planned'}">
          ${exp.realised ? '✓ Zrealizowany' : '⏳ Planowany'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="window.editExpense('${exp.id}')" title="Edytuj">✏️</button>
        <button class="btn-icon" onclick="window.deleteExpense('${exp.id}')" title="Usuń">🗑️</button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;

  // Renderuj paginację
  renderExpensesPagination(totalExpenses);
  updatePaginationVisibility('expensesTableBody', totalExpenses);
}

/**
 * Renderuj paginację wydatków
 */
function renderExpensesPagination(total) {
  const totalPages = Math.ceil(total / PAGINATION.EXPENSES_PER_PAGE);
  const container = document.getElementById('expensesPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  
  // Przycisk poprzedni
  html += `<button class="pagination-btn" ${currentExpensePage === 1 ? 'disabled' : ''} onclick="window.changeExpensePage(${currentExpensePage - 1})">◀</button>`;
  
  // Strony
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentExpensePage - 1 && i <= currentExpensePage + 1)) {
      html += `<button class="pagination-btn ${i === currentExpensePage ? 'active' : ''}" onclick="window.changeExpensePage(${i})">${i}</button>`;
    } else if (i === currentExpensePage - 2 || i === currentExpensePage + 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  // Przycisk następny
  html += `<button class="pagination-btn" ${currentExpensePage === totalPages ? 'disabled' : ''} onclick="window.changeExpensePage(${currentExpensePage + 1})">▶</button>`;

  container.innerHTML = html;
}

/**
 * Zmień stronę wydatków
 */
window.changeExpensePage = (page) => {
  const total = getExpenses().length;
  const totalPages = Math.ceil(total / PAGINATION.EXPENSES_PER_PAGE);
  
  if (page < 1 || page > totalPages) return;
  
  currentExpensePage = page;
  renderExpenses();
  
  // Scroll do tabeli
  const tableBody = document.getElementById('expensesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Renderuj źródła finansów (przychody)
 */
function renderSources() {
  const incomes = getIncomes();
  const totalIncomes = incomes.length;
  
  // Sortuj: najpierw niezrealizowane, potem po dacie malejąco
  const sorted = [...incomes].sort((a, b) => {
    if (a.realised !== b.realised) {
      return a.realised ? 1 : -1;
    }
    return b.date.localeCompare(a.date);
  });

  const startIdx = (currentIncomePage - 1) * PAGINATION.INCOMES_PER_PAGE;
  const endIdx = startIdx + PAGINATION.INCOMES_PER_PAGE;
  const paginatedIncomes = sorted.slice(startIdx, endIdx);

  const tbody = document.getElementById('sourcesTableBody');
  
  if (totalIncomes === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Brak przychodów do wyświetlenia</td></tr>';
    updatePaginationVisibility('sourcesTableBody', totalIncomes);
    return;
  }

  const html = paginatedIncomes.map(inc => `
    <tr class="${inc.realised ? 'realised' : 'planned'}">
      <td>${formatDateLabel(inc.date)}</td>
      <td>${inc.amount.toFixed(2)} zł</td>
      <td>${inc.source || 'Brak'}</td>
      <td>${inc.description || '-'}</td>
      <td>
        <span class="status-badge ${inc.realised ? 'status-realised' : 'status-planned'}">
          ${inc.realised ? '✓ Zrealizowany' : '⏳ Planowany'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="window.editIncome('${inc.id}')" title="Edytuj">✏️</button>
        <button class="btn-icon" onclick="window.deleteIncome('${inc.id}')" title="Usuń">🗑️</button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;

  // Renderuj paginację
  renderIncomesPagination(totalIncomes);
  updatePaginationVisibility('sourcesTableBody', totalIncomes);
  
  // Pozostałe środki ze źródeł
  renderSourcesRemaining();
}

/**
 * Renderuj paginację przychodów
 */
function renderIncomesPagination(total) {
  const totalPages = Math.ceil(total / PAGINATION.INCOMES_PER_PAGE);
  const container = document.getElementById('incomesPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  
  // Przycisk poprzedni
  html += `<button class="pagination-btn" ${currentIncomePage === 1 ? 'disabled' : ''} onclick="window.changeIncomePage(${currentIncomePage - 1})">◀</button>`;
  
  // Strony
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentIncomePage - 1 && i <= currentIncomePage + 1)) {
      html += `<button class="pagination-btn ${i === currentIncomePage ? 'active' : ''} " onclick="window.changeIncomePage(${i})">${i}</button>`;
    } else if (i === currentIncomePage - 2 || i === currentIncomePage + 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  // Przycisk następny
  html += `<button class="pagination-btn" ${currentIncomePage === totalPages ? 'disabled' : ''} onclick="window.changeIncomePage(${currentIncomePage + 1})">▶</button>`;

  container.innerHTML = html;
}

/**
 * Zmień stronę przychodów
 */
window.changeIncomePage = (page) => {
  const total = getIncomes().length;
  const totalPages = Math.ceil(total / PAGINATION.INCOMES_PER_PAGE);
  
  if (page < 1 || page > totalPages) return;
  
  currentIncomePage = page;
  renderSources();
  
  // Scroll do tabeli
  const tableBody = document.getElementById('sourcesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Renderuj pozostałe środki ze źródeł
 */
function renderSourcesRemaining() {
  const sources = computeSourcesRemaining();
  const container = document.getElementById('sourcesRemainingList');
  
  if (sources.length === 0) {
    container.innerHTML = '<p class="empty-state">Brak danych</p>';
    return;
  }

  const html = sources.map(src => `
    <div class="source-remaining-item">
      <span>${src.name}</span>
      <span class="amount ${src.amount >= 0 ? 'positive' : 'negative'}">
        ${src.amount.toFixed(2)} zł
      </span>
    </div>
  `).join('');

  container.innerHTML = html;
}

// ==================== KATEGORIE ====================

window.addCategory = async () => {
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();

  if (!validateCategoryName(name)) {
    showErrorMessage('Nazwa kategorii musi mieć od 2 do 30 znaków');
    return;
  }

  const categories = getCategories();
  
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    showErrorMessage('Kategoria o tej nazwie już istnieje');
    return;
  }

  const newCategory = {
    id: `cat_${Date.now()}`,
    name: name
  };

  const updated = [...categories, newCategory];
  
  try {
    await saveCategories(updated);
    input.value = '';
    showSuccessMessage('Kategoria dodana');
  } catch (error) {
    console.error('❌ Błąd dodawania kategorii:', error);
    showErrorMessage('Nie udało się dodać kategorii');
  }
};

window.deleteCategory = async (categoryId) => {
  if (!confirm('Czy na pewno chcesz usunąć tę kategorię?')) return;

  const categories = getCategories();
  const updated = categories.filter(c => c.id !== categoryId);
  
  try {
    await saveCategories(updated);
    showSuccessMessage('Kategoria usunięta');
  } catch (error) {
    console.error('❌ Błąd usuwania kategorii:', error);
    showErrorMessage('Nie udało się usunąć kategorii');
  }
};

// ==================== WYDATKI ====================

window.addExpense = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const amount = parseFloat(form.expenseAmount.value);
  const date = form.expenseDate.value;
  const category = form.expenseCategory.value;
  const description = form.expenseDescription.value.trim();
  const source = form.expenseSource.value.trim();
  const realised = form.expenseRealised.checked;

  if (!validateAmount(amount)) {
    showErrorMessage('Kwota musi być większa od 0');
    return;
  }

  const expense = {
    id: editingExpenseId || `exp_${Date.now()}`,
    amount,
    date,
    category,
    description,
    source,
    realised,
    timestamp: editingExpenseId ? getExpenses().find(e => e.id === editingExpenseId)?.timestamp : getCurrentTimeString()
  };

  const expenses = getExpenses();
  const updated = editingExpenseId
    ? expenses.map(e => e.id === editingExpenseId ? expense : e)
    : [...expenses, expense];

  try {
    await saveExpenses(updated);
    
    // Aktualizuj kopertę dnia jeśli wydatek jest dzisiejszy i zrealizowany
    if (realised && date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    form.reset();
    form.expenseDate.value = getWarsawDateString();
    editingExpenseId = null;
    document.getElementById('expenseFormTitle').textContent = 'Dodaj wydatek';
    showSuccessMessage(editingExpenseId ? 'Wydatek zaktualizowany' : 'Wydatek dodany');
  } catch (error) {
    console.error('❌ Błąd zapisywania wydatku:', error);
    showErrorMessage('Nie udało się zapisać wydatku');
  }
};

window.editExpense = (expenseId) => {
  const expense = getExpenses().find(e => e.id === expenseId);
  if (!expense) return;

  const form = document.getElementById('expenseForm');
  form.expenseAmount.value = expense.amount;
  form.expenseDate.value = expense.date;
  form.expenseCategory.value = expense.category;
  form.expenseDescription.value = expense.description;
  form.expenseSource.value = expense.source;
  form.expenseRealised.checked = expense.realised;

  editingExpenseId = expenseId;
  document.getElementById('expenseFormTitle').textContent = 'Edytuj wydatek';
  
  // Scroll do formularza
  form.scrollIntoView({ behavior: 'smooth' });
};

window.deleteExpense = async (expenseId) => {
  if (!confirm('Czy na pewno chcesz usunąć ten wydatek?')) return;

  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expenseId);
  const updated = expenses.filter(e => e.id !== expenseId);
  
  try {
    await saveExpenses(updated);
    
    // Aktualizuj kopertę dnia jeśli wydatek był dzisiejszy i zrealizowany
    if (expense && expense.realised && expense.date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    showSuccessMessage('Wydatek usunięty');
  } catch (error) {
    console.error('❌ Błąd usuwania wydatku:', error);
    showErrorMessage('Nie udało się usunąć wydatku');
  }
};

// ==================== PRZYCHODY ====================

window.addIncome = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const amount = parseFloat(form.incomeAmount.value);
  const date = form.incomeDate.value;
  const source = form.incomeSource.value.trim();
  const description = form.incomeDescription.value.trim();
  const realised = form.incomeRealised.checked;

  if (!validateAmount(amount)) {
    showErrorMessage('Kwota musi być większa od 0');
    return;
  }

  const income = {
    id: editingIncomeId || `inc_${Date.now()}`,
    amount,
    date,
    source,
    description,
    realised,
    timestamp: editingIncomeId ? getIncomes().find(i => i.id === editingIncomeId)?.timestamp : getCurrentTimeString()
  };

  const incomes = getIncomes();
  const updated = editingIncomeId
    ? incomes.map(i => i.id === editingIncomeId ? income : i)
    : [...incomes, income];

  try {
    await saveIncomes(updated);
    
    // Aktualizuj kopertę dnia jeśli przychód jest dzisiejszy
    if (date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    form.reset();
    form.incomeDate.value = getWarsawDateString();
    editingIncomeId = null;
    document.getElementById('incomeFormTitle').textContent = 'Dodaj przychód';
    showSuccessMessage(editingIncomeId ? 'Przychód zaktualizowany' : 'Przychód dodany');
  } catch (error) {
    console.error('❌ Błąd zapisywania przychodu:', error);
    showErrorMessage('Nie udało się zapisać przychodu');
  }
};

window.editIncome = (incomeId) => {
  const income = getIncomes().find(i => i.id === incomeId);
  if (!income) return;

  const form = document.getElementById('incomeForm');
  form.incomeAmount.value = income.amount;
  form.incomeDate.value = income.date;
  form.incomeSource.value = income.source;
  form.incomeDescription.value = income.description;
  form.incomeRealised.checked = income.realised;

  editingIncomeId = incomeId;
  document.getElementById('incomeFormTitle').textContent = 'Edytuj przychód';
  
  // Scroll do formularza
  form.scrollIntoView({ behavior: 'smooth' });
};

window.deleteIncome = async (incomeId) => {
  if (!confirm('Czy na pewno chcesz usunąć ten przychód?')) return;

  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);
  const updated = incomes.filter(i => i.id !== incomeId);
  
  try {
    await saveIncomes(updated);
    
    // Aktualizuj kopertę dnia jeśli przychód był dzisiejszy
    if (income && income.date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    showSuccessMessage('Przychód usunięty');
  } catch (error) {
    console.error('❌ Błąd usuwania przychodu:', error);
    showErrorMessage('Nie udało się usunąć przychodu');
  }
};

// ==================== USTAWIENIA ====================

window.saveSettings = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const endDate1 = form.endDate1.value;
  const endDate2 = form.endDate2.value || '';
  const savingGoal = parseFloat(form.savingGoal.value) || 0;

  try {
    await saveEndDates(endDate1, endDate2);
    await saveSavingGoal(savingGoal);
    
    // Aktualizuj kopertę dnia po zmianie ustawień
    await updateDailyEnvelope();
    
    showSuccessMessage('Ustawienia zapisane');
    renderSummary();
  } catch (error) {
    console.error('❌ Błąd zapisywania ustawień:', error);
    showErrorMessage('Nie udało się zapisać ustawień');
  }
};

// ==================== NAWIGACJA ====================

window.showSection = (sectionId) => {
  // Ukryj wszystkie sekcje
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Pokaż wybraną sekcję
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Aktualizuj aktywny przycisk w menu
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
};

// ==================== PROFIL I WIADOMOŚCI ====================

window.openProfile = () => {
  showProfileModal();
};

window.openMessages = () => {
  showMessagesModal();
};

// ==================== LOGOWANIE I REJESTRACJA ====================

window.handleLogin = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const email = form.loginEmail.value.trim();
  const password = form.loginPassword.value;

  try {
    await loginUser(email, password);
    form.reset();
  } catch (error) {
    console.error('❌ Błąd logowania:', error);
    showErrorMessage(error.message || 'Nie udało się zalogować');
  }
};

window.handleRegister = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const email = form.registerEmail.value.trim();
  const password = form.registerPassword.value;
  const displayName = form.registerDisplayName.value.trim();

  if (password.length < 6) {
    showErrorMessage('Hasło musi mieć minimum 6 znaków');
    return;
  }

  if (!displayName || displayName.length < 2) {
    showErrorMessage('Nazwa użytkownika musi mieć minimum 2 znaki');
    return;
  }

  try {
    await registerUser(email, password, displayName);
    form.reset();
  } catch (error) {
    console.error('❌ Błąd rejestracji:', error);
    showErrorMessage(error.message || 'Nie udało się zarejestrować');
  }
};

window.handleLogout = async () => {
  if (!confirm('Czy na pewno chcesz się wylogować?')) return;
  
  try {
    await clearAllListeners();
    await logoutUser();
  } catch (error) {
    console.error('❌ Błąd wylogowania:', error);
    showErrorMessage('Nie udało się wylogować');
  }
};

// ==================== OBSŁUGA STANU UWIERZYTELNIENIA ====================

onAuthChange(async (user) => {
  const authSection = document.getElementById('authSection');
  const appSection = document.getElementById('appSection');
  const usernameSpan = document.getElementById('username');
  const profileBtn = document.getElementById('profileBtn');
  const appVersionSpan = document.getElementById('appVersion');

  if (user) {
    console.log('✅ Użytkownik zalogowany:', user.displayName || user.email);
    console.log('🔑 User ID:', user.uid);

    // Ukryj sekcję logowania
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');

    // Wyświetl nazwę użytkownika
    const displayName = await getDisplayName(user.uid);
    updateDisplayNameInUI(displayName);

    // Wyświetl wersję aplikacji
    if (appVersionSpan) {
      appVersionSpan.textContent = `v${APP_VERSION}`;
    }

    // Wyczyść poprzednie dane
    console.log('🧹 Czyszczenie Firebase cache: firebase:host:krezus-e3070-default-rtdb.firebaseio.com');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('firebase:host:krezus-e3070-default-rtdb.firebaseio.com')) {
        localStorage.removeItem(key);
      }
    });

    // Załaduj dane użytkownika
    await loadAllData();

    // Sprawdź i wyświetl liczbę nieprzeczytanych wiadomości
    const unreadCount = await getUnreadMessagesCount(user.uid);
    updateNotificationBadge('messagesBadge', unreadCount);

  } else {
    console.log('❌ Użytkownik wylogowany');
    
    // Wyczyść listenery
    await clearAllListeners();
    
    // Pokaż sekcję logowania
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
});

// Inicjalizacja formularzy
document.addEventListener('DOMContentLoaded', () => {
  // Ustaw dzisiejszą datę jako domyślną
  const today = getWarsawDateString();
  const expenseDateInput = document.getElementById('expenseDate');
  const incomeDateInput = document.getElementById('incomeDate');
  
  if (expenseDateInput) expenseDateInput.value = today;
  if (incomeDateInput) incomeDateInput.value = today;

  // Załaduj kategorie do selecta wydatków
  const loadCategoriesSelect = () => {
    const select = document.getElementById('expenseCategory');
    if (!select) return;
    
    const categories = getCategories();
    select.innerHTML = '<option value="">Wybierz kategorię</option>' +
      categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
  };

  // Nasłuchuj na zmiany kategorii
  const observer = new MutationObserver(loadCategoriesSelect);
  const categoriesList = document.getElementById('categoriesList');
  if (categoriesList) {
    observer.observe(categoriesList, { childList: true, subtree: true });
  }

  // Walidatory - POPRAWKA: sprawdź czy element istnieje przed dodaniem walidatora
  const expenseAmountInput = document.getElementById('expenseAmount');
  const incomeAmountInput = document.getElementById('incomeAmount');
  const savingGoalInput = document.querySelector('[name="savingGoal"]');
  const newCategoryNameInput = document.getElementById('newCategoryName');
  
  if (expenseAmountInput) attachValidator(expenseAmountInput, validateAmount);
  if (incomeAmountInput) attachValidator(incomeAmountInput, validateAmount);
  if (savingGoalInput) attachValidator(savingGoalInput, (val) => val >= 0);
  if (newCategoryNameInput) attachValidator(newCategoryNameInput, validateCategoryName);

  console.log('✅ Aplikacja Krezus gotowa do działania!');
});