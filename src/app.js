// src/app.js
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
  clearCache,
  loadIncomes,  
  loadExpenses 

} from './modules/dataManager.js';

import {
  calculateRealisedTotals,
  calculateSpendingPeriods,
  calculateAvailableFunds,
  calculateCurrentLimits,
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
  calculateSpendingDynamics,
  getTodayExpenses,
  getWeekExpenses,
  getMonthExpenses,
  calculatePlannedTransactionsTotals
} from './modules/budgetCalculator.js';

import {
  setAnalyticsPeriod,
  setCustomDateRange,
  calculatePeriodStats,
  compareToPreviousPeriod,
  getMostExpensiveCategories,
  getCategoriesBreakdown,
  detectAnomalies,
  getUserExpensesBreakdown,
  getCurrentPeriod,
  setBudgetUsersCache
} from './modules/analytics.js';

import { 
  showProfileModal,
  showPasswordModal,
  showEditCategoryModal
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

let currentExpensePage = 1;
let currentIncomePage = 1;
let editingExpenseId = null;
let editingIncomeId = null;
let budgetUsersCache = [];
let budgetUsersUnsubscribe = null;
let isLoadingData = false;

const APP_VERSION = '1.9.6';

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
  if (isLoadingData) {
    console.log('⏳ Ładowanie danych już w toku, pomijam...');
    return;
  }
  
  isLoadingData = true;
  
  try {
    const userId = getCurrentUser()?.uid;
    if (!userId) {
      console.error('❌ Brak zalogowanego użytkownika');
      isLoadingData = false;
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
      onExpensesChange: async () => {
        await updateDailyEnvelope();
        renderExpenses();
        renderCategories();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
      },
      onIncomesChange: async () => {
        await updateDailyEnvelope();
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
    
    console.log('✅ Dane załadowane pomyślnie');
    
  } catch (error) {
    console.error('❌ Błąd ładowania danych:', error);
    showErrorMessage('Nie udało się załadować danych. Spróbuj odświeżyć stronę.');
  } finally {
    isLoadingData = false;
  }
}

async function loadBudgetUsers(uid) {
  if (budgetUsersUnsubscribe) {
    budgetUsersUnsubscribe();
  }
  
  budgetUsersUnsubscribe = subscribeToBudgetUsers(uid, (users) => {
    budgetUsersCache = users;
    updateBudgetUsersSelects();
    setBudgetUsersCache(users);
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
  const { available, savingGoal } = calculateAvailableFunds();
  const { daysLeft1, daysLeft2, date1, date2 } = calculateSpendingPeriods();
  const { currentLimit1, currentLimit2 } = calculateCurrentLimits();
  const { futureIncome1, futureExpense1, futureIncome2, futureExpense2 } = calculatePlannedTransactionsTotals();
  
  const todayExpenses = getTodayExpenses();
  const weekExpenses = getWeekExpenses();
  const monthExpenses = getMonthExpenses();

  document.getElementById('availableFunds').textContent = available.toFixed(2);
  document.getElementById('savingGoal').textContent = savingGoal.toFixed(2);
  
  document.getElementById('todayExpenses').textContent = todayExpenses.toFixed(2);
  document.getElementById('weekExpenses').textContent = weekExpenses.toFixed(2);
  document.getElementById('monthExpenses').textContent = monthExpenses.toFixed(2);

  document.getElementById('currentLimit1').textContent = currentLimit1.toFixed(2);
  document.getElementById('currentDaysLeft1').textContent = daysLeft1;
  document.getElementById('currentLimitDate1').textContent = date1 ? formatDateLabel(date1) : '-';
  
  // Prognoza dla okresu 1
  const projectedLimit1 = daysLeft1 > 0 ? (available - savingGoal + futureIncome1 - futureExpense1) / daysLeft1 : 0;
  const prognosis1El = document.getElementById('prognosis1');
  if (prognosis1El) {
    if (futureIncome1 > 0 || futureExpense1 > 0) {
      prognosis1El.textContent = `z planowanymi: ${projectedLimit1.toFixed(2)} zł/dzień`;
      prognosis1El.style.display = 'block';
    } else {
      prognosis1El.style.display = 'none';
    }
  }
  
  const currentLimit2Section = document.getElementById('currentLimit2Section');
  if (date2 && date2.trim() !== '') {
    currentLimit2Section.style.display = 'block';
    document.getElementById('currentLimit2').textContent = currentLimit2.toFixed(2);
    document.getElementById('currentDaysLeft2').textContent = daysLeft2;
    document.getElementById('currentLimitDate2').textContent = formatDateLabel(date2);
    
    // Prognoza dla okresu 2
    const projectedLimit2 = daysLeft2 > 0 ? (available - savingGoal + futureIncome2 - futureExpense2) / daysLeft2 : 0;
    const prognosis2El = document.getElementById('prognosis2');
    if (prognosis2El) {
      if (futureIncome2 > 0 || futureExpense2 > 0) {
        prognosis2El.textContent = `z planowanymi: ${projectedLimit2.toFixed(2)} zł/dzień`;
        prognosis2El.style.display = 'block';
      } else {
        prognosis2El.style.display = 'none';
      }
    }
  } else {
    currentLimit2Section.style.display = 'none';
  }

const displayIncome = (date2 && date2.trim() !== '') ? futureIncome2 : futureIncome1;
const displayExpense = (date2 && date2.trim() !== '') ? futureExpense2 : futureExpense1;

document.getElementById('futureIncome').textContent = displayIncome.toFixed(2);
document.getElementById('futureExpense').textContent = displayExpense.toFixed(2);
  
  renderSpendingDynamics();
}

function renderSpendingDynamics() {
  const dynamics = calculateSpendingDynamics();
  const container = document.getElementById('dynamicsInfo');
  
  if (!container) return;
  
  let statusClass = '';
  switch(dynamics.status) {
    case 'excellent':
      statusClass = 'dynamics-excellent';
      break;
    case 'good':
      statusClass = 'dynamics-good';
      break;
    case 'moderate':
      statusClass = 'dynamics-moderate';
      break;
    case 'warning':
      statusClass = 'dynamics-warning';
      break;
    case 'critical':
      statusClass = 'dynamics-critical';
      break;
    case 'no-date':
      statusClass = 'dynamics-no-date';
      break;
  }
  
  let html = `
    <div class="dynamics-card ${statusClass}">
      <h4 class="dynamics-title">${dynamics.title}</h4>
      <p class="dynamics-summary">${dynamics.summary}</p>
      
      ${dynamics.details.length > 0 ? `
        <div class="dynamics-details">
          <strong>📊 Szczegóły:</strong>
          <ul>
            ${dynamics.details.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="dynamics-recommendation">
        <strong>💡 Rekomendacja:</strong>
        <p>${dynamics.recommendation}</p>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
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
      if (calcInfo) {
        calcInfoDiv.innerHTML = `<small style="color: white; opacity: 0.95;">${calcInfo.description}</small>`;
      } else {
        calcInfoDiv.innerHTML = '<small style="color: white; opacity: 0.95;">Brak danych do wyliczenia koperty</small>';
      }
    }
    
    const overLimitDiv = document.getElementById('envelopeOverLimit');
    if (overLimitDiv) {
      overLimitDiv.style.display = 'none';
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
  
  const overLimitDiv = document.getElementById('envelopeOverLimit');
  if (overLimitDiv) {
    if (spent > total) {
      const overAmount = (spent - total).toFixed(2);
      overLimitDiv.innerHTML = `
        <div style="color: #fee; font-weight: 600; margin-top: 10px;">
          ⚠️ Przekroczono kopertę o ${overAmount} zł
        </div>
      `;
      overLimitDiv.style.display = 'block';
    } else {
      overLimitDiv.style.display = 'none';
    }
  }
}

function renderAnalytics() {
  const stats = calculatePeriodStats();
  const comparison = compareToPreviousPeriod();
  const topCategories = getMostExpensiveCategories(3);
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

  const topCatDiv = document.getElementById('mostExpensiveCategory');
  if (topCategories.length > 0) {
    topCatDiv.innerHTML = topCategories.map((cat, index) => `
      <div class="top-category-item">
        <div>
          <strong>${index + 1}. ${cat.category}</strong>
          <small>${cat.percentage.toFixed(1)}% wszystkich wydatków</small>
        </div>
        <span class="amount">${cat.amount.toFixed(2)} zł</span>
      </div>
    `).join('');
  } else {
    topCatDiv.innerHTML = '<p class="empty-state">Brak danych</p>';
  }

  const chartCanvas = document.getElementById('categoriesChart');
  if (chartCanvas && breakdown.length > 0) {
    renderCategoriesChart(breakdown);
  } else if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Brak wydatków w wybranym okresie', chartCanvas.width / 2, chartCanvas.height / 2);
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

let categoriesChartInstance = null;
let chartTooltip = null;

function renderCategoriesChart(breakdown) {
  const canvas = document.getElementById('categoriesChart');
  if (!canvas) return;
  
  if (categoriesChartInstance) {
    categoriesChartInstance.destroy();
  }
  
  if (chartTooltip) {
    chartTooltip.remove();
    chartTooltip = null;
  }
  
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const isMobile = containerWidth < 768;
  
  canvas.width = containerWidth;
  canvas.height = isMobile ? 700 : 450;
  canvas.style.display = 'block';
  
  const ctx = canvas.getContext('2d');
  
  const labels = breakdown.map(b => b.category);
  const data = breakdown.map(b => b.amount);
  
  const maxAmount = Math.max(...data);
  const chartHeight = canvas.height - (isMobile ? 250 : 150);
  const chartWidth = canvas.width - (isMobile ? 80 : 120);
  const barWidth = Math.min(isMobile ? 60 : 70, (chartWidth / breakdown.length) - (isMobile ? 15 : 25));
  const startX = isMobile ? 60 : 70;
  const startY = canvas.height - (isMobile ? 200 : 120);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, 20);
  ctx.lineTo(startX, startY);
  ctx.lineTo(canvas.width - 20, startY);
  ctx.stroke();
  
  const numYLabels = 5;
  for (let i = 0; i <= numYLabels; i++) {
    const y = startY - (i / numYLabels) * chartHeight;
    const value = (i / numYLabels) * maxAmount;
    
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
    
    ctx.fillStyle = '#6b7280';
    ctx.font = isMobile ? '12px Arial' : '13px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${value.toFixed(0)}`, startX - (isMobile ? 5 : 10), y + 4);
  }
  
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316'
  ];
  
  const barData = [];
  
  breakdown.forEach((item, index) => {
    const barHeight = (item.amount / maxAmount) * chartHeight;
    const x = startX + 20 + (index * (barWidth + (isMobile ? 10 : 25)));
    const y = startY - barHeight;
    
    barData.push({
      x,
      y,
      width: barWidth,
      height: barHeight,
      category: item.category,
      amount: item.amount,
      percentage: item.percentage
    });
    
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);
    
    ctx.save();
    ctx.translate(x + barWidth / 2, startY + (isMobile ? 45 : 25));
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#1f2937';
    ctx.font = isMobile ? 'bold 20px Arial' : 'bold 14px Arial';
    ctx.textAlign = 'right';
    
    const maxChars = isMobile ? 8 : 15;
    const displayText = item.category.length > maxChars 
      ? item.category.substring(0, maxChars) + '...' 
      : item.category;
    
    ctx.fillText(displayText, 0, 0);
    ctx.restore();
  });
  
  chartTooltip = document.createElement('div');
  chartTooltip.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 13px;
    pointer-events: none;
    z-index: 10000;
    display: none;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(chartTooltip);
  
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let hoveredBar = null;
    for (const bar of barData) {
      if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
          mouseY >= bar.y && mouseY <= bar.y + bar.height) {
        hoveredBar = bar;
        break;
      }
    }
    
    if (hoveredBar) {
      chartTooltip.style.display = 'block';
      chartTooltip.style.left = `${e.clientX + 15}px`;
      chartTooltip.style.top = `${e.clientY + 15}px`;
      chartTooltip.innerHTML = `
        <strong>${hoveredBar.category}</strong><br>
        Kwota: ${hoveredBar.amount.toFixed(2)} zł<br>
        Udział: ${hoveredBar.percentage.toFixed(1)}%
      `;
      canvas.style.cursor = 'pointer';
    } else {
      chartTooltip.style.display = 'none';
      canvas.style.cursor = 'default';
    }
  });
  
  canvas.addEventListener('mouseleave', () => {
    chartTooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  });
  
  categoriesChartInstance = { 
    destroy: () => {
      if (chartTooltip) {
        chartTooltip.remove();
        chartTooltip = null;
      }
    } 
  };
}

