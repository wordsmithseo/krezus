// src/app.js - Główna aplikacja Krezus v1.6.0
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
  calculateCurrentLimits,
  calculateForecastLimits,
  computeSourcesRemaining,
  checkAnomalies,
  getGlobalMedian30d,
  updateDailyEnvelope,
  calculateSpendingGauge,
  getTopCategories,
  getTopDescriptionsForCategory,
  getTopSources,
  computeComparisons,
  getEnvelopeCalculationInfo,
  calculateSpendingDynamics
} from './modules/budgetCalculator.js';

import {
  setAnalyticsPeriod,
  setCustomDateRange,
  calculatePeriodStats,
  compareToPreviousPeriod,
  getMostExpensiveCategory,
  getCategoriesBreakdown,
  detectAnomalies,
  getUserExpensesBreakdown,
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

import {
  log,
  getLogs,
  clearAllLogs,
  calculateLogsSize,
  formatLogEntry
} from './modules/logger.js';

// Stan aplikacji
let currentExpensePage = 1;
let currentIncomePage = 1;
let editingExpenseId = null;
let editingIncomeId = null;
let budgetUsersCache = [];
let budgetUsersUnsubscribe = null;

const APP_VERSION = '1.6.0';

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
      onCategoriesChange: () => {
        renderCategories();
        setupCategorySuggestions();
      },
      onExpensesChange: () => {
        renderExpenses();
        renderCategories();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
      },
      onIncomesChange: () => {
        renderSources();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
      },
      onEndDatesChange: () => {
        renderSummary();
        updateDailyEnvelope().then(() => renderDailyEnvelope());
      },
      onSavingGoalChange: () => {
        renderSummary();
        updateDailyEnvelope().then(() => renderDailyEnvelope());
      },
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
  renderLogs();
  loadSettings();
  setupCategorySuggestions();
  setupSourceSuggestions();
  setupExpenseTypeToggle();
  setupIncomeTypeToggle();
}

function renderSummary() {
  const { available, savingGoal, toSpend } = calculateAvailableFunds();
  const { daysLeft1, daysLeft2, date1, date2 } = calculateSpendingPeriods();
  const { currentLimit1, currentLimit2 } = calculateCurrentLimits();
  const { projectedAvailable, projectedLimit1, projectedLimit2, futureIncome, futureExpense } = calculateForecastLimits();

  document.getElementById('availableFunds').textContent = available.toFixed(2);
  document.getElementById('savingGoal').textContent = savingGoal.toFixed(2);
  document.getElementById('toSpend').textContent = toSpend.toFixed(2);

  // Limity bieżące
  document.getElementById('currentLimit1').textContent = currentLimit1.toFixed(2);
  document.getElementById('currentDaysLeft1').textContent = daysLeft1;
  document.getElementById('currentLimitDate1').textContent = date1 ? formatDateLabel(date1) : '-';
  
  const currentLimit2Section = document.getElementById('currentLimit2Section');
  if (date2 && date2.trim() !== '') {
    currentLimit2Section.style.display = 'block';
    document.getElementById('currentLimit2').textContent = currentLimit2.toFixed(2);
    document.getElementById('currentDaysLeft2').textContent = daysLeft2;
    document.getElementById('currentLimitDate2').textContent = formatDateLabel(date2);
  } else {
    currentLimit2Section.style.display = 'none';
  }

  // Prognozy
  document.getElementById('projectedAvailable').textContent = projectedAvailable.toFixed(2);
  document.getElementById('projectedLimit1').textContent = projectedLimit1.toFixed(2);
  document.getElementById('daysLeft1').textContent = daysLeft1;
  document.getElementById('projectedLimitDate1').textContent = date1 ? formatDateLabel(date1) : '-';
  
  const projectedLimit2Section = document.getElementById('projectedLimit2Section');
  if (date2 && date2.trim() !== '') {
    projectedLimit2Section.style.display = 'block';
    document.getElementById('projectedLimit2').textContent = projectedLimit2.toFixed(2);
    document.getElementById('daysLeft2').textContent = daysLeft2;
    document.getElementById('projectedLimitDate2').textContent = formatDateLabel(date2);
  } else {
    projectedLimit2Section.style.display = 'none';
  }

  document.getElementById('futureIncome').textContent = futureIncome.toFixed(2);
  document.getElementById('futureExpense').textContent = futureExpense.toFixed(2);
  
  renderSpendingDynamics();
}

