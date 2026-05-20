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
  deleteBudgetUser,
  sendPasswordReset
} from './modules/auth.js';

import {
  fetchAllData,
  getCategories,
  getExpenses,
  getIncomes,
  getEndDates,
  getSavingGoal,
  getEnvelopePeriod,
  getDynamicsPeriod,
  getDailyEnvelope,
  saveCategories,
  saveExpenses,
  saveIncomes,
  saveEndDates,
  saveSavingGoal,
  saveEnvelopePeriod,
  saveDynamicsPeriod,
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
  getGlobalMedian30d,
  updateDailyEnvelope,
  recalculateEnvelope,
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
  calculatePlannedTransactionsTotals,
  getWeekDateRange,
  getMonthName,
  clearLimitsCache,
  simulateExpense
} from './modules/budgetCalculator.js';

import {
  setAnalyticsPeriod,
  setCustomDateRange,
  calculatePeriodStats,
  compareToPreviousPeriod,
  getMostExpensiveCategories,
  getCategoriesBreakdown,
  getUserExpensesBreakdown,
  getCurrentPeriod,
  setBudgetUsersCache
} from './modules/analytics.js';

import {
  loadSavingsGoals,
  loadSavingsContributions,
  subscribeToSavingsGoalsUpdates,
  clearSavingsGoalsCache
} from './modules/savingsGoalManager.js';

import {
  showProfileModal,
  showPasswordModal,
  showEditCategoryModal,
  showEditExpenseModal,
  showEditIncomeModal
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

import { getCategoryIcon, getSourceIcon } from './utils/iconMapper.js';

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

import { exportBudgetDataForLLM } from './utils/llmExport.js';

import { sanitizeHTML, escapeHTML } from './utils/sanitizer.js';
import { showConfirmModal } from './components/confirmModal.js';
import { initClickDelegation, getDataAttributes } from './handlers/clickDelegation.js';

// Import funkcji renderowania UI
import { renderSummary } from './ui/renderSummary.js';
import { renderDailyEnvelope } from './ui/renderDailyEnvelope.js';
import { renderExpenses, changeExpensePage, setExpenseDeps } from './ui/renderExpenses.js';
import { renderSources, changeIncomePage, setIncomeDeps } from './ui/renderIncomes.js';
import { renderSavingsGoals } from './ui/renderSavingsGoals.js';
import { renderCategories, changeCategoryPage, CAT_COLORS } from './ui/renderCategories.js';
import { initNavIcons, setActiveNavItem, initMobileDrawer, setMobileDrawer } from './ui/initSidebar.js';
import { icon as lucideIcon } from './utils/icons.js';
import { barChartHTML, dailyChartHTML } from './ui/charts.js';
import './components/savingsGoalsModals.js';

// Import handlerów
import { addExpense, editExpense, deleteExpense, realiseExpense, setExpenseHandlerDeps } from './handlers/expenseHandlers.js';
import { addIncome, editIncome, deleteIncome, realiseIncome, addCorrection, setIncomeHandlerDeps } from './handlers/incomeHandlers.js';
import { addCategory, editCategory, deleteCategory, startMergeCategory, cancelMergeCategory, selectMergeTarget, setCategoryHandlerDeps } from './handlers/categoryHandlers.js';

// Import modułu obecności użytkowników
import { initializePresence, cleanupPresence, recordActivity } from './modules/presence.js';

// Import automatycznej wersji aplikacji
import { initVersion } from './utils/version.js';

let currentLogPage = 1;
let budgetUsersCache = [];
let budgetUsersUnsubscribe = null;
let isLoadingData = false;

const APP_VERSION = '1.9.9';
const LOGS_PER_PAGE = 20;

console.log('🚀 Aplikacja Krezus uruchomiona');
initGlobalErrorHandler();

window.onDisplayNameUpdate = (newName) => {
  updateDisplayNameInUI(newName);
};

// === SPRAWDZANIE PÓŁNOCY I PRZELICZANIE LIMITÓW/KOPERTY ===
let lastKnownDate = getWarsawDateString();
let midnightCheckInterval = null;

function startMidnightChecker() {
  // Zatrzymaj poprzedni interval jeśli istnieje
  if (midnightCheckInterval) {
    clearInterval(midnightCheckInterval);
  }

  console.log('🌙 Uruchomiono sprawdzanie północy');

  // Sprawdzaj co minutę czy nastąpił nowy dzień
  midnightCheckInterval = setInterval(async () => {
    const currentDate = getWarsawDateString();

    if (currentDate !== lastKnownDate) {
      console.log('🌅 Wykryto nowy dzień!', lastKnownDate, '→', currentDate);
      lastKnownDate = currentDate;

      // Wyczyść cache limitów
      clearLimitsCache();
      console.log('🧹 Wyczyszczono cache limitów');

      // Przelicz kopertę dnia
      try {
        await updateDailyEnvelope();
        console.log('📩 Przeliczono kopertę dnia dla nowego dnia');

        // Odśwież interfejs
        renderSummary();
        renderDailyEnvelope();
      } catch (error) {
        console.error('❌ Błąd przeliczania koperty po północy:', error);
      }
    }
  }, 60000); // Co 60 sekund (1 minuta)
}

function hideLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function updateDisplayNameInUI(displayName) {
  const usernameSpan = document.getElementById('username');
  if (usernameSpan) usernameSpan.textContent = displayName;

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) profileBtn.textContent = `Profil`;

  document.querySelectorAll('[data-username]').forEach(el => {
    el.textContent = displayName;
  });

  // Update sidebar user info
  const sidebarName = document.getElementById('sidebarUserName');
  if (sidebarName) sidebarName.textContent = displayName;

  const sidebarAvatar = document.getElementById('sidebarAvatar');
  if (sidebarAvatar) {
    const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    sidebarAvatar.textContent = initials;
  }

  // Update settings profile name input
  const profileDisplayNameInput = document.getElementById('profileDisplayName');
  if (profileDisplayNameInput) profileDisplayNameInput.value = displayName;
}