window.addEventListener('resize', () => {
  const activeSection = document.querySelector('.section.active');
  if (activeSection && activeSection.id === 'analyticsSection') {
    const breakdown = getCategoriesBreakdown();
    if (breakdown.length > 0) {
      renderCategoriesChart(breakdown);
    }
  }
});

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
      <div style="display: flex; gap: 8px;">
        <button class="btn-icon" onclick="window.editCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')">✏️</button>
        <button class="btn-icon" onclick="window.deleteCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')">🗑️</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

function setupExpenseTypeToggle() {
  const expenseTypeSelect = document.getElementById('expenseType');
  const expenseDateGroup = document.querySelector('#expenseDate')?.closest('.form-group');
  const expenseTimeGroup = document.querySelector('#expenseTime')?.closest('.form-group');
  
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
  
  expenseTypeSelect.removeEventListener('change', toggleDateTimeFields);
  expenseTypeSelect.addEventListener('change', toggleDateTimeFields);
  toggleDateTimeFields();
}

function setupIncomeTypeToggle() {
  const incomeTypeSelect = document.getElementById('incomeType');
  const incomeDateGroup = document.querySelector('#incomeDate')?.closest('.form-group');
  const incomeTimeGroup = document.querySelector('#incomeTime')?.closest('.form-group');
  
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
  
  incomeTypeSelect.removeEventListener('change', toggleDateTimeFields);
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
        ${exp.type === 'planned' ? `<button class="btn-icon" onclick="window.realiseExpense('${exp.id}')" title="Zrealizuj teraz">✅</button>` : ''}
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
  
  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentExpensePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentExpensePage ? 'active' : ''}" onclick="window.changeExpensePage(${i})">${i}</button>`;
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