function renderSpendingDynamics() {
  const dynamics = calculateSpendingDynamics();
  const gauge = document.getElementById('dynamicsGauge');
  const indicator = document.getElementById('dynamicsIndicator');
  const info = document.getElementById('dynamicsInfo');
  
  if (!gauge || !indicator || !info) return;
  
  const position = dynamics.score;
  
  indicator.style.left = `${position}%`;
  
  const colors = {
    safe: '#10b981',
    good: '#34d399',
    moderate: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444'
  };
  
  indicator.style.background = colors[dynamics.status] || colors.moderate;
  
  let infoHTML = `<strong>${dynamics.message}</strong>`;
  if (dynamics.dailyAvg !== undefined && dynamics.targetDaily !== undefined) {
    infoHTML += `<br><small>Średnia dzienna (7 dni): ${dynamics.dailyAvg.toFixed(2)} zł | Docelowy limit: ${dynamics.targetDaily.toFixed(2)} zł</small>`;
  }
  
  info.innerHTML = infoHTML;
}

function renderDailyEnvelope() {
  const envelope = getDailyEnvelope();
  const { spent, total, percentage, remaining } = calculateSpendingGauge();
  const median = getGlobalMedian30d();
  const calcInfo = getEnvelopeCalculationInfo();

  if (!envelope) {
    document.getElementById('envelopeAmount').textContent = '0.00';
    document.getElementById('envelopeSpent').textContent = '0.00';
    document.getElementById('envelopeRemaining').textContent = '0.00';
    document.getElementById('envelopeMedian').textContent = '0.00';
    document.getElementById('spendingGauge').style.width = '0%';
    
    const calcInfoDiv = document.getElementById('envelopeCalculationInfo');
    if (calcInfoDiv) {
      calcInfoDiv.innerHTML = '<small style="color: white; opacity: 0.95;">Brak danych do wyliczenia koperty</small>';
    }
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
  
  const calcInfoDiv = document.getElementById('envelopeCalculationInfo');
  if (calcInfoDiv && calcInfo) {
    calcInfoDiv.innerHTML = `
      <small style="color: white; font-size: 0.85rem; line-height: 1.4; opacity: 0.95;">
        ${calcInfo.description}<br>
        <strong>Składowe:</strong> ${calcInfo.formula}
      </small>
    `;
  }
}

function renderAnalytics() {
  const stats = calculatePeriodStats();
  const comparison = compareToPreviousPeriod();
  const mostExpensive = getMostExpensiveCategory();
  const breakdown = getCategoriesBreakdown();
  const anomalies = detectAnomalies();
  const userExpenses = getUserExpensesBreakdown();

  document.getElementById('periodExpenses').textContent = stats.totalExpenses.toFixed(2);
  document.getElementById('periodIncomes').textContent = stats.totalIncomes.toFixed(2);
  document.getElementById('periodExpensesCount').textContent = stats.expensesCount;
  document.getElementById('periodIncomesCount').textContent = stats.incomesCount;

  const expChange = document.getElementById('expenseChange');
  expChange.textContent = `${comparison.expenseChange > 0 ? '+' : ''}${comparison.expenseChange.toFixed(1)}%`;

  const incChange = document.getElementById('incomeChange');
  incChange.textContent = `${comparison.incomeChange > 0 ? '+' : ''}${comparison.incomeChange.toFixed(1)}%`;

  const expCountChange = document.getElementById('expenseCountChange');
  expCountChange.textContent = `${comparison.expenseCountChange > 0 ? '+' : ''}${comparison.expenseCountChange.toFixed(1)}%`;

  const incCountChange = document.getElementById('incomeCountChange');
  incCountChange.textContent = `${comparison.incomeCountChange > 0 ? '+' : ''}${comparison.incomeCountChange.toFixed(1)}%`;

  const userExpDiv = document.getElementById('userExpensesBreakdown');
  if (userExpenses.length > 0) {
    userExpDiv.innerHTML = userExpenses.map(user => `
      <div class="category-breakdown-item">
        <div class="category-breakdown-header">
          <strong>${user.userName}</strong>
          <span>${user.amount.toFixed(2)} zł (${user.percentage.toFixed(1)}%)</span>
        </div>
        <div class="category-breakdown-bar">
          <div class="category-breakdown-fill" style="width: ${user.percentage}%"></div>
        </div>
      </div>
    `).join('');
  } else {
    userExpDiv.innerHTML = '<p class="empty-state">Brak wydatków w wybranym okresie</p>';
  }

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
          <div style="margin-top: 5px; color: #ef4444; font-size: 0.9rem;">
            <strong>⚠️ ${a.anomalyReason || 'Anomalia wykryta'}</strong>
          </div>
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
    const totalAmount = expenses
      .filter(e => e.category === cat.name && e.type === 'normal')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { ...cat, count, totalAmount };
  });

  const html = categoryStats.map(cat => `
    <div class="category-item">
      <div>
        <span class="category-name">${cat.name}</span>
        <span class="category-count">(${cat.count} wydatków, ${cat.totalAmount.toFixed(2)} zł)</span>
      </div>
      <button class="btn-icon" onclick="window.deleteCategory('${cat.id}', '${cat.name}')">🗑️</button>
    </div>
  `).join('');

  container.innerHTML = html;
}

