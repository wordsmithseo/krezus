// src/app.js - Główna aplikacja Krezus v1.5.0
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthChange,
  getDisplayName,
  updateDisplayName,
  getCurrentUser,
  getBudgetUsers,
  subscribeToBudgetUsers,
  deleteBudgetUser
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
  getTopSources,
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
  showProfileModal,
  showPasswordModal
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

const APP_VERSION = '1.5.0';

console.log('🚀 Aplikacja Krezus uruchomiona');
initGlobalErrorHandler();

window.onDisplayNameUpdate = (newName) => {
  updateDisplayNameInUI(newName);
};

function hideLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
}

function updateDisplayNameInUI(displayName) {
  const usernameSpan = document.getElementById('username');
  if (usernameSpan) usernameSpan.textContent = displayName;
  
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) profileBtn.textContent = `👤 ${displayName}`;
  
  document.querySelectorAll('[data-username]').forEach(el => {
    el.textContent = displayName;
  });
}

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

async function loadBudgetUsers(uid) {
  if (budgetUsersUnsubscribe) {
    budgetUsersUnsubscribe();
  }
  
  budgetUsersUnsubscribe = subscribeToBudgetUsers(uid, (users) => {
    budgetUsersCache = users;
    updateBudgetUsersSelects();
  });
}

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

function getBudgetUserName(userId) {
  const user = budgetUsersCache.find(u => u.id === userId);
  return user ? user.name : 'Nieznany';
}

async function renderAll() {
  renderCategories();
  renderExpenses();
  renderSources();
  renderSummary();
  renderDailyEnvelope();
  renderAnalytics();
  setupCategorySuggestions();
  setupSourceSuggestions();
}

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

function renderDailyEnvelope() {
  const envelope = getDailyEnvelope();
  const { spent, total, percentage, remaining } = calculateSpendingGauge();
  const median = getGlobalMedian30d();

  if (!envelope) {
    document.getElementById('envelopeAmount').textContent = '0.00';
    document.getElementById('envelopeSpent').textContent = '0.00';
    document.getElementById('envelopeRemaining').textContent = '0.00';
    document.getElementById('envelopeMedian').textContent = '0.00';
    document.getElementById('spendingGauge').style.width = '0%';
    return;
  }

  document.getElementById('envelopeAmount').textContent = total.toFixed(2);
  document.getElementById('envelopeSpent').textContent = spent.toFixed(2);
  document.getElementById('envelopeRemaining').textContent = remaining.toFixed(2);
  document.getElementById('envelopeMedian').textContent = median.toFixed(2);
  
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

  const incChange = document.getElementById('incomeChange');
  incChange.textContent = `${comparison.incomeChange > 0 ? '+' : ''}${comparison.incomeChange.toFixed(1)}%`;

  const transChange = document.getElementById('transactionChange');
  transChange.textContent = `${comparison.transactionChange > 0 ? '+' : ''}${comparison.transactionChange.toFixed(1)}%`;

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
    anomaliesDiv.innerHTML = '<p class="empty-state">Brak wykrytych anomalii</p>';
  }
}

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

function renderCategories() {
  const categories = getCategories();
  const expenses = getExpenses();
  const container = document.getElementById('categoriesList');
  
  if (categories.length === 0) {
    container.innerHTML = '<p class="empty-state">Brak kategorii. Dodaj pierwszą kategorię!</p>';
    return;
  }

  const categoryStats = categories.map(cat => {
    const count = expenses.filter(e => e.category === cat.name).length;
    return { ...cat, count };
  });

  const html = categoryStats.map(cat => `
    <div class="category-item">
      <div>
        <span class="category-name">${cat.name}</span>
        <span class="category-count">(${cat.count} wydatków)</span>
      </div>
      <button class="btn-icon" onclick="window.deleteCategory('${cat.id}', '${cat.name}')">🗑️</button>
    </div>
  `).join('');

  container.innerHTML = html;
  updateCategorySelect();
}

function updateCategorySelect() {
  setupCategorySuggestions();
  setupSourceSuggestions();
}

