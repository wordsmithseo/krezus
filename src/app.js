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
  calculatePlannedTransactionsTotals,
  getWeekDateRange,
  getMonthName,
  clearLimitsCache
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

// Import funkcji renderowania UI
import { renderSummary } from './ui/renderSummary.js';
import { renderDailyEnvelope } from './ui/renderDailyEnvelope.js';

let currentExpensePage = 1;
let currentIncomePage = 1;
let currentLogPage = 1;
let editingExpenseId = null;
let editingIncomeId = null;
let budgetUsersCache = [];
let budgetUsersUnsubscribe = null;
let isLoadingData = false;

const APP_VERSION = '1.9.8';
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

    // Uruchom sprawdzanie nowego dnia
    startMidnightChecker();

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

// renderSummary, renderSpendingDynamics i renderDailyEnvelope są teraz importowane z src/ui/

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

  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const isMobile = containerWidth < 768;

  canvas.width = containerWidth;
  canvas.height = isMobile ? 600 : 550;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Group small categories (< 5%) into "Inne"
  const SMALL_CATEGORY_THRESHOLD = 5;
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

  // Calculate pie chart dimensions - wyśrodkowany wykres
  const centerX = isMobile ? canvas.width / 2 : canvas.width / 2;
  const centerY = isMobile ? canvas.height * 0.35 : canvas.height / 2;
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

  // Mouse interaction
  canvas.addEventListener('mousemove', (e) => {
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
         ${!isCorrection && inc.type === 'planned' ? `
           <button class="btn-icon" onclick="window.realiseIncome('${inc.id}')" title="Zrealizuj teraz">✅</button>
           <button class="btn-icon" onclick="window.editIncome('${inc.id}')" title="Edytuj">✏️</button>
           <button class="btn-icon" onclick="window.deleteIncome('${inc.id}')" title="Usuń">🗑️</button>
         ` : '<span class="no-actions">-</span>'}
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

window.editIncome = (incomeId) => {
  const income = getIncomes().find(i => i.id === incomeId);
  if (!income) return;
  
  showEditIncomeModal(income, budgetUsersCache, async (updatedIncome) => {
    const incomes = getIncomes();
    const updated = incomes.map(i => i.id === incomeId ? updatedIncome : i);
    
    try {
      await saveIncomes(updated);
      
      if (updatedIncome.type === 'normal' && updatedIncome.date <= getWarsawDateString()) {
        await updateDailyEnvelope();
      }
      
      const budgetUserName = getBudgetUserName(updatedIncome.userId);
      
      await log('INCOME_EDIT', {
        amount: updatedIncome.amount,
        source: updatedIncome.source,
        type: updatedIncome.type,
        budgetUser: budgetUserName
      });
      
      showSuccessMessage('Przychód zaktualizowany');
    } catch (error) {
      console.error('❌ Błąd aktualizacji przychodu:', error);
      showErrorMessage('Nie udało się zaktualizować przychodu');
    }
  });
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
    const confirmed = await showConfirmModal(
      'Usuwanie kategorii',
      'Czy na pewno chcesz usunąć tę kategorię?',
      { type: 'warning', confirmText: 'Usuń', cancelText: 'Anuluj' }
    );
    if (!confirmed) return;
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
  
  showEditExpenseModal(expense, budgetUsersCache, async (updatedExpense) => {
    const expenses = getExpenses();
    const updated = expenses.map(e => e.id === expenseId ? updatedExpense : e);
    
    try {
      await saveExpenses(updated);
      
      if (updatedExpense.type === 'normal' && updatedExpense.date === getWarsawDateString()) {
        await updateDailyEnvelope();
      }
      
      const budgetUserName = getBudgetUserName(updatedExpense.userId);
      
      await log('EXPENSE_EDIT', {
        amount: updatedExpense.amount,
        category: updatedExpense.category,
        description: updatedExpense.description,
        type: updatedExpense.type,
        budgetUser: budgetUserName
      });
      
      showSuccessMessage('Wydatek zaktualizowany');
    } catch (error) {
      console.error('❌ Błąd aktualizacji wydatku:', error);
      showErrorMessage('Nie udało się zaktualizować wydatku');
    }
  });
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
    userId: 'system',
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
    
    await log('CORRECTION_ADD', {
      difference: difference,
      correctionType: correctionType,
      previousAmount: available,
      newAmount: newTotalAmount,
      reason: reason,
      budgetUser: 'System'
    });
    
    form.reset();
    showSuccessMessage(`Korekta wprowadzona: ${correctionType} ${Math.abs(difference).toFixed(2)} zł`);
  } catch (error) {
    console.error('❌ Błąd wprowadzania korekty:', error);
    showErrorMessage('Nie udało się wprowadzić korekty');
  }
};

function loadSettings() {
  const savingGoal = getSavingGoal();
  const envelopePeriod = getEnvelopePeriod();
  const dynamicsPeriod = getDynamicsPeriod();

  const savingGoalInput = document.getElementById('settingsSavingGoal');
  const envelopePeriodSelect = document.getElementById('settingsEnvelopePeriod');
  const dynamicsPeriodSelect = document.getElementById('settingsDynamicsPeriod');

  // ZMIANA: Daty są teraz automatyczne (z planowanych przychodów), więc nie ładujemy ich z ustawień
  if (savingGoalInput) savingGoalInput.value = savingGoal || 0;

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

window.saveSettings = async (e) => {
  e.preventDefault();

  const form = e.target;
  const savingGoal = parseFloat(form.savingGoal.value) || 0;
  const envelopePeriod = parseInt(form.envelopePeriod.value) || 0;
  const dynamicsPeriod = parseInt(form.dynamicsPeriod.value) || 0;

  try {
    // ZMIANA: Daty są teraz automatyczne (z planowanych przychodów), więc nie zapisujemy ich
    await saveSavingGoal(savingGoal);
    await saveEnvelopePeriod(envelopePeriod);
    await saveDynamicsPeriod(dynamicsPeriod);
    await updateDailyEnvelope();

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('SETTINGS_UPDATE', {
      savingGoal,
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

// Eksport danych budżetowych do analizy LLM
window.exportBudgetDataForLLM = async (format = 'json') => {
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
  html += `<button class="pagination-btn" ${currentLogPage === 1 ? 'disabled' : ''} onclick="window.changeLogPage(${currentLogPage - 1})">◀</button>`;
  
  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentLogPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentLogPage ? 'active' : ''}" onclick="window.changeLogPage(${i})">${i}</button>`;
  }
  
  html += `<button class="pagination-btn" ${currentLogPage === totalPages ? 'disabled' : ''} onclick="window.changeLogPage(${currentLogPage + 1})">▶</button>`;
  
  paginationContainer.innerHTML = html;
}

window.changeLogPage = async (page) => {
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

window.clearLogs = async () => {
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
  
  if (window.innerWidth <= 768) {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.querySelector('.nav-hamburger');
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
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