function setupExpenseTypeToggle() {
  const expenseTypeSelect = document.getElementById('expenseType');
  const expenseDateGroup = document.querySelector('#expenseDate').closest('.form-group');
  const expenseTimeGroup = document.querySelector('#expenseTime').closest('.form-group');
  
  if (!expenseTypeSelect || !expenseDateGroup || !expenseTimeGroup) return;
  
  const toggleDateTimeFields = () => {
    const type = expenseTypeSelect.value;
    
    if (type === 'normal') {
      expenseDateGroup.style.display = 'none';
      expenseTimeGroup.style.display = 'none';
    } else {
      expenseDateGroup.style.display = 'block';
      expenseTimeGroup.style.display = 'block';
    }
  };
  
  expenseTypeSelect.addEventListener('change', toggleDateTimeFields);
  toggleDateTimeFields();
}

function setupIncomeTypeToggle() {
  const incomeTypeSelect = document.getElementById('incomeType');
  const incomeDateGroup = document.querySelector('#incomeDate').closest('.form-group');
  const incomeTimeGroup = document.querySelector('#incomeTime').closest('.form-group');
  
  if (!incomeTypeSelect || !incomeDateGroup || !incomeTimeGroup) return;
  
  const toggleDateTimeFields = () => {
    const type = incomeTypeSelect.value;
    
    if (type === 'normal') {
      incomeDateGroup.style.display = 'none';
      incomeTimeGroup.style.display = 'none';
    } else {
      incomeDateGroup.style.display = 'block';
      incomeTimeGroup.style.display = 'block';
    }
  };
  
  incomeTypeSelect.addEventListener('change', toggleDateTimeFields);
  toggleDateTimeFields();
}