function setupCategorySuggestions() {
  const categoryInput = document.getElementById('expenseCategory');
  const categorySuggestions = document.getElementById('categorySuggestions');
  const categoryButtons = document.getElementById('categoryButtons');
  const descriptionInput = document.getElementById('expenseDescription');
  const descriptionSuggestions = document.getElementById('descriptionSuggestions');
  
  if (!categoryInput || !categorySuggestions || !categoryButtons) return;

  const topCategories = getTopCategories(5);
  
  // Renderuj przyciski kategorii
  renderCategoryButtons(topCategories);

categoryInput.addEventListener('input', () => {
  const value = categoryInput.value.trim().toLowerCase();
  
  if (value === '') {
    // Pokaż top 5 kategorii
    renderCategoryButtons(topCategories);
  } else {
    // Filtruj kategorie
    const allCategories = getCategories();
    const filtered = allCategories.filter(c => 
      c.name.toLowerCase().includes(value)
    ).slice(0, 5);
    
    if (filtered.length > 0) {
      renderCategoryButtons(filtered.map(c => ({ name: c.name, amount: 0 })));
    } else {
      categoryButtons.innerHTML = '<p style="color: #6b7280; font-size: 0.9rem; padding: 10px;">Brak pasujących kategorii</p>';
    }
  }
});


  function renderCategoryButtons(categories) {
    if (categories.length === 0) {
      categoryButtons.innerHTML = '';
      return;
    }

    const html = categories.map(cat => `
      <button type="button" class="category-quick-btn" onclick="selectCategory('${cat.name.replace(/'/g, "\\'")}')">
        ${cat.name}
      </button>
    `).join('');

    categoryButtons.innerHTML = html;
  }

  function showCategorySuggestions(suggestions) {
    if (suggestions.length === 0) {
      categorySuggestions.innerHTML = '';
      return;
    }

    const html = suggestions.map(cat => `
      <div class="suggestion-item" onclick="selectCategory('${cat.name.replace(/'/g, "\\'")}')">
        ${cat.name}
      </div>
    `).join('');

    categorySuggestions.innerHTML = html;
  }

  if (descriptionInput && descriptionSuggestions) {
    categoryInput.addEventListener('change', () => {
      const category = categoryInput.value.trim();
      if (category) {
        updateDescriptionSuggestions(category);
      }
    });

    descriptionInput.addEventListener('focus', () => {
      const category = categoryInput.value.trim();
      if (category && descriptionInput.value.trim() === '') {
        updateDescriptionSuggestions(category);
      }
    });

    descriptionInput.addEventListener('input', () => {
      const category = categoryInput.value.trim();
      const value = descriptionInput.value.trim().toLowerCase();
      
      if (!category) {
        descriptionSuggestions.innerHTML = '';
        return;
      }

      if (value === '') {
        updateDescriptionSuggestions(category);
      } else {
        const expenses = getExpenses();
        const categoryExpenses = expenses.filter(e => e.category === category);
        const descriptions = [...new Set(categoryExpenses.map(e => e.description).filter(d => d))];
        const filtered = descriptions.filter(d => d.toLowerCase().includes(value)).slice(0, 5);
        
        showDescriptionSuggestions(filtered);
      }
    });
  }

  function updateDescriptionSuggestions(category) {
    const topDescriptions = getTopDescriptionsForCategory(category, 5);
    showDescriptionSuggestions(topDescriptions.map(d => d.name));
  }

  function showDescriptionSuggestions(suggestions) {
    if (!descriptionSuggestions) return;
    
    if (suggestions.length === 0) {
      descriptionSuggestions.innerHTML = '';
      return;
    }

    const html = suggestions.map(desc => `
      <div class="suggestion-item" onclick="selectDescription('${desc.replace(/'/g, "\\'")}')">
        ${desc}
      </div>
    `).join('');

    descriptionSuggestions.innerHTML = html;
  }
}

function setupSourceSuggestions() {
  const sourceInput = document.getElementById('incomeSource');
  const sourceSuggestions = document.getElementById('sourceSuggestions');
  const sourceButtons = document.getElementById('sourceButtons');
  
  if (!sourceInput || !sourceSuggestions || !sourceButtons) return;

  const topSources = getTopSources(5);
  
  // Renderuj przyciski źródeł
  renderSourceButtons(topSources);
  
  sourceInput.addEventListener('focus', () => {
    if (sourceInput.value.trim() === '') {
      showSourceSuggestions(topSources);
      renderSourceButtons(topSources);
    }
  });

  sourceInput.addEventListener('input', () => {
    const value = sourceInput.value.trim().toLowerCase();
    
    if (value === '') {
      showSourceSuggestions(topSources);
      renderSourceButtons(topSources);
    } else {
      const incomes = getIncomes();
      const sources = [...new Set(incomes.map(i => i.source).filter(s => s))];
      const filtered = sources.filter(s => 
        s.toLowerCase().includes(value)
      ).slice(0, 5);
      
      showSourceSuggestions(filtered);
      sourceButtons.innerHTML = '';
    }
  });

  document.addEventListener('click', (e) => {
    if (!sourceInput.contains(e.target) && !sourceSuggestions.contains(e.target) && !sourceButtons.contains(e.target)) {
      sourceSuggestions.innerHTML = '';
    }
  });

  function renderSourceButtons(sources) {
    if (sources.length === 0) {
      sourceButtons.innerHTML = '';
      return;
    }

    const html = sources.map(src => `
      <button type="button" class="category-quick-btn" onclick="selectSource('${src.replace(/'/g, "\\'")}')">
        ${src}
      </button>
    `).join('');

    sourceButtons.innerHTML = html;
  }

  function showSourceSuggestions(suggestions) {
    if (suggestions.length === 0) {
      sourceSuggestions.innerHTML = '';
      return;
    }

    const html = suggestions.map(src => `
      <div class="suggestion-item" onclick="selectSource('${src.replace(/'/g, "\\'")}')">
        ${src}
      </div>
    `).join('');

    sourceSuggestions.innerHTML = html;
  }
}