function updateSectionStats() {
  const expenses = getExpenses();
  const incomes = getIncomes();
  const now = getWarsawDateString().slice(0, 7); // YYYY-MM

  const expensesMonthTotal = expenses
    .filter(e => e.type === 'normal' && e.date && e.date.startsWith(now))
    .reduce((s, e) => s + (e.amount || 0), 0);
  const expensesPlannedTotal = expenses
    .filter(e => e.type === 'planned')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const incomesMonthTotal = incomes
    .filter(i => i.type === 'normal' && i.date && i.date.startsWith(now))
    .reduce((s, i) => s + (i.amount || 0), 0);
  const incomesPlannedTotal = incomes
    .filter(i => i.type === 'planned')
    .reduce((s, i) => s + (i.amount || 0), 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('expensesMonthTotal', expensesMonthTotal.toFixed(2));
  set('expensesPlannedTotal', expensesPlannedTotal.toFixed(2));
  set('expensesCount', expenses.length);
  set('incomesMonthTotal', incomesMonthTotal.toFixed(2));
  set('incomesPlannedTotal', incomesPlannedTotal.toFixed(2));
  set('incomesCount', incomes.length);
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

    // Ładowanie danych oszczędzania
    await loadSavingsGoals(userId);
    await loadSavingsContributions(userId);

    await loadBudgetUsers(userId);
    await autoRealiseDueTransactions();
    await updateDailyEnvelope();
    await renderAll();

    // Uruchom sprawdzanie nowego dnia
    startMidnightChecker();

    await subscribeToRealtimeUpdates(userId, {
      onCategoriesChange: () => {
        renderCategories();
        setupCategorySuggestions();
      },
      onExpensesChange: async () => {
        clearLimitsCache();
        await recalculateEnvelope(); // Awaryjne przeliczenie koperty przy zmianie wydatków
        renderExpenses();
        renderCategories();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
        updateSectionStats();
      },
      onIncomesChange: async () => {
        clearLimitsCache();
        await recalculateEnvelope(); // Awaryjne przeliczenie koperty przy zmianie przychodów

        renderSources();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
        updateSectionStats();
      },
      onEndDatesChange: async () => {
        clearLimitsCache();
        await recalculateEnvelope(); // Awaryjne przeliczenie koperty przy zmianie dat

        renderSummary();
        renderDailyEnvelope();
      },
      onSavingGoalChange: async () => {
        clearLimitsCache();
        await recalculateEnvelope(); // Awaryjne przeliczenie koperty przy zmianie oszczędności

        renderSummary();
        renderDailyEnvelope();
      },
      onDailyEnvelopeChange: () => {
        renderSummary();
        renderDailyEnvelope();
      }
    });

    // Subskrybuj zmiany w celach oszczędzania (osobny moduł)
    subscribeToSavingsGoalsUpdates(userId, {
      onGoalsChange: () => {
        console.log('🔄 Zmiana w celach oszczędzania - re-render');
        renderSavingsGoals();
      },
      onContributionsChange: () => {
        console.log('🔄 Zmiana w wpłatach - re-render');
        renderSavingsGoals();
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
  renderSavingsGoals();
  updateSectionStats();
  await renderLogs();
  loadSettings();
  setupCategorySuggestions();
  setupSourceSuggestions();
  setupExpenseTypeToggle();
  setupIncomeTypeToggle();
  updateNavBadges();
}

function updateNavBadges() {
  const expenses = getExpenses();
  const incomes = getIncomes();
  const categories = getCategories();

  // Badge koperty: pozostało zł (z renderDailyEnvelope danych)
  try {
    const { remaining } = calculateSpendingGauge();
    const envelopeBadge = document.getElementById('navBadgeEnvelope');
    if (envelopeBadge) {
      envelopeBadge.textContent = remaining.toFixed(0) + ' zł';
    }
  } catch (e) { /* ignore */ }

  // Badge wydatków: liczba zrealizowanych
  const expBadge = document.getElementById('navBadgeExpenses');
  if (expBadge) expBadge.textContent = expenses.filter(e => e.type === 'normal').length;

  // Badge przychodów: liczba zrealizowanych
  const incBadge = document.getElementById('navBadgeIncomes');
  if (incBadge) incBadge.textContent = incomes.filter(i => i.type === 'normal').length;

  // Badge kategorii: liczba
  const catBadge = document.getElementById('navBadgeCategories');
  if (catBadge) catBadge.textContent = categories.length;
}

// renderSummary, renderSpendingDynamics i renderDailyEnvelope są teraz importowane z src/ui/

function comparisonCell(label, curr, prev, unit, lowerIsBetter) {
  const delta = prev ? ((curr - prev) / prev) * 100 : 0;
  const isUp = delta > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;
  const arrow = isUp ? '↑' : '↓';
  const deltaClass = `delta ${isUp ? 'up' : 'down'} ${isGood ? 'good' : 'bad'}`;
  const fmt = v => v.toFixed(2);
  return `
    <div style="padding:14px;background:var(--surface-2);border-radius:10px">
      <div class="text-mute text-sm" style="margin-bottom:6px">${label}</div>
      <div style="display:flex;align-items:baseline;gap:8px">
        <div class="num" style="font-size:20px;font-weight:500">${fmt(curr)}${unit ? `<span class="text-mute" style="font-size:12px;margin-left:2px">${unit}</span>` : ''}</div>
        <span class="${deltaClass}" style="font-size:11px">${arrow} ${Math.abs(delta).toFixed(1)}%</span>
      </div>
      <div class="text-mute" style="font-size:11px;margin-top:4px">Poprzednio: <span class="num">${fmt(prev)}${unit ? ' ' + unit : ''}</span></div>
    </div>`;
}

function renderAnalytics() {
  const stats = calculatePeriodStats();
  const comparison = compareToPreviousPeriod();
  const breakdown = getCategoriesBreakdown();
  const userExpenses = getUserExpensesBreakdown();

  // Stat tiles
  document.getElementById('periodExpenses').textContent = stats.totalExpenses.toFixed(2);
  document.getElementById('periodIncomes').textContent = stats.totalIncomes.toFixed(2);
  document.getElementById('periodExpensesCount').textContent = stats.expensesCount;
  document.getElementById('periodIncomesCount').textContent = stats.incomesCount;

  // Comparison cells
  const compEl = document.getElementById('analyticsComparison');
  if (compEl) {
    compEl.innerHTML = [
      comparisonCell('Suma wydatków', stats.totalExpenses, comparison.previousPeriod.totalExpenses, 'zł', true),
      comparisonCell('Suma przychodów', stats.totalIncomes, comparison.previousPeriod.totalIncomes, 'zł', false),
      comparisonCell('Liczba wydatków', stats.expensesCount, comparison.previousPeriod.expensesCount, '', true),
      comparisonCell('Liczba przychodów', stats.incomesCount, comparison.previousPeriod.incomesCount, '', false),
    ].join('');
  }

  // User breakdown
  const userExpDiv = document.getElementById('userExpensesBreakdown');
  if (userExpenses.length > 0) {
    userExpDiv.innerHTML = userExpenses.map(user => `
      <div style="margin-bottom:12px">
        <div class="row" style="margin-bottom:6px">
          <div class="avatar sm" style="background:var(--accent)">${escapeHTML((user.userName || '?')[0])}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${escapeHTML(user.userName)}</div>
            <div class="text-mute text-sm">${user.count || ''} transakcji</div>
          </div>
          <div class="num" style="font-weight:500;flex-shrink:0">${user.amount.toFixed(2)} zł</div>
        </div>
        <div class="progress"><div style="width:${Math.min(user.percentage, 100)}%;height:100%;background:var(--accent);border-radius:inherit;transition:width 400ms ease"></div></div>
        <div class="text-mute text-sm" style="margin-top:4px;text-align:right">${user.percentage.toFixed(1)}%</div>
      </div>
    `).join('');
  } else {
    userExpDiv.innerHTML = '<div class="empty-state" style="padding:24px"><h3>Brak wydatków</h3><p class="hint">Brak danych w wybranym okresie</p></div>';
  }

  // BarChart (category breakdown) — using design system component
  const topCatDiv = document.getElementById('mostExpensiveCategory');
  if (breakdown.length > 0) {
    const items = breakdown.slice(0, 8).map((cat, i) => ({
      label: cat.category,
      value: cat.amount,
      icon: getCategoryIcon(cat.category),
      color: CAT_COLORS[i % CAT_COLORS.length],
    }));
    const total = breakdown.reduce((s, c) => s + c.amount, 0);
    topCatDiv.innerHTML = barChartHTML(items, total);
  } else {
    topCatDiv.innerHTML = '<div class="empty-state" style="padding:24px"><h3>Brak danych</h3></div>';
  }

  // Daily trend chart
  const dailyChartEl = document.getElementById('analyticsDailyChart');
  if (dailyChartEl) {
    const expenses = getExpenses();
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getWarsawDateString(d);
      const value = expenses
        .filter(e => e.type === 'normal' && e.date === dateStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      days.push({ date: dateStr, value });
    }
    dailyChartEl.innerHTML = dailyChartHTML(days, { height: 200 });
  }

  const chartCanvas = document.getElementById('categoriesChart');
  if (chartCanvas && breakdown.length > 0) {
    renderCategoriesChart(breakdown);
  } else if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  }
}

let categoriesChartInstance = null;
let chartTooltip = null;
let chartMouseMoveHandler = null;  // Referencja do handlera mousemove (zapobiega memory leak)
let chartMouseLeaveHandler = null;  // Referencja do handlera mouseleave (zapobiega memory leak)
let chartTouchHandler = null;  // Referencja do handlera touch (mobile)
let chartTouchEndHandler = null;  // Referencja do handlera touchend (mobile)

// Helper function to adjust brightness of hex color
function adjustBrightness(hex, percent) {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
  const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
  const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));

  // Convert back to hex
  const toHex = (n) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return '#' + toHex(newR) + toHex(newG) + toHex(newB);
}

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

  // Cleanup starych event listenerów (zapobiega memory leak)
  if (chartMouseMoveHandler) {
    canvas.removeEventListener('mousemove', chartMouseMoveHandler);
    chartMouseMoveHandler = null;
  }
  if (chartMouseLeaveHandler) {
    canvas.removeEventListener('mouseleave', chartMouseLeaveHandler);
    chartMouseLeaveHandler = null;
  }
  if (chartTouchHandler) {
    canvas.removeEventListener('touchstart', chartTouchHandler);
    canvas.removeEventListener('touchmove', chartTouchHandler);
    chartTouchHandler = null;
  }
  if (chartTouchEndHandler) {
    canvas.removeEventListener('touchend', chartTouchEndHandler);
    chartTouchEndHandler = null;
  }

  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const isMobile = containerWidth < 768;

  canvas.width = containerWidth;
  canvas.height = isMobile ? 750 : 550;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Group small categories (< 2%) into "Inne" - tylko drobne wydatki
  // Zmniejszone z 5% na 2% aby "Inne" zawierało tylko naprawdę małe kategorie
  const SMALL_CATEGORY_THRESHOLD = 2;
  const mainCategories = breakdown.filter(item => item.percentage >= SMALL_CATEGORY_THRESHOLD);
  const smallCategories = breakdown.filter(item => item.percentage < SMALL_CATEGORY_THRESHOLD);

  let processedBreakdown = [...mainCategories];

  if (smallCategories.length > 0) {
    const otherAmount = smallCategories.reduce((sum, item) => sum + item.amount, 0);
    const otherPercentage = smallCategories.reduce((sum, item) => sum + item.percentage, 0);

    processedBreakdown.push({
      category: 'Inne',
      amount: otherAmount,
      percentage: otherPercentage,
      isOther: true,
      categories: smallCategories.map(c => c.category).join(', ')
    });
  }

  // Pastelowe kolory - delikatne i przyjazne dla oka
  const colors = [
    '#FFB3BA', // Pastelowy różowy
    '#BAFFC9', // Pastelowy zielony
    '#BAE1FF', // Pastelowy niebieski
    '#FFFFBA', // Pastelowy żółty
    '#FFD9BA', // Pastelowy pomarańczowy
    '#E0BBE4', // Pastelowy lawendowy
    '#FEC8D8', // Pastelowy malinowy
    '#D4F4DD', // Pastelowy miętowy
    '#FFF5BA', // Pastelowy kremowy
    '#FFCCF9', // Pastelowy fuksja
    '#C7CEEA', // Pastelowy periwinkle
    '#B5EAD7', // Pastelowy turkusowy
    '#FFE5D9', // Pastelowy brzoskwiniowy
    '#E2F0CB', // Pastelowy limonkowy
    '#FFDFD3', // Pastelowy koralowy
    '#D9F0FF'  // Pastelowy błękitny
  ];

  // Calculate pie chart dimensions
  const centerX = canvas.width / 2;
  const centerY = isMobile ? canvas.height * 0.3 : canvas.height / 2;
  const maxRadius = isMobile ?
    Math.min(canvas.width / 2 - 40, 150) :
    Math.min(canvas.width * 0.25, canvas.height * 0.35, 180);
  const radius = Math.max(30, maxRadius);

  // Draw pie slices with subtle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  let currentAngle = -Math.PI / 2; // Start at top
  const sliceData = [];

  processedBreakdown.forEach((item, index) => {
    const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;

    // Draw slice z gradientem
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
    ctx.closePath();

    // Gradient dla każdego slice
    const midAngle = currentAngle + sliceAngle / 2;
    const gradientX = centerX + Math.cos(midAngle) * radius * 0.5;
    const gradientY = centerY + Math.sin(midAngle) * radius * 0.5;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, gradientX, gradientY, radius);

    const baseColor = colors[index % colors.length];
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustBrightness(baseColor, -15));

    ctx.fillStyle = gradient;
    ctx.fill();

    // Store slice data for hover detection
    sliceData.push({
      startAngle: currentAngle,
      endAngle: endAngle,
      category: item.category,
      amount: item.amount,
      percentage: item.percentage,
      color: colors[index % colors.length],
      categories: item.categories || null
    });

    currentAngle = endAngle;
  });

  // Reset shadow for legend
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw legend - poniżej wykresu na mobile, po prawej na desktop
  const legendX = isMobile ? 20 : 50;
  const legendStartY = isMobile ? centerY + radius + 40 : 50;
  const legendY = legendStartY;
  const lineHeight = isMobile ? 32 : 36;
  const fontSize = isMobile ? 13 : 14;
  const boxSize = isMobile ? 16 : 18;

  processedBreakdown.forEach((item, index) => {
    const y = legendY + (index * lineHeight);

    // Color box z zaokrąglonymi rogami (bez ramki)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Gradient w legendzie też
    const boxGradient = ctx.createLinearGradient(legendX, y, legendX + boxSize, y + boxSize);
    const baseColor = colors[index % colors.length];
    boxGradient.addColorStop(0, baseColor);
    boxGradient.addColorStop(1, adjustBrightness(baseColor, -10));

    ctx.fillStyle = boxGradient;

    // Zaokrąglony kwadrat
    ctx.beginPath();
    const cornerRadius = 3;
    ctx.moveTo(legendX + cornerRadius, y);
    ctx.lineTo(legendX + boxSize - cornerRadius, y);
    ctx.quadraticCurveTo(legendX + boxSize, y, legendX + boxSize, y + cornerRadius);
    ctx.lineTo(legendX + boxSize, y + boxSize - cornerRadius);
    ctx.quadraticCurveTo(legendX + boxSize, y + boxSize, legendX + boxSize - cornerRadius, y + boxSize);
    ctx.lineTo(legendX + cornerRadius, y + boxSize);
    ctx.quadraticCurveTo(legendX, y + boxSize, legendX, y + boxSize - cornerRadius);
    ctx.lineTo(legendX, y + cornerRadius);
    ctx.quadraticCurveTo(legendX, y, legendX + cornerRadius, y);
    ctx.closePath();
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Category name
    ctx.fillStyle = '#1f2937';
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    const maxChars = isMobile ? 15 : 22;
    const displayText = item.category.length > maxChars
      ? item.category.substring(0, maxChars) + '...'
      : item.category;
    ctx.fillText(displayText, legendX + boxSize + 10, y + boxSize / 2 - 3);

    // Amount and percentage
    ctx.fillStyle = '#6b7280';
    ctx.font = `${fontSize - 1}px system-ui, -apple-system, sans-serif`;
    const amountText = `${item.amount.toFixed(0)} zł (${item.percentage.toFixed(1)}%)`;
    ctx.fillText(amountText, legendX + boxSize + 10, y + boxSize / 2 + 11);
  });

  // Create tooltip with modern styling
  chartTooltip = document.createElement('div');
  chartTooltip.style.cssText = `
    position: fixed;
    background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98));
    color: white;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: none;
    z-index: 10000;
    display: none;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(chartTooltip);

  // Mouse interaction - zapisz referencję do handlera (zapobiega memory leak)
  chartMouseMoveHandler = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate angle from center
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if mouse is within pie circle
    if (distance <= radius) {
      let angle = Math.atan2(dy, dx);
      // Normalize angle to match our start angle (-PI/2)
      angle = angle - (-Math.PI / 2);
      if (angle < 0) angle += 2 * Math.PI;

      // Find which slice is hovered
      let hoveredSlice = null;
      for (const slice of sliceData) {
        let startAngle = slice.startAngle - (-Math.PI / 2);
        let endAngle = slice.endAngle - (-Math.PI / 2);
        if (startAngle < 0) startAngle += 2 * Math.PI;
        if (endAngle < 0) endAngle += 2 * Math.PI;

        if (startAngle <= endAngle) {
          if (angle >= startAngle && angle <= endAngle) {
            hoveredSlice = slice;
            break;
          }
        } else {
          if (angle >= startAngle || angle <= endAngle) {
            hoveredSlice = slice;
            break;
          }
        }
      }

      if (hoveredSlice) {
        chartTooltip.style.display = 'block';
        chartTooltip.style.left = `${e.clientX + 15}px`;
        chartTooltip.style.top = `${e.clientY + 15}px`;

        let tooltipContent = `
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${hoveredSlice.color};">
            ${hoveredSlice.category}
          </div>`;

        if (hoveredSlice.category === 'Inne' && hoveredSlice.categories) {
          tooltipContent += `
            <div style="font-size: 12px; color: #ccc; margin-bottom: 6px; font-style: italic;">
              ${hoveredSlice.categories}
            </div>`;
        }

        tooltipContent += `
          <div style="display: flex; gap: 12px; margin-top: 4px;">
            <div>
              <div style="font-size: 11px; color: #999; text-transform: uppercase;">Kwota</div>
              <div style="font-size: 15px; font-weight: bold;">${hoveredSlice.amount.toFixed(2)} zł</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #999; text-transform: uppercase;">Udział</div>
              <div style="font-size: 15px; font-weight: bold;">${hoveredSlice.percentage.toFixed(1)}%</div>
            </div>
          </div>`;

        chartTooltip.innerHTML = tooltipContent;
        canvas.style.cursor = 'pointer';
      } else {
        chartTooltip.style.display = 'none';
        canvas.style.cursor = 'default';
      }
    } else {
      chartTooltip.style.display = 'none';
      canvas.style.cursor = 'default';
    }
  };

  chartMouseLeaveHandler = () => {
    chartTooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  };

  // Dodaj event listenery z zapisanymi referencjami
  canvas.addEventListener('mousemove', chartMouseMoveHandler);
  canvas.addEventListener('mouseleave', chartMouseLeaveHandler);

  // Touch handling dla urządzeń mobilnych
  chartTouchHandler = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    const dx = touchX - centerX;
    const dy = touchY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      let angle = Math.atan2(dy, dx);
      angle = angle - (-Math.PI / 2);
      if (angle < 0) angle += 2 * Math.PI;

      let hoveredSlice = null;
      for (const slice of sliceData) {
        let startAngle = slice.startAngle - (-Math.PI / 2);
        let endAngle = slice.endAngle - (-Math.PI / 2);
        if (startAngle < 0) startAngle += 2 * Math.PI;
        if (endAngle < 0) endAngle += 2 * Math.PI;

        if (startAngle <= endAngle) {
          if (angle >= startAngle && angle <= endAngle) {
            hoveredSlice = slice;
            break;
          }
        } else {
          if (angle >= startAngle || angle <= endAngle) {
            hoveredSlice = slice;
            break;
          }
        }
      }

      if (hoveredSlice) {
        chartTooltip.style.display = 'block';
        chartTooltip.style.left = `${touch.clientX + 15}px`;
        chartTooltip.style.top = `${touch.clientY - 80}px`;

        let tooltipContent = `
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${hoveredSlice.color};">
            ${hoveredSlice.category}
          </div>`;

        if (hoveredSlice.category === 'Inne' && hoveredSlice.categories) {
          tooltipContent += `
            <div style="font-size: 12px; color: #ccc; margin-bottom: 6px; font-style: italic;">
              ${hoveredSlice.categories}
            </div>`;
        }

        tooltipContent += `
          <div style="display: flex; gap: 12px; margin-top: 4px;">
            <div>
              <div style="font-size: 11px; color: #999; text-transform: uppercase;">Kwota</div>
              <div style="font-size: 15px; font-weight: bold;">${hoveredSlice.amount.toFixed(2)} zł</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #999; text-transform: uppercase;">Udział</div>
              <div style="font-size: 15px; font-weight: bold;">${hoveredSlice.percentage.toFixed(1)}%</div>
            </div>
          </div>`;

        chartTooltip.innerHTML = tooltipContent;
      } else {
        chartTooltip.style.display = 'none';
      }
    } else {
      chartTooltip.style.display = 'none';
    }
  };

  chartTouchEndHandler = () => {
    chartTooltip.style.display = 'none';
  };

  canvas.addEventListener('touchstart', chartTouchHandler, { passive: false });
  canvas.addEventListener('touchmove', chartTouchHandler, { passive: false });
  canvas.addEventListener('touchend', chartTouchEndHandler);

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

const selectPeriod = (days, targetEl) => {
  document.querySelectorAll('#analyticsPeriodSeg button').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  if (targetEl) targetEl.setAttribute('aria-pressed', 'true');

  if (days === 'custom') {
    document.getElementById('customPeriodInputs').style.display = 'block';
  } else {
    document.getElementById('customPeriodInputs').style.display = 'none';
    setAnalyticsPeriod(days);
    renderAnalytics();
  }
};

const applyCustomPeriod = () => {
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
      <button type="button" class="category-quick-btn" data-action="select-description" data-description="${escapeHTML(desc)}">
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
      <button type="button" class="category-quick-btn" data-action="select-category" data-name="${escapeHTML(cat.name)}">
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
      <button type="button" class="category-quick-btn" data-action="select-source" data-source="${escapeHTML(src)}">
        ${src}
      </button>
    `).join('');

    sourceButtons.innerHTML = html;
  }
}