function setupCategorySuggestions() {
  const categoryInput = document.getElementById('expenseCategory');
  const categoryButtons = document.getElementById('categoryButtons');
  const descriptionInput = document.getElementById('expenseDescription');
  const descriptionSuggestions = document.getElementById('descriptionSuggestions');
  const descriptionButtons = document.getElementById('descriptionButtons');
  
  if (!categoryInput || !categoryButtons) return;

  const newCategoryInput = categoryInput.cloneNode(true);
  categoryInput.parentNode.replaceChild(newCategoryInput, categoryInput);

  const topCategories = getTopCategories(5);
  
  renderCategoryButtons(topCategories);
  
  newCategoryInput.addEventListener('input', () => {
    const value = newCategoryInput.value.trim().toLowerCase();
    
    if (value === '') {
      renderCategoryButtons(topCategories);
    } else {
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

  if (descriptionInput && descriptionSuggestions && descriptionButtons) {
    const newDescriptionInput = descriptionInput.cloneNode(true);
    descriptionInput.parentNode.replaceChild(newDescriptionInput, descriptionInput);
    
    newCategoryInput.addEventListener('change', () => {
      const category = newCategoryInput.value.trim();
      if (category) {
        updateDescriptionButtons(category);
      }
    });

    newDescriptionInput.addEventListener('focus', () => {
      const category = newCategoryInput.value.trim();
      if (category) {
        updateDescriptionButtons(category);
      }
    });

    newDescriptionInput.addEventListener('input', () => {
      const category = newCategoryInput.value.trim();
      const value = newDescriptionInput.value.trim().toLowerCase();
      
      if (!category) {
        descriptionButtons.innerHTML = '';
        return;
      }

      if (value === '') {
        updateDescriptionButtons(category);
      } else {
        const expenses = getExpenses();
        const categoryExpenses = expenses.filter(e => e.category === category);
        const descriptions = [...new Set(categoryExpenses.map(e => e.description).filter(d => d))];
        const filtered = descriptions.filter(d => d.toLowerCase().includes(value)).slice(0, 5);
        
        renderDescriptionButtons(filtered);
      }
    });
  }

  function updateDescriptionButtons(category) {
    const topDescriptions = getTopDescriptionsForCategory(category, 5);
    renderDescriptionButtons(topDescriptions.map(d => d.name));
  }

  function renderDescriptionButtons(descriptions) {
    if (!descriptionButtons) return;
    
    if (descriptions.length === 0) {
      descriptionButtons.innerHTML = '';
      return;
    }

    const html = descriptions.map(desc => `
      <button type="button" class="category-quick-btn" onclick="selectDescription('${desc.replace(/'/g, "\\'")}')">
        ${desc}
      </button>
    `).join('');

    descriptionButtons.innerHTML = html;
  }

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
}

function setupSourceSuggestions() {
  const sourceInput = document.getElementById('incomeSource');
  const sourceSuggestions = document.getElementById('sourceSuggestions');
  const sourceButtons = document.getElementById('sourceButtons');
  
  if (!sourceInput || !sourceSuggestions || !sourceButtons) return;

  const newSourceInput = sourceInput.cloneNode(true);
  sourceInput.parentNode.replaceChild(newSourceInput, sourceInput);

  const topSources = getTopSources(5);
  
  renderSourceButtons(topSources);
  
  newSourceInput.addEventListener('input', () => {
    const value = newSourceInput.value.trim().toLowerCase();
    
    if (value === '') {
      renderSourceButtons(topSources);
    } else {
      const incomes = getIncomes();
      const sources = [...new Set(incomes.map(i => i.source).filter(s => s))];
      const filtered = sources.filter(s => 
        s.toLowerCase().includes(value)
      ).slice(0, 5);
      
      if (filtered.length > 0) {
        renderSourceButtons(filtered);
      } else {
        sourceButtons.innerHTML = '<p style="color: #6b7280; font-size: 0.9rem; padding: 10px;">Brak pasujących źródeł</p>';
      }
    }
  });

  function renderSourceButtons(sources) {
    if (sources.length === 0) {
      sourceButtons.innerHTML = '';
      return;
    }

    const html = sources.map(src => `
      <button type="button" class="category-quick-btn" onclick="selectSource('${typeof src === 'string' ? src.replace(/'/g, "\\'") : src}')">
        ${src}
      </button>
    `).join('');

    sourceButtons.innerHTML = html;
  }
}

window.selectCategory = (categoryName) => {
  const categoryInput = document.getElementById('expenseCategory');
  if (categoryInput) {
    categoryInput.value = categoryName;
    
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

  const html = paginatedIncomes.map(inc => {
    const isCorrection = inc.source === 'KOREKTA';
    const rowClass = inc.type === 'planned' ? 'planned' : (isCorrection ? 'correction' : 'realised');
    
    return `
    <tr class="${rowClass}">
      <td>${formatDateLabel(inc.date)}</td>
      <td>${inc.time || '-'}</td>
      <td>${inc.amount >= 0 ? '+' : ''}${inc.amount.toFixed(2)} zł</td>
      <td>${inc.userId ? getBudgetUserName(inc.userId) : '-'}</td>
      <td>${isCorrection ? `<strong>⚙️ KOREKTA</strong><br><small>${inc.correctionReason || ''}</small>` : (inc.source || 'Brak')}</td>
      <td>
        <span class="status-badge ${inc.type === 'normal' ? 'status-normal' : 'status-planned'}">
          ${inc.type === 'normal' ? '✓ Zwykły' : '⏳ Planowany'}
        </span>
      </td>
      <td class="actions">
        ${!isCorrection ? `
          <button class="btn-icon" onclick="window.editIncome('${inc.id}')" title="Edytuj">✏️</button>
          <button class="btn-icon" onclick="window.deleteIncome('${inc.id}')" title="Usuń">🗑️</button>
        ` : '<span style="color: #6b7280;">Korekta</span>'}
      </td>
    </tr>
  `}).join('');

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
    await log('CATEGORY_ADD', { categoryName: name });
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
    await log('CATEGORY_DELETE', { categoryName, affectedExpenses: count });
    showSuccessMessage('Kategoria usunięta');
  } catch (error) {
    console.error('❌ Błąd usuwania kategorii:', error);
    showErrorMessage('Nie udało się usunąć kategorii');
  }
};

window.addExpense = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const amount = parseFloat(form.expenseAmount.value);
  const type = form.expenseType.value;
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

  const categories = getCategories();
  if (!categories.some(c => c.name.toLowerCase() === category.toLowerCase())) {
    const newCategory = {
      id: `cat_${Date.now()}`,
      name: category
    };
    const updatedCategories = [...categories, newCategory];
    await saveCategories(updatedCategories);
  }

  let date, time;
  
  if (type === 'normal') {
    date = getWarsawDateString();
    time = getCurrentTimeString();
  } else {
    date = form.expenseDate.value;
    time = form.expenseTime.value || '';
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
    
    await log(editingExpenseId ? 'EXPENSE_EDIT' : 'EXPENSE_ADD', {
      amount,
      category,
      description,
      type
    });
    
    form.reset();
    form.expenseDate.value = getWarsawDateString();
    form.expenseType.value = 'normal';
    editingExpenseId = null;
    document.getElementById('expenseFormTitle').textContent = '💸 Dodaj wydatek';
    document.getElementById('descriptionSuggestions').innerHTML = '';
    
    setupExpenseTypeToggle();
    
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
  
  setupExpenseTypeToggle();
  
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
    
    await log('EXPENSE_DELETE', {
      amount: expense?.amount,
      category: expense?.category,
      description: expense?.description
    });
    
    showSuccessMessage('Wydatek usunięty');
  } catch (error) {
    console.error('❌ Błąd usuwania wydatku:', error);
    showErrorMessage('Nie udało się usunąć wydatku');
  }
};

window.addIncome = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const amount = parseFloat(form.incomeAmount.value);
  const type = form.incomeType.value;
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

  let date, time;
  
  if (type === 'normal') {
    date = getWarsawDateString();
    time = getCurrentTimeString();
  } else {
    date = form.incomeDate.value;
    time = form.incomeTime.value || '';
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
    
    if (type === 'normal' && date <= getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    await log(editingIncomeId ? 'INCOME_EDIT' : 'INCOME_ADD', {
      amount,
      source,
      type
    });
    
    form.reset();
    form.incomeDate.value = getWarsawDateString();
    form.incomeType.value = 'normal';
    editingIncomeId = null;
    document.getElementById('incomeFormTitle').textContent = '💰 Dodaj przychód';
    document.getElementById('sourceSuggestions').innerHTML = '';
    
    setupIncomeTypeToggle();
    
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
  
  setupIncomeTypeToggle();
  
  form.scrollIntoView({ behavior: 'smooth' });
};

window.deleteIncome = async (incomeId) => {
  if (!confirm('Czy na pewno chcesz usunąć ten przychód?')) return;

  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);
  const updated = incomes.filter(i => i.id !== incomeId);
  
  try {
    await saveIncomes(updated);
    
    if (income && income.type === 'normal' && income.date <= getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    await log('INCOME_DELETE', {
      amount: income?.amount,
      source: income?.source
    });
    
    showSuccessMessage('Przychód usunięty');
  } catch (error) {
    console.error('❌ Błąd usuwania przychodu:', error);
    showErrorMessage('Nie udało się usunąć przychodu');
  }
};

window.addCorrection = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const amount = parseFloat(form.correctionAmount.value);
  const reason = form.correctionReason.value.trim();
  
  if (isNaN(amount) || amount === 0) {
    showErrorMessage('Podaj prawidłową kwotę korekty (dodatnią lub ujemną)');
    return;
  }
  
  if (!reason) {
    showErrorMessage('Podaj powód korekty');
    return;
  }
  
  const user = getCurrentUser();
  if (!user) {
    showErrorMessage('Musisz być zalogowany');
    return;
  }
  
  const correction = {
    id: `corr_${Date.now()}`,
    amount: amount,
    date: getWarsawDateString(),
    time: getCurrentTimeString(),
    type: 'normal',
    userId: user.uid,
    source: 'KOREKTA',
    correctionReason: reason,
    timestamp: getCurrentTimeString()
  };
  
  const incomes = getIncomes();
  const updated = [...incomes, correction];
  
  try {
    await saveIncomes(updated);
    await updateDailyEnvelope();
    await log('CORRECTION_ADD', {
      amount,
      reason
    });
    
    form.reset();
    showSuccessMessage(`Korekta wprowadzona: ${amount >= 0 ? '+' : ''}${amount.toFixed(2)} zł`);
  } catch (error) {
    console.error('❌ Błąd wprowadzania korekty:', error);
    showErrorMessage('Nie udało się wprowadzić korekty');
  }
};

function loadSettings() {
  const endDates = getEndDates();
  const savingGoal = getSavingGoal();
  
  const endDate1Input = document.getElementById('settingsEndDate1');
  const endDate2Input = document.getElementById('settingsEndDate2');
  const savingGoalInput = document.getElementById('settingsSavingGoal');
  
  if (endDate1Input) endDate1Input.value = endDates.primary || '';
  if (endDate2Input) endDate2Input.value = endDates.secondary || '';
  if (savingGoalInput) savingGoalInput.value = savingGoal || 0;
}

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
    await log('SETTINGS_UPDATE', {
      endDate1,
      endDate2,
      savingGoal
    });
    
    showSuccessMessage('Ustawienia zapisane');
  } catch (error) {
    console.error('❌ Błąd zapisywania ustawień:', error);
    showErrorMessage('Nie udało się zapisać ustawień');
  }
};