window.realiseExpense = async (expenseId) => {
  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expenseId);
  
  if (!expense || expense.type !== 'planned') return;
  
  expense.type = 'normal';
  expense.date = getWarsawDateString();
  expense.time = getCurrentTimeString();
  expense.wasPlanned = true;
  
  try {
    await saveExpenses(expenses);
    await updateDailyEnvelope();
    
    const budgetUserName = getBudgetUserName(expense.userId);
    await log('EXPENSE_REALISE', {
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      budgetUser: budgetUserName
    });
    
    showSuccessMessage('Wydatek zrealizowany');
  } catch (error) {
    console.error('❌ Błąd realizacji wydatku:', error);
    showErrorMessage('Nie udało się zrealizować wydatku');
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
        ${!isCorrection && inc.type === 'planned' ? `<button class="btn-icon" onclick="window.realiseIncome('${inc.id}')" title="Zrealizuj teraz">✅</button>` : ''}
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
  
  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentIncomePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentIncomePage ? 'active' : ''}" onclick="window.changeIncomePage(${i})">${i}</button>`;
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

window.realiseIncome = async (incomeId) => {
  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);
  
  if (!income || income.type !== 'planned') return;
  
  income.type = 'normal';
  income.date = getWarsawDateString();
  income.time = getCurrentTimeString();
  income.wasPlanned = true;
  
  try {
    await saveIncomes(incomes);
    await updateDailyEnvelope();
    
    const budgetUserName = getBudgetUserName(income.userId);
    await log('INCOME_REALISE', {
      amount: income.amount,
      source: income.source,
      budgetUser: budgetUserName
    });
    
    showSuccessMessage('Przychód zrealizowany');
  } catch (error) {
    console.error('❌ Błąd realizacji przychodu:', error);
    showErrorMessage('Nie udało się zrealizować przychodu');
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
    
    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);
    
    await log('CATEGORY_ADD', { 
      categoryName: name,
      budgetUser: displayName
    });
    
    showSuccessMessage('Kategoria dodana');
  } catch (error) {
    console.error('❌ Błąd dodawania kategorii:', error);
    showErrorMessage('Nie udało się dodać kategorii');
  }
};