window.selectCategory = (categoryName) => {
  const categoryInput = document.getElementById('expenseCategory');
  if (categoryInput) {
    categoryInput.value = categoryName;
    document.getElementById('categorySuggestions').innerHTML = '';
    document.getElementById('categoryButtons').innerHTML = '';
    
    const descriptionInput = document.getElementById('expenseDescription');
    if (descriptionInput) {
      descriptionInput.focus();
    }
    
    const topDescriptions = getTopDescriptionsForCategory(categoryName, 5);
    const descriptionSuggestions = document.getElementById('descriptionSuggestions');
    if (descriptionSuggestions && topDescriptions.length > 0) {
      const html = topDescriptions.map(desc => `
        <div class="suggestion-item" onclick="selectDescription('${desc.name.replace(/'/g, "\\'")}')">
          ${desc.name}
        </div>
      `).join('');
      descriptionSuggestions.innerHTML = html;
    }
  }
};

window.selectDescription = (description) => {
  const descriptionInput = document.getElementById('expenseDescription');
  if (descriptionInput) {
    descriptionInput.value = description;
    document.getElementById('descriptionSuggestions').innerHTML = '';
  }
};

window.selectSource = (source) => {
  const sourceInput = document.getElementById('incomeSource');
  if (sourceInput) {
    sourceInput.value = source;
    document.getElementById('sourceSuggestions').innerHTML = '';
    document.getElementById('sourceButtons').innerHTML = '';
  }
};

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
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Brak wydatków do wyświetlenia</td></tr>';
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
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Brak przychodów do wyświetlenia</td></tr>';
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
    
    // ✅ DODAJ TE DWA WYWOŁANIA:
    renderCategories();
    setupCategorySuggestions();
    
    showSuccessMessage('Kategoria dodana');
  } catch (error) {
    console.error('❌ Błąd dodawania kategorii:', error);
    showErrorMessage('Nie udało się dodać kategorii');
  }
};

window.deleteCategory = async (categoryId, categoryName) => {
  const expenses = getExpenses();
  const count = expenses.filter(e => e.category === categoryName).length;
  
  if (count > 0) {
    const confirmed = await showPasswordModal(
      'Usuwanie kategorii',
      `Kategoria "${categoryName}" zawiera ${count} wydatków. Wszystkie te wydatki zostaną TRWALE usunięte. Aby potwierdzić, podaj hasło głównego konta.`
    );
    
    if (!confirmed) return;
    
    const updatedExpenses = expenses.filter(e => e.category !== categoryName);
    await saveExpenses(updatedExpenses);
  } else {
    if (!confirm('Czy na pewno chcesz usunąć tę kategorię?')) return;
  }

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
  const category = form.expenseCategory.value.trim();
  const description = form.expenseDescription.value.trim();

  if (!validateAmount(amount)) {
    showErrorMessage('Kwota musi być większa od 0');
    return;
  }

  if (!userId) {
    showErrorMessage('Wybierz użytkownika');
    return;
  }
  
  if (!category) {
    showErrorMessage('Podaj kategorię');
    return;
  }
  
  if (!description) {
    showErrorMessage('Podaj opis');
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
    document.getElementById('categorySuggestions').innerHTML = '';
    document.getElementById('categoryButtons').innerHTML = '';
    document.getElementById('descriptionSuggestions').innerHTML = '';
    
    setupCategorySuggestions();
    
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
    document.getElementById('sourceSuggestions').innerHTML = '';
    document.getElementById('sourceButtons').innerHTML = '';
    
    setupSourceSuggestions();
    
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