async function renderLogs() {
  try {
    const logs = await getLogs();
    const logsSize = calculateLogsSize(logs);
    
    document.getElementById('logsSize').textContent = `${logsSize} KB`;
    document.getElementById('logsCount').textContent = logs.length;
    
    const logsList = document.getElementById('logsList');
    
    if (logs.length === 0) {
      logsList.innerHTML = '<p class="empty-state">Brak wpisów w logach</p>';
      return;
    }
    
    const recentLogs = logs.slice(0, 50);
    
    const html = recentLogs.map(logEntry => {
      const formatted = formatLogEntry(logEntry);
      return `
        <div class="log-entry">
          <div class="log-header">
            <span class="log-action">${formatted.label}</span>
            <span class="log-timestamp">${formatted.timestamp}</span>
          </div>
          ${formatted.details && Object.keys(formatted.details).length > 0 ? `
            <div class="log-details">
              ${Object.entries(formatted.details).map(([key, value]) => 
                `<span class="log-detail-item"><strong>${key}:</strong> ${value}</span>`
              ).join(' • ')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    logsList.innerHTML = html;
  } catch (error) {
    console.error('❌ Błąd renderowania logów:', error);
    document.getElementById('logsList').innerHTML = '<p class="empty-state">Błąd ładowania logów</p>';
  }
}

window.clearLogs = async () => {
  if (!confirm('Czy na pewno chcesz wyczyścić wszystkie logi? Ta operacja jest nieodwracalna.')) {
    return;
  }
  
  try {
    await clearAllLogs();
    await renderLogs();
    showSuccessMessage('Logi wyczyszczone');
  } catch (error) {
    console.error('❌ Błąd czyszczenia logów:', error);
    showErrorMessage('Nie udało się wyczyścić logów');
  }
};

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
  
  if (sectionId === 'settingsSection') {
    renderLogs();
  }
};

window.openProfile = () => {
  showProfileModal();
};

window.handleLogin = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const email = form.loginEmail.value.trim();
  const password = form.loginPassword.value;

  try {
    await loginUser(email, password);
    await log('USER_LOGIN', { email });
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
    await log('USER_REGISTER', { email, displayName });
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
    await log('USER_LOGOUT', {});
    await logoutUser();
  } catch (error) {
    console.error('❌ Błąd wylogowania:', error);
    showErrorMessage('Nie udało się wylogować');
  }
};

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

document.addEventListener('DOMContentLoaded', () => {
  const today = getWarsawDateString();
  const expenseDateInput = document.getElementById('expenseDate');
  const incomeDateInput = document.getElementById('incomeDate');
  
  if (expenseDateInput) expenseDateInput.value = today;
  if (incomeDateInput) incomeDateInput.value = today;

  console.log('✅ Aplikacja Krezus gotowa do działania!');
});