window.editCategory = async (categoryId, currentName) => {
  showEditCategoryModal(categoryId, currentName);
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
    
    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);
    
    await log('CATEGORY_DELETE', { 
      categoryName, 
      affectedExpenses: count,
      budgetUser: displayName
    });
    
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
    
    const budgetUserName = getBudgetUserName(userId);
    
    await log(editingExpenseId ? 'EXPENSE_EDIT' : 'EXPENSE_ADD', {
      amount,
      category,
      description,
      type,
      budgetUser: budgetUserName
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
  const confirmed = await showPasswordModal(
    'Usuwanie wydatku',
    'Czy na pewno chcesz usunąć ten wydatek? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );
  
  if (!confirmed) return;

  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expenseId);
  const updated = expenses.filter(e => e.id !== expenseId);
  
  try {
    await saveExpenses(updated);

    await loadExpenses();
    
    if (expense && expense.type === 'normal' && expense.date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    const budgetUserName = expense?.userId ? getBudgetUserName(expense.userId) : 'Nieznany';
    
    await log('EXPENSE_DELETE', {
      amount: expense?.amount,
      category: expense?.category,
      description: expense?.description,
      budgetUser: budgetUserName
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
    
    const budgetUserName = getBudgetUserName(userId);
    
    await log(editingIncomeId ? 'INCOME_EDIT' : 'INCOME_ADD', {
      amount,
      source,
      type,
      budgetUser: budgetUserName
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
  const confirmed = await showPasswordModal(
    'Usuwanie przychodu',
    'Czy na pewno chcesz usunąć ten przychód? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );
  
  if (!confirmed) return;

  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);
  const updated = incomes.filter(i => i.id !== incomeId);
  
  try {
    await saveIncomes(updated);

    await loadIncomes(); 
    
    if (income && income.type === 'normal' && income.date <= getWarsawDateString()) {
      await updateDailyEnvelope();
    }
    
    const budgetUserName = income?.userId ? getBudgetUserName(income.userId) : 'Nieznany';
    
    await log('INCOME_DELETE', {
      amount: income?.amount,
      source: income?.source,
      budgetUser: budgetUserName
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
  const newTotalAmount = parseFloat(form.correctionAmount.value);
  const reason = form.correctionReason.value.trim();
  
  if (isNaN(newTotalAmount)) {
    showErrorMessage('Podaj prawidłową kwotę całkowitych środków');
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
  
  const { available } = calculateAvailableFunds();
  const difference = newTotalAmount - available;
  
  const correctionType = difference >= 0 ? 'PLUS' : 'MINUS';
  
  const correction = {
    id: `corr_${Date.now()}`,
    amount: difference,
    date: getWarsawDateString(),
    time: getCurrentTimeString(),
    type: 'normal',
    userId: user.uid,
    source: 'KOREKTA',
    correctionReason: reason,
    correctionType: correctionType,
    previousAmount: available,
    newAmount: newTotalAmount,
    timestamp: getCurrentTimeString()
  };
  
  const incomes = getIncomes();
  const updated = [...incomes, correction];
  
  try {
    await saveIncomes(updated);
    await updateDailyEnvelope();
    
    const displayName = await getDisplayName(user.uid);
    
    await log('CORRECTION_ADD', {
      difference: difference,
      correctionType: correctionType,
      previousAmount: available,
      newAmount: newTotalAmount,
      reason: reason,
      budgetUser: displayName
    });
    
    form.reset();
    showSuccessMessage(`Korekta wprowadzona: ${correctionType} ${Math.abs(difference).toFixed(2)} zł`);
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
    
    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);
    
    await log('SETTINGS_UPDATE', {
      endDate1,
      endDate2,
      savingGoal,
      budgetUser: displayName
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
          ${formatted.userName ? `
            <div class="log-user">
              <strong>Użytkownik:</strong> ${formatted.userName}
            </div>
          ` : ''}
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
  const confirmed = await showPasswordModal(
    'Czyszczenie logów',
    'Czy na pewno chcesz wyczyścić wszystkie logi? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );
  
  if (!confirmed) return;
  
  try {
    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);
    
    await clearAllLogs(displayName);
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
  
  if (sectionId === 'analyticsSection') {
    setTimeout(() => {
      const breakdown = getCategoriesBreakdown();
      if (breakdown.length > 0) {
        renderCategoriesChart(breakdown);
      }
    }, 100);
  }
};

window.openProfile = () => {
  showProfileModal();
};

window.handleLogin = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = 'Zaloguj się';
  const email = form.loginEmail.value.trim();
  const password = form.loginPassword.value;

  console.log('🔐 Rozpoczęcie logowania...');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logowanie...';
  
  try {
    const user = await loginUser(email, password);
    console.log('✅ loginUser zakończone, użytkownik:', user);
  } catch (error) {
    console.error('❌ Błąd w loginUser:', error);
    showErrorMessage(error.message || 'Nie udało się zalogować');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
};

window.handleRegister = async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = 'Zarejestruj się';
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

  console.log('📝 Rozpoczęcie rejestracji...');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Rejestracja...';
  
  try {
    const user = await registerUser(email, password, displayName);
    console.log('✅ registerUser zakończone, użytkownik:', user);
  } catch (error) {
    console.error('❌ Błąd w registerUser:', error);
    showErrorMessage(error.message || 'Nie udało się zarejestrować');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
};

window.handleLogout = async () => {
  if (!confirm('Czy na pewno chcesz się wylogować?')) return;
  
  try {
    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);
    
    await clearAllListeners();
    if (budgetUsersUnsubscribe) {
      budgetUsersUnsubscribe();
      budgetUsersUnsubscribe = null;
    }
    
    await log('USER_LOGOUT', {
      budgetUser: displayName
    });
    
    await logoutUser();
  } catch (error) {
    console.error('❌ Błąd wylogowania:', error);
    showErrorMessage('Nie udało się wylogować');
  }
};

onAuthChange(async (user) => {
  console.log('🔄 onAuthChange wywołane, user:', user ? user.email : 'null');
  
  const authSection = document.getElementById('authSection');
  const appSection = document.getElementById('appSection');
  const appVersionSpan = document.getElementById('appVersion');
  
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginForm) {
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Zaloguj się';
    }
  }
  
  if (registerForm) {
    const registerBtn = registerForm.querySelector('button[type="submit"]');
    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Zarejestruj się';
    }
  }

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

    console.log('📥 Rozpoczęcie ładowania danych...');
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
    
    if (loginForm) {
      loginForm.reset();
    }
    
    if (registerForm) {
      registerForm.reset();
    }
    
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