const selectCategory = (categoryName) => {
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
        <div class="suggestion-item" data-action="select-description" data-description="${escapeHTML(desc.name)}">
          ${desc.name}
        </div>
      `).join('');
      descriptionSuggestions.innerHTML = html;
    }
  }
};

const selectDescription = (description) => {
  const descriptionInput = document.getElementById('expenseDescription');
  if (descriptionInput) {
    descriptionInput.value = description;
    document.getElementById('descriptionSuggestions').innerHTML = '';
  }
};

const selectSource = (source) => {
  const sourceInput = document.getElementById('incomeSource');
  if (sourceInput) {
    sourceInput.value = source;
    document.getElementById('sourceSuggestions').innerHTML = '';
    document.getElementById('sourceButtons').innerHTML = '';
  }
};

// renderExpenses, renderExpensesPagination, changeExpensePage, realiseExpense -> src/ui/renderExpenses.js + src/handlers/expenseHandlers.js

// renderSources, renderIncomesPagination, changeIncomePage, realiseIncome, editIncome, deleteIncome -> src/ui/renderIncomes.js + src/handlers/incomeHandlers.js

// addCategory, editCategory, deleteCategory, startMergeCategory, cancelMergeCategory, selectMergeTarget -> src/handlers/categoryHandlers.js

function renderSavingsSection() {
  const savingsAmount = getSavingGoal();
  const { available, totalAvailable } = calculateAvailableFunds();
  const input = document.getElementById('savingsAmountInput');
  const statusDiv = document.getElementById('savingsStatusInfo');

  if (input) {
    input.value = savingsAmount > 0 ? savingsAmount : '';
  }

  if (statusDiv) {
    if (savingsAmount > 0) {
      const percentage = totalAvailable > 0 ? ((savingsAmount / totalAvailable) * 100).toFixed(1) : 0;
      statusDiv.innerHTML = `
        <div class="stat-card beige" style="margin-top: 10px;">
          <div class="stat-label">Odlozone oszczednosci</div>
          <div class="stat-value">${savingsAmount.toFixed(2)} <span class="stat-unit">zl</span></div>
          <div style="margin-top: 8px; font-size: 0.85rem; opacity: 0.8;">
            Stanowi ${percentage}% calkowitych srodkow (${totalAvailable.toFixed(2)} zl).<br>
            Dostepne po odliczeniu: ${available.toFixed(2)} zl.
          </div>
        </div>
      `;
    } else {
      statusDiv.innerHTML = '<p style="opacity: 0.6;">Nie zdefiniowano kwoty oszczednosci.</p>';
    }
  }
}

const saveSavingsAmount = async (e) => {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (submitBtn && submitBtn.disabled) return;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Zapisywanie...';
  }

  const amount = parseFloat(form.savingsAmount.value) || 0;

  if (amount < 0) {
    showErrorMessage('Kwota oszczednosci nie moze byc ujemna');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Zapisz kwote oszczednosci'; }
    return;
  }

  try {
    await saveSavingGoal(amount);
    clearLimitsCache();
    await recalculateEnvelope();

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('SAVINGS_AMOUNT_UPDATE', {
      amount,
      budgetUser: displayName
    });

    renderSavingsGoals();
    renderSummary();
    renderDailyEnvelope();
    showSuccessMessage(`Kwota oszczednosci zapisana: ${amount.toFixed(2)} zl`);
  } catch (error) {
    console.error('Blad zapisywania kwoty oszczednosci:', error);
    showErrorMessage('Nie udalo sie zapisac kwoty oszczednosci');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Zapisz kwote oszczednosci';
    }
  }
};

// window.addExpense, editExpense, deleteExpense -> src/handlers/expenseHandlers.js

// window.addIncome, window.addCorrection -> src/handlers/incomeHandlers.js

/**
 * Odświeża listy rozwijane okresów w ustawieniach
 * Powinna być wywołana po każdej zmianie przychodów planowanych
 */
function refreshPeriodSelectors() {
  const envelopePeriod = getEnvelopePeriod();
  const dynamicsPeriod = getDynamicsPeriod();

  const envelopePeriodSelect = document.getElementById('settingsEnvelopePeriod');
  const dynamicsPeriodSelect = document.getElementById('settingsDynamicsPeriod');

  // Wypełnij dropdowny okresami
  const { periods } = calculateSpendingPeriods();

  if (envelopePeriodSelect) {
    envelopePeriodSelect.innerHTML = '';
    periods.forEach((period, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${period.name} (${period.date}) - ${period.daysLeft} dni`;
      if (index === envelopePeriod) option.selected = true;
      envelopePeriodSelect.appendChild(option);
    });
  }

  if (dynamicsPeriodSelect) {
    dynamicsPeriodSelect.innerHTML = '';
    periods.forEach((period, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${period.name} (${period.date}) - ${period.daysLeft} dni`;
      if (index === dynamicsPeriod) option.selected = true;
      dynamicsPeriodSelect.appendChild(option);
    });
  }
}

function loadSettings() {
  refreshPeriodSelectors();
}

const saveSettings = async (e) => {
  e.preventDefault();

  const form = e.target;
  const envelopePeriod = parseInt(form.envelopePeriod.value) || 0;
  const dynamicsPeriod = parseInt(form.dynamicsPeriod.value) || 0;

  try {
    await saveEnvelopePeriod(envelopePeriod);
    await saveDynamicsPeriod(dynamicsPeriod);
    await recalculateEnvelope();

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('SETTINGS_UPDATE', {
      envelopePeriod,
      dynamicsPeriod,
      budgetUser: displayName,
      note: 'Ustawienia okresu koperty i dynamiki zapisane'
    });

    showSuccessMessage('Ustawienia zapisane');
  } catch (error) {
    console.error('❌ Błąd zapisywania ustawień:', error);
    showErrorMessage('Nie udało się zapisać ustawień');
  }
};

// === SYMULACJA WYDATKU ===
function renderSimulationResult(result) {
  const container = document.getElementById('simulationResult');
  if (!container) return;

  const RISK = {
    safe:    { color: 'var(--success)', soft: 'var(--success-soft)', icon: lucideIcon('Check', { size: 20, strokeWidth: 2 }) },
    caution: { color: 'var(--accent)',  soft: 'var(--accent-soft)',  icon: lucideIcon('Info',  { size: 20, strokeWidth: 1.5 }) },
    warning: { color: 'oklch(0.62 0.17 60)', soft: 'oklch(0.95 0.06 60)', icon: lucideIcon('Info', { size: 20, strokeWidth: 1.5 }) },
    danger:  { color: 'var(--danger)',  soft: 'var(--danger-soft)',  icon: lucideIcon('X',     { size: 20, strokeWidth: 2 }) },
  };
  const risk = RISK[result.riskLevel] || RISK.caution;
  const d = result.data;

  const fmt = v => (v ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const findingsHTML = result.findings
    .map(f => `<li>${escapeHTML(f)}</li>`).join('');

  const html = `
    <div style="background:${risk.soft};border-radius:10px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:48px;height:48px;border-radius:12px;background:${risk.color};color:#fff;display:grid;place-items:center;flex-shrink:0">${risk.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${risk.color};margin-bottom:2px">Wynik analizy</div>
        <div style="font-size:22px;font-weight:600;letter-spacing:-0.01em;color:${risk.color}">${escapeHTML(result.title)}</div>
      </div>
      <div class="num" style="font-size:28px;font-weight:500;color:${risk.color};white-space:nowrap;flex-shrink:0">${fmt(d.simulationAmount ?? 0)}<span style="font-size:14px;opacity:0.6;margin-left:4px">zł</span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0">
      <div class="metric"><div class="metric-label">Środki po wydatku</div><div class="metric-value">${fmt(d.availableAfterSimulation)} <span class="text-mute text-sm">zł</span></div></div>
      <div class="metric"><div class="metric-label">Nowy limit dzienny</div><div class="metric-value">${fmt(d.dailyBudgetAfter)} <span class="text-mute text-sm">zł/d</span></div></div>
      <div class="metric"><div class="metric-label">Mediana dzienna</div><div class="metric-value">${fmt(d.medianDailySpending)} <span class="text-mute text-sm">zł/d</span></div></div>
      <div class="metric"><div class="metric-label">Dni do symulacji</div><div class="metric-value">${d.daysToSimulation ?? 0}</div></div>
    </div>
    <hr class="divider">
    <h3 style="margin:0 0 10px">Analiza krok po kroku</h3>
    <ol style="padding-left:18px;font-size:13px;color:var(--ink-2);line-height:1.7;margin:0">
      ${findingsHTML}
    </ol>
  `;

  container.innerHTML = sanitizeHTML(html);
}

const handleSimulateExpense = () => {
  const dateInput = document.getElementById('simulationDate');
  const amountInput = document.getElementById('simulationAmount');

  if (!dateInput || !amountInput) return;

  const date = dateInput.value;
  const amount = parseFloat(amountInput.value);

  if (!date) {
    showErrorMessage('Wybierz datę wydatku');
    return;
  }

  if (!amount || amount <= 0) {
    showErrorMessage('Podaj prawidłową kwotę wydatku');
    return;
  }

  const result = simulateExpense(date, amount);
  renderSimulationResult(result);
};

// Eksport danych budżetowych do analizy LLM - wrapper dla event delegation
const handleExportBudgetData = async (format = 'json') => {
  try {
    console.log(`📊 Eksport danych w formacie: ${format}`);

    const success = exportBudgetDataForLLM(format);

    if (success) {
      showSuccessMessage(`Dane wyeksportowane pomyślnie w formacie ${format.toUpperCase()}`);

      const user = getCurrentUser();
      const displayName = await getDisplayName(user.uid);

      await log('DATA_EXPORT', {
        format: format,
        budgetUser: displayName,
        note: 'Eksport danych budżetowych dla LLM'
      });
    } else {
      showErrorMessage('Wystąpił błąd podczas eksportu danych');
    }
  } catch (error) {
    console.error('❌ Błąd eksportu:', error);
    showErrorMessage('Nie udało się wyeksportować danych');
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
    
    const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);
    const startIdx = (currentLogPage - 1) * LOGS_PER_PAGE;
    const endIdx = startIdx + LOGS_PER_PAGE;
    const paginatedLogs = logs.slice(startIdx, endIdx);
    
    const html = paginatedLogs.map((logEntry, index) => {
      const formatted = formatLogEntry(logEntry);
      const logNumber = startIdx + index + 1;
      return `
        <div class="log-entry">
          <div class="log-header">
            <span class="log-number">#${logNumber}</span>
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
    
    if (totalPages > 1) {
      renderLogsPagination(totalPages);
    } else {
      const paginationContainer = logsList.nextElementSibling;
      if (paginationContainer && paginationContainer.classList.contains('pagination-container')) {
        paginationContainer.innerHTML = '';
      } else {
        const newPagination = document.createElement('div');
        newPagination.className = 'pagination-container';
        logsList.parentNode.insertBefore(newPagination, logsList.nextSibling);
      }
    }
  } catch (error) {
    console.error('❌ Błąd renderowania logów:', error);
    document.getElementById('logsList').innerHTML = '<p class="empty-state">Błąd ładowania logów</p>';
  }
}

function renderLogsPagination(totalPages) {
  const logsList = document.getElementById('logsList');
  let paginationContainer = logsList.nextElementSibling;
  
  if (!paginationContainer || !paginationContainer.classList.contains('pagination-container')) {
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    logsList.parentNode.insertBefore(paginationContainer, logsList.nextSibling);
  }

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button class="pagination-btn" ${currentLogPage === 1 ? 'disabled' : ''} data-action="change-log-page" data-page="${currentLogPage - 1}">◀</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentLogPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentLogPage ? 'active' : ''}" data-action="change-log-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentLogPage === totalPages ? 'disabled' : ''} data-action="change-log-page" data-page="${currentLogPage + 1}">▶</button>`;
  
  paginationContainer.innerHTML = html;
}

const changeLogPage = async (page) => {
  const logs = await getLogs();
  const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);
  
  if (page < 1 || page > totalPages) return;
  
  currentLogPage = page;
  await renderLogs();
  
  const logsList = document.getElementById('logsList');
  if (logsList) {
    logsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const clearLogs = async () => {
  const confirmed = await showPasswordModal(
    'Czyszczenie logów',
    'Czy na pewno chcesz wyczyścić wszystkie logi? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );

  if (!confirmed) return;

  try {
    await clearAllLogs('System');
    currentLogPage = 1;
    await renderLogs();
    showSuccessMessage('Logi wyczyszczone');
  } catch (error) {
    console.error('❌ Błąd czyszczenia logów:', error);
    showErrorMessage('Nie udało się wyczyścić logów');
  }
};

const SECTION_META = {
  summarySection: { heading: 'Podsumowanie', crumb: 'Budżet' },
  envelopeSection: { heading: 'Koperta dnia', crumb: 'Budżet' },
  expensesSection: { heading: 'Wydatki', crumb: 'Budżet' },
  sourcesSection: { heading: 'Przychody', crumb: 'Budżet' },
  categoriesSection: { heading: 'Kategorie', crumb: 'Narzędzia' },
  simulationSection: { heading: 'Symulacja wydatku', crumb: 'Narzędzia' },
  analyticsSection: { heading: 'Analityka', crumb: 'Narzędzia' },
  savingsGoalsSection: { heading: 'Oszczędności', crumb: 'Narzędzia' },
  settingsSection: { heading: 'Ustawienia', crumb: 'System' },
};

const showSection = (sectionId) => {
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

  const activeBtn = document.querySelector(`[data-action="show-section"][data-section="${sectionId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  setActiveNavItem(sectionId);
  setMobileDrawer(false);

  // Update topbar
  const meta = SECTION_META[sectionId] || {};
  const headingEl = document.getElementById('topbarHeading');
  const crumbEl = document.getElementById('topbarCrumb');
  if (headingEl) headingEl.textContent = meta.heading || '';
  if (crumbEl) crumbEl.textContent = meta.crumb || '';

  if (window.innerWidth <= 768) {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.querySelector('.nav-hamburger');
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      if (hamburger) hamburger.classList.remove('active');
    }
  }

  if (sectionId === 'settingsSection') {
    currentLogPage = 1;
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

const openProfile = () => {
  showProfileModal();
};

const handleLogin = async (e) => {
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

const handleRegister = async (e) => {
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

const handleLogout = async () => {
  const confirmed = await showConfirmModal(
    'Wylogowanie',
    'Czy na pewno chcesz się wylogować?',
    { type: 'info', confirmText: 'Wyloguj', cancelText: 'Anuluj' }
  );

  if (!confirmed) return;

  try {
    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    // Zatrzymaj sprawdzanie północy
    if (midnightCheckInterval) {
      clearInterval(midnightCheckInterval);
      midnightCheckInterval = null;
      console.log('🌙 Zatrzymano sprawdzanie północy');
    }

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

    // Fill sidebar email
    const sidebarEmail = document.getElementById('sidebarUserEmail');
    if (sidebarEmail) sidebarEmail.textContent = user.email || '';

    if (appVersionSpan) {
      appVersionSpan.textContent = `v${APP_VERSION}`;
    }

    // Sidebar version
    const appVersion2Span = document.getElementById('appVersion2');
    if (appVersion2Span) appVersion2Span.textContent = `v${APP_VERSION}`;

    // Settings profile email
    const profileEmailInput = document.getElementById('profileEmail');
    if (profileEmailInput) profileEmailInput.value = user.email || '';

    console.log('🧹 Czyszczenie Firebase cache');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('firebase:host:krezus-e3070-default-rtdb.firebaseio.com')) {
        localStorage.removeItem(key);
      }
    });

    console.log('📥 Rozpoczęcie ładowania danych...');
    await loadAllData();
    hideLoader();

    // Inicjalizuj śledzenie obecności
    initializePresence();

    // Wyświetl wersję aplikacji w nagłówku
    initVersion();

    // Oznacz otwarcie strony jako aktywność
    recordActivity();

  } else {
    console.log('❌ Użytkownik wylogowany');

    // Wyczyść obecność przy wylogowaniu
    cleanupPresence();

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
  initNavIcons();
  initMobileDrawer();

  const today = getWarsawDateString();
  const expenseDateInput = document.getElementById('expenseDate');
  const incomeDateInput = document.getElementById('incomeDate');
  const simulationDateInput = document.getElementById('simulationDate');

  // Śledź aktywność użytkownika
  const activityEvents = ['click', 'keydown', 'scroll', 'touchstart'];
  activityEvents.forEach(eventType => {
    document.addEventListener(eventType, () => {
      recordActivity();
    }, { passive: true });
  });

  if (expenseDateInput) expenseDateInput.value = today;
  if (incomeDateInput) incomeDateInput.value = today;
  if (simulationDateInput) simulationDateInput.value = today;

  // Funkcja do przełączania zakładek autoryzacji
  const showAuthTab = (tabName) => {
    const allTabs = ['loginTab', 'registerTab', 'forgotTab', 'forgotSentTab'];
    allTabs.forEach(id => document.getElementById(id)?.classList.remove('active'));

    const target = document.getElementById(tabName === 'login' ? 'loginTab'
      : tabName === 'register' ? 'registerTab'
      : tabName === 'forgot' ? 'forgotTab'
      : tabName === 'forgot-sent' ? 'forgotSentTab'
      : 'loginTab');
    target?.classList.add('active');

    // Aktualizuj przyciski (tylko login/register mają przyciski w nav)
    document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
  };

  // Dependency injection dla wydzielonych modułów
  setExpenseDeps({ getBudgetUserName });
  setIncomeDeps({ getBudgetUserName });
  setCategoryHandlerDeps({ renderCategories, renderExpenses });
  setExpenseHandlerDeps({
    getBudgetUserName,
    getBudgetUsersCache: () => budgetUsersCache,
    renderAfterChange: (type) => {
      renderExpenses();
      renderCategories();
      renderSummary();
      renderDailyEnvelope();
    },
    setupExpenseTypeToggle
  });
  setIncomeHandlerDeps({
    getBudgetUserName,
    getBudgetUsersCache: () => budgetUsersCache,
    renderAfterChange: (type) => {
      renderSources();
      renderSummary();
      renderDailyEnvelope();
    },
    refreshPeriodSelectors,
    setupIncomeTypeToggle
  });

  // Inicjalizuj event delegation dla bezpiecznej obsługi kliknięć
  initClickDelegation({
    // Kategorie
    'cancel-merge-category': () => cancelMergeCategory(),
    'start-merge-category': (el) => startMergeCategory(getDataAttributes(el).id),
    'edit-category': (el) => {
      const data = getDataAttributes(el);
      editCategory(data.id, data.name);
    },
    'delete-category': (el) => {
      const data = getDataAttributes(el);
      deleteCategory(data.id, data.name);
    },
    'select-merge-target': (el) => selectMergeTarget(getDataAttributes(el).id),
    'change-category-page': (el) => changeCategoryPage(parseInt(getDataAttributes(el).page, 10)),

    // Wydatki - quick buttons i suggestions
    'select-description': (el) => selectDescription(getDataAttributes(el).description),
    'select-category': (el) => selectCategory(getDataAttributes(el).name),

    // Wydatki - akcje
    'realise-expense': (el) => realiseExpense(getDataAttributes(el).id),
    'edit-expense': (el) => editExpense(getDataAttributes(el).id),
    'delete-expense': (el) => deleteExpense(getDataAttributes(el).id),
    'change-expense-page': (el) => changeExpensePage(parseInt(getDataAttributes(el).page, 10)),

    // Przychody - quick buttons
    'select-source': (el) => selectSource(getDataAttributes(el).source),

    // Przychody - akcje
    'realise-income': (el) => realiseIncome(getDataAttributes(el).id),
    'edit-income': (el) => editIncome(getDataAttributes(el).id),
    'delete-income': (el) => deleteIncome(getDataAttributes(el).id),
    'change-income-page': (el) => changeIncomePage(parseInt(getDataAttributes(el).page, 10)),

    // Logi
    'change-log-page': (el) => changeLogPage(parseInt(getDataAttributes(el).page, 10)),
    'clear-logs': () => clearLogs(),

    // Autoryzacja
    'show-auth-tab': (el) => showAuthTab(el.dataset.tab),

    // Nawigacja
    'show-section': (el) => showSection(el.dataset.section),
    'open-profile': () => openProfile(),
    'handle-logout': () => handleLogout(),
    'open-mobile-menu': () => setMobileDrawer(true),

    // Kategorie - dodawanie
    'add-category': () => addCategory(),

    // Analityka
    'select-period': (el) => {
      const period = el.dataset.period;
      // Konwertuj na number jeśli to liczba
      const parsedPeriod = period === 'all' || period === 'custom' ? period : parseInt(period, 10);
      selectPeriod(parsedPeriod, el);
    },
    'apply-custom-period': () => applyCustomPeriod(),

    // Eksport danych
    'export-budget-data': (el) => handleExportBudgetData(el.dataset.format),

    // Symulacja wydatku
    'simulate-expense': () => handleSimulateExpense(),

    // Modale dodawania
    'open-add-expense-modal': () => {
      openModal('addExpenseModal');
      setupCategorySuggestions();
      setupExpenseTypeToggle();
    },
    'open-add-income-modal': () => {
      openModal('addIncomeModal');
      setupIncomeTypeToggle();
      setupSourceSuggestions();
    },
    'open-correction-modal': () => openModal('correctionModal'),
    'open-change-password': () => showProfileModal(),

    // Zapis profilu w ustawieniach
    'save-profile-name': async () => {
      const input = document.getElementById('profileDisplayName');
      const name = input?.value?.trim();
      if (!name || name.length < 2) {
        showErrorMessage('Nazwa musi mieć minimum 2 znaki');
        return;
      }
      try {
        const user = getCurrentUser();
        await updateDisplayName(user.uid, name);
        showSuccessMessage('Profil zaktualizowany');
      } catch (e) {
        showErrorMessage('Nie udało się zaktualizować profilu');
      }
    },

    // Filtry wydatków
    'filter-expenses': (el) => {
      const filter = el.dataset.filter;
      document.querySelectorAll('#expenseFilterSeg button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      document.querySelectorAll('#expensesTableBody tr').forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'normal') {
          row.style.display = row.classList.contains('realised') ? '' : 'none';
        } else {
          row.style.display = row.classList.contains('planned') ? '' : 'none';
        }
      });
    },

    // Filtry przychodów
    'filter-incomes': (el) => {
      const filter = el.dataset.filter;
      document.querySelectorAll('#incomeFilterSeg button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      document.querySelectorAll('#sourcesTableBody tr').forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'normal') {
          row.style.display = (row.classList.contains('realised') || row.classList.contains('correction')) ? '' : 'none';
        } else {
          row.style.display = row.classList.contains('planned') ? '' : 'none';
        }
      });
    }
  });

  // Wyszukiwanie wydatków
  const expenseSearchEl = document.getElementById('expenseSearch');
  if (expenseSearchEl) {
    expenseSearchEl.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('#expensesTableBody tr').forEach(row => {
        row.style.display = val === '' || row.textContent.toLowerCase().includes(val) ? '' : 'none';
      });
    });
  }
  const incomeSearchEl = document.getElementById('incomeSearch');
  if (incomeSearchEl) {
    incomeSearchEl.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('#sourcesTableBody tr').forEach(row => {
        row.style.display = val === '' || row.textContent.toLowerCase().includes(val) ? '' : 'none';
      });
    });
  }
  document.addEventListener('expense-search', (e) => {
    const val = e.detail.toLowerCase();
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
      row.style.display = val === '' || row.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  });

  // Podpięcie formularzy (zamiast inline onsubmit)
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('forgotForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.forgotEmail.value.trim();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Wysyłanie...'; }
    try {
      await sendPasswordReset(email);
      showAuthTab('forgot-sent');
      e.target.reset();
    } catch (err) {
      showErrorMessage('Nie udało się wysłać linku resetującego');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Wyślij link resetujący →'; }
    }
  });
  document.getElementById('expenseForm')?.addEventListener('submit', addExpense);
  document.getElementById('incomeForm')?.addEventListener('submit', addIncome);
  document.getElementById('correctionForm')?.addEventListener('submit', addCorrection);
  document.getElementById('savingsAmountForm')?.addEventListener('submit', saveSavingsAmount);
  document.getElementById('settingsForm')?.addEventListener('submit', saveSettings);
});

// Oznacz aktywność przy zamknięciu strony
window.addEventListener('beforeunload', () => {
  recordActivity();
});