// src/app.js - Główna aplikacja Krezus v1.3.0
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthChange,
  getDisplayName,
  updateDisplayName,
  getCurrentUser,
  getBudgetUsers,
  subscribeToBudgetUsers
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
  calculateAvailableFunds,
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
  setAnalyticsPeriod,
  setCustomDateRange,
  calculatePeriodStats,
  compareToPreviousPeriod,
  getMostExpensiveCategory,
  getCategoriesBreakdown,
  detectAnomalies,
  getCurrentPeriod
} from './modules/analytics.js';

import { 
  showProfileModal
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
let budgetUsersCache = [];
let budgetUsersUnsubscribe = null;

// Wersja aplikacji
const APP_VERSION = '1.3.0';

// Inicjalizacja
console.log('🚀 Aplikacja Krezus uruchomiona');
initGlobalErrorHandler();

// Callback dla aktualizacji nazwy użytkownika
window.onDisplayNameUpdate = (newName) => {
  updateDisplayNameInUI(newName);
};

/**
 * Ukryj loader
 */
function hideLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
}

/**
 * Aktualizuj nazwę użytkownika we wszystkich miejscach UI
 */
function updateDisplayNameInUI(displayName) {
  const usernameSpan = document.getElementById('username');
  if (usernameSpan) {
    usernameSpan.textContent = displayName;
  }
  
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.textContent = `👤 ${displayName}`;
  }
  
  const allUsernameElements = document.querySelectorAll('[data-username]');
  allUsernameElements.forEach(el => {
    el.textContent = displayName;
  });
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
    
    await clearCache();
    await fetchAllData(userId);
    await loadBudgetUsers(userId);
    await autoRealiseDueTransactions();
    await updateDailyEnvelope();
    await renderAll();
    
    await subscribeToRealtimeUpdates(userId, {
      onCategoriesChange: renderCategories,
      onExpensesChange: renderExpenses,
      onIncomesChange: renderSources,
      onEndDatesChange: renderSummary,
      onSavingGoalChange: renderSummary,
      onDailyEnvelopeChange: () => {
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
 * Załaduj użytkowników budżetu
 */
async function loadBudgetUsers(uid) {
  if (budgetUsersUnsubscribe) {
    budgetUsersUnsubscribe();
  }
  
  budgetUsersUnsubscribe = subscribeToBudgetUsers(uid, (users) => {
    budgetUsersCache = users;
    updateBudgetUsersSelects();
  });
}

/**
 * Aktualizuj selecty użytkowników w formularzach
 */
function updateBudgetUsersSelects() {
  const expenseUserSelect = document.getElementById('expenseUser');
  const incomeUserSelect = document.getElementById('incomeUser');
  
  if (!expenseUserSelect || !incomeUserSelect) return;
  
  const currentExpenseValue = expenseUserSelect.value;
  const currentIncomeValue = incomeUserSelect.value;
  
  const optionsHTML = '<option value="">Wybierz użytkownika</option>' +
    budgetUsersCache.map(user => 
      `<option value="${user.id}">${user.name}${user.isOwner ? ' (Właściciel)' : ''}</option>`
    ).join('');
  
  expenseUserSelect.innerHTML = optionsHTML;
  incomeUserSelect.innerHTML = optionsHTML;
  
  if (currentExpenseValue && budgetUsersCache.some(u => u.id === currentExpenseValue)) {
    expenseUserSelect.value = currentExpenseValue;
  }
  
  if (currentIncomeValue && budgetUsersCache.some(u => u.id === currentIncomeValue)) {
    incomeUserSelect.value = currentIncomeValue;
  }
}

/**
 * Pobierz nazwę użytkownika budżetu po ID
 */
function getBudgetUserName(userId) {
  const user = budgetUsersCache.find(u => u.id === userId);
  return user ? user.name : 'Nieznany';
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
 * Renderuj podsumowanie
 */
function renderSummary() {
  const { available, savingGoal, toSpend } = calculateAvailableFunds();
  const { daysLeft1, daysLeft2, date2 } = calculateSpendingPeriods();
  const { projectedAvailable, projectedLimit1, projectedLimit2, futureIncome, futureExpense } = calculateForecastLimits();

  document.getElementById('availableFunds').textContent = available.toFixed(2);
  document.getElementById('savingGoal').textContent = savingGoal.toFixed(2);
  document.getElementById('toSpend').textContent = toSpend.toFixed(2);

  document.getElementById('projectedAvailable').textContent = projectedAvailable.toFixed(2);
  document.getElementById('projectedLimit1').textContent = projectedLimit1.toFixed(2);
  document.getElementById('daysLeft1').textContent = daysLeft1;
  
  const projectedLimit2Section = document.getElementById('projectedLimit2Section');
  if (date2 && date2.trim() !== '') {
    projectedLimit2Section.style.display = 'block';
    document.getElementById('projectedLimit2').textContent = projectedLimit2.toFixed(2);
    document.getElementById('daysLeft2').textContent = daysLeft2;
  } else {
    projectedLimit2Section.style.display = 'none';
  }

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
  
  if (percentage < 50) {
    gauge.style.background = 'linear-gradient(90deg, #10b981, #059669)';
  } else if (percentage < 80) {
    gauge.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
  } else {
    gauge.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  }
  
  renderSourcesRemaining();
}

/**
 * Renderuj analitykę
 */
function renderAnalytics() {
  const stats = calculatePeriodStats();
  const comparison = compareToPreviousPeriod();
  const mostExpensive = getMostExpensiveCategory();
  const breakdown = getCategoriesBreakdown();
  const anomalies = detectAnomalies();

  document.getElementById('periodExpenses').textContent = stats.totalExpenses.toFixed(2);
  document.getElementById('periodIncomes').textContent = stats.totalIncomes.toFixed(2);
  document.getElementById('periodTransactions').textContent = stats.totalTransactions;

  const expChange = document.getElementById('expenseChange');
  expChange.textContent = `${comparison.expenseChange > 0 ? '+' : ''}${comparison.expenseChange.toFixed(1)}%`;
  expChange.className = comparison.expenseChange > 0 ? 'change-up' : comparison.expenseChange < 0 ? 'change-down' : 'change-neutral';

  const incChange = document.getElementById('incomeChange');
  incChange.textContent = `${comparison.incomeChange > 0 ? '+' : ''}${comparison.incomeChange.toFixed(1)}%`;
  incChange.className = comparison.incomeChange > 0 ? 'change-down' : comparison.incomeChange < 0 ? 'change-up' : 'change-neutral';

  const transChange = document.getElementById('transactionChange');
  transChange.textContent = `${comparison.transactionChange > 0 ? '+' : ''}${comparison.transactionChange.toFixed(1)}%`;
  transChange.className = comparison.transactionChange > 0 ? 'change-up' : comparison.transactionChange < 0 ? 'change-down' : 'change-neutral';

  const mostExpCat = document.getElementById('mostExpensiveCategory');
  if (mostExpensive) {
    mostExpCat.innerHTML = `
      <div class="top-category-item">
        <div>
          <strong>${mostExpensive.category}</strong>
          <small>${mostExpensive.percentage.toFixed(1)}% wszystkich wydatków</small>
        </div>
        <span class="amount">${mostExpensive.amount.toFixed(2)} zł</span>
      </div>
    `;
  } else {
    mostExpCat.innerHTML = '<p class="empty-state">Brak danych</p>';
  }

  const breakdownDiv = document.getElementById('categoriesBreakdown');
  if (breakdown.length > 0) {
    breakdownDiv.innerHTML = breakdown.map(cat => `
      <div class="category-breakdown-item">
        <div class="category-breakdown-header">
          <strong>${cat.category}</strong>
          <span>${cat.amount.toFixed(2)} zł (${cat.percentage.toFixed(1)}%)</span>
        </div>
        <div class="category-breakdown-bar">
          <div class="category-breakdown-fill" style="width: ${cat.percentage}%"></div>
        </div>
      </div>
    `).join('');
  } else {
    breakdownDiv.innerHTML = '<p class="empty-state">Brak wydatków w wybranym okresie</p>';
  }

  const anomaliesDiv = document.getElementById('anomaliesList');
  if (anomalies.length > 0) {
    anomaliesDiv.innerHTML = anomalies.map(a => `
      <div class="anomaly-item">
        <div>
          <strong>${a.description || 'Brak opisu'}</strong>
          <small>${a.category || 'Brak kategorii'} • ${formatDateLabel(a.date)}</small>
        </div>
        <span class="amount">${a.amount.toFixed(2)} zł</span>
      </div>
    `).join('');
  } else {
    anomaliesDiv.innerHTML = '<p class="empty-state">Brak wykrytych anomalii w wybranym okresie</p>';
  }
}

/**
 * Wybierz okres analityczny
 */
window.selectPeriod = (days) => {
  document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
  
  if (days === 'custom') {
    document.querySelector('.period-btn:last-child').classList.add('active');
    document.getElementById('customPeriodInputs').style.display = 'block';
  } else {
    event.target.classList.add('active');
    document.getElementById('customPeriodInputs').style.display = 'none';
    setAnalyticsPeriod(days);
    renderAnalytics();
  }
};

/**
 * Zastosuj własny przedział
 */
window.applyCustomPeriod = () => {
  const from = document.getElementById('analyticsDateFrom').value;
  const to = document.getElementById('analyticsDateTo').value;
  
  if (!from || !to) {
    showErrorMessage('Wybierz obie daty');
    return;
  }
  
  if (from > to) {
    showErrorMessage('Data "od" nie może być późniejsza niż data "do"');
    return;
  }
  
  setCustomDateRange(from, to);
  renderAnalytics();
  showSuccessMessage('Zastosowano własny przedział dat');
};

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
  
  updateCategorySelect();
}

/**
 * Aktualizuj select kategorii
 */
function updateCategorySelect() {
  const select = document.getElementById('expenseCategory');
  if (!select) return;
  
  const categories = getCategories();
  const currentValue = select.value;
  
  select.innerHTML = '<option value="">Wybierz kategorię</option>' +
    categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
  
  if (currentValue && categories.some(c => c.name === currentValue)) {
    select.value = currentValue;
  }
}

/**
 * Renderuj wydatki
 */
function renderExpenses() {
  const expenses = getExpenses();
  const totalExpenses = expenses.length;
  
  const sorted = [...expenses].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'planned' ? -1 : 1;
    }
    return b.date.localeCompare(a.date);
  });

  const startIdx = (currentExpensePage - 1) * PAGINATION.EXPENSES_PER_PAGE;
  const endIdx = startIdx + PAGINATION.EXPENSES_PER_PAGE;
  const paginatedExpenses = sorted.slice(startIdx, endIdx);

  const tbody = document.getElementById('expensesTableBody');
  
  if (totalExpenses === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Brak wydatków do wyświetlenia</td></tr>';
    updatePaginationVisibility('expensesTableBody', totalExpenses);
    return;
  }

  const html = paginatedExpenses.map(exp => `
    <tr class="${exp.type === 'planned' ? 'planned' : 'realised'}">
      <td>${formatDateLabel(exp.date)}</td>
      <td>${exp.time || '-'}</td>
      <td>${exp.amount.toFixed(2)} zł</td>
      <td>${exp.userId ? getBudgetUserName(exp.userId) : '-'}</td>
      <td>${exp.category || 'Brak'}</td>
      <td>${exp.description || '-'}</td>
      <td>${exp.source || 'Brak'}</td>
      <td>
        <span class="status-badge ${exp.type === 'normal' ? 'status-normal' : 'status-planned'}">
          ${exp.type === 'normal' ? '✓ Zwykły' : '⏳ Planowany'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="window.editExpense('${exp.id}')" title="Edytuj">✏️</button>
        <button class="btn-icon" onclick="window.deleteExpense('${exp.id}')" title="Usuń">🗑️</button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;
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
  html += `<button class="pagination-btn" ${currentExpensePage === 1 ? 'disabled' : ''} onclick="window.changeExpensePage(${currentExpensePage - 1})">◀</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentExpensePage - 1 && i <= currentExpensePage + 1)) {
      html += `<button class="pagination-btn ${i === currentExpensePage ? 'active' : ''}" onclick="window.changeExpensePage(${i})">${i}</button>`;
    } else if (i === currentExpensePage - 2 || i === currentExpensePage + 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  html += `<button class="pagination-btn" ${currentExpensePage === totalPages ? 'disabled' : ''} onclick="window.changeExpensePage(${currentExpensePage + 1})">▶</button>`;
  container.innerHTML = html;
}

window.changeExpensePage = (page) => {
  const total = getExpenses().length;
  const totalPages = Math.ceil(total / PAGINATION.EXPENSES_PER_PAGE);
  
  if (page < 1 || page > totalPages) return;
  
  currentExpensePage = page;
  renderExpenses();
  
  const tableBody = document.getElementById('expensesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Renderuj przychody
 */
function renderSources() {
  const incomes = getIncomes();
  const totalIncomes = incomes.length;
  
  const sorted = [...incomes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'planned' ? -1 : 1;
    }
    return b.date.localeCompare(a.date);
  });

  const startIdx = (currentIncomePage - 1) * PAGINATION.INCOMES_PER_PAGE;
  const endIdx = startIdx + PAGINATION.INCOMES_PER_PAGE;
  const paginatedIncomes = sorted.slice(startIdx, endIdx);

  const tbody = document.getElementById('sourcesTableBody');
  
  if (totalIncomes === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Brak przychodów do wyświetlenia</td></tr>';
    updatePaginationVisibility('sourcesTableBody', totalIncomes);
    return;
  }

  const html = paginatedIncomes.map(inc => `
    <tr class="${inc.type === 'planned' ? 'planned' : 'realised'}">
      <td>${formatDateLabel(inc.date)}</td>
      <td>${inc.time || '-'}</td>
      <td>${inc.amount.toFixed(2)} zł</td>
      <td>${inc.userId ? getBudgetUserName(inc.userId) : '-'}</td>
      <td>${inc.source || 'Brak'}</td>
      <td>${inc.description || '-'}</td>
      <td>
        <span class="status-badge ${inc.type === 'normal' ? 'status-normal' : 'status-planned'}">
          ${inc.type === 'normal' ? '✓ Zwykły' : '⏳ Planowany'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="window.editIncome('${inc.id}')" title="Edytuj">✏️</button>
        <button class="btn-icon" onclick="window.deleteIncome('${inc.id}')" title="Usuń">🗑️</button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;
  renderIncomesPagination(totalIncomes);
  updatePaginationVisibility('sourcesTableBody', totalIncomes);
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
  html += `<button class="pagination-btn" ${currentIncomePage === 1 ? 'disabled' : ''} onclick="window.changeIncomePage(${currentIncomePage - 1})">◀</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentIncomePage - 1 && i <= currentIncomePage + 1)) {
      html += `<button class="pagination-btn ${i === currentIncomePage ? 'active' : ''}" onclick="window.changeIncomePage(${i})">${i}</button>`;
    } else if (i === currentIncomePage - 2 || i === currentIncomePage + 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  html += `<button class="pagination-btn" ${currentIncomePage === totalPages ? 'disabled' : ''} onclick="window.changeIncomePage(${currentIncomePage + 1})">▶</button>`;
  container.innerHTML = html;
}

window.changeIncomePage = (page) => {
  const total = getIncomes().length;
  const totalPages = Math.ceil(total / PAGINATION.INCOMES_PER_PAGE);
  
  if (page < 1 || page > totalPages) return;
  
  currentIncomePage = page;
  renderSources();
  
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
  const type = form.expenseType.value;
  const time = form.expenseTime.value || '';
  const userId = form.expenseUser.value;
  const category = form.expenseCategory.value;
  const description = form.expenseDescription.value.trim();
  const source = form.expenseSource.value.trim();

  if (!validateAmount(amount)) {
    showErrorMessage('Kwota musi być większa od 0');
    return;
  }

  if (!userId) {
    showErrorMessage('Wybierz użytkownika');
    return;
  }

  const expense = {
    id: editingExpenseId || `exp_${Date.now()}`,
    amount,
    date,
    type,
    time,
    userId,
    category,
    description,
    source,
    timestamp: editingExpenseId ? getExpenses().find(e => e.id === editingExpenseId)?.timestamp : getCurrentTimeString()
  };

  const expenses = getExpenses();
  const updated = editingExpenseId
    ? expenses.map(e => e.id === editingExpenseId ? expense : e)
    : [...expenses, expense];

  try {
    await saveExpenses(updated);
    
    if (type === 'normal' && date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    form.reset();
    form.expenseDate.value = getWarsawDateString();
    form.expenseType.value = 'normal';
    editingExpenseId = null;
    document.getElementById('expenseFormTitle').textContent = '💸 Dodaj wydatek';
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
  form.expenseType.value = expense.type || 'normal';
  form.expenseTime.value = expense.time || '';
  form.expenseUser.value = expense.userId || '';
  form.expenseCategory.value = expense.category;
  form.expenseDescription.value = expense.description;
  form.expenseSource.value = expense.source;

  editingExpenseId = expenseId;
  document.getElementById('expenseFormTitle').textContent = '✏️ Edytuj wydatek';
  
  form.scrollIntoView({ behavior: 'smooth' });
};

window.deleteExpense = async (expenseId) => {
  if (!confirm('Czy na pewno chcesz usunąć ten wydatek?')) return;

  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expenseId);
  const updated = expenses.filter(e => e.id !== expenseId);
  
  try {
    await saveExpenses(updated);
    
    if (expense && expense.type === 'normal' && expense.date === getWarsawDateString()) {
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
  const type = form.incomeType.value;
  const time = form.incomeTime.value || '';
  const userId = form.incomeUser.value;
  const source = form.incomeSource.value.trim();
  const description = form.incomeDescription.value.trim();

  if (!validateAmount(amount)) {
    showErrorMessage('Kwota musi być większa od 0');
    return;
  }

  if (!userId) {
    showErrorMessage('Wybierz użytkownika');
    return;
  }

  const income = {
    id: editingIncomeId || `inc_${Date.now()}`,
    amount,
    date,
    type,
    time,
    userId,
    source,
    description,
    timestamp: editingIncomeId ? getIncomes().find(i => i.id === editingIncomeId)?.timestamp : getCurrentTimeString()
  };

  const incomes = getIncomes();
  const updated = editingIncomeId
    ? incomes.map(i => i.id === editingIncomeId ? income : i)
    : [...incomes, income];

  try {
    await saveIncomes(updated);
    
    if (date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    form.reset();
    form.incomeDate.value = getWarsawDateString();
    form.incomeType.value = 'normal';
    editingIncomeId = null;
    document.getElementById('incomeFormTitle').textContent = '💰 Dodaj przychód';
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
  form.incomeType.value = income.type || 'normal';
  form.incomeTime.value = income.time || '';
  form.incomeUser.value = income.userId || '';
  form.incomeSource.value = income.source;
  form.incomeDescription.value = income.description;

  editingIncomeId = incomeId;
  document.getElementById('incomeFormTitle').textContent = '✏️ Edytuj przychód';
  
  form.scrollIntoView({ behavior: 'smooth' });
};

window.deleteIncome = async (incomeId) => {
  if (!confirm('Czy na pewno chcesz usunąć ten przychód?')) return;

  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);
  const updated = incomes.filter(i => i.id !== incomeId);
  
  try {
    await saveIncomes(updated);
    
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
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
};

// ==================== PROFIL ====================

window.openProfile = () => {
  showProfileModal();
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
    if (budgetUsersUnsubscribe) {
      budgetUsersUnsubscribe();
      budgetUsersUnsubscribe = null;
    }
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
  const appVersionSpan = document.getElementById('appVersion');

  if (user) {
    console.log('✅ Użytkownik zalogowany:', user.displayName || user.email);
    console.log('🔑 User ID:', user.uid);

    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');

    const displayName = await getDisplayName(user.uid);
    updateDisplayNameInUI(displayName);

    if (appVersionSpan) {
      appVersionSpan.textContent = `v${APP_VERSION}`;
    }

    console.log('🧹 Czyszczenie Firebase cache');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('firebase:host:krezus-e3070-default-rtdb.firebaseio.com')) {
        localStorage.removeItem(key);
      }
    });

    await loadAllData();
    
    hideLoader();

  } else {
    console.log('❌ Użytkownik wylogowany');
    
    await clearAllListeners();
    if (budgetUsersUnsubscribe) {
      budgetUsersUnsubscribe();
      budgetUsersUnsubscribe = null;
    }
    
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    
    hideLoader();
  }
});

// Inicjalizacja formularzy
document.addEventListener('DOMContentLoaded', () => {
  const today = getWarsawDateString();
  const expenseDateInput = document.getElementById('expenseDate');
  const incomeDateInput = document.getElementById('incomeDate');
  
  if (expenseDateInput) expenseDateInput.value = today;
  if (incomeDateInput) incomeDateInput.value = today;

  console.log('✅ Aplikacja Krezus gotowa do działania!');
});