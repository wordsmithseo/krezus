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
  getDailyEnvelope,
  saveCategories,
  saveExpenses,
  saveIncomes,
  saveEndDates,
  autoRealiseDueTransactions,
  subscribeToRealtimeUpdates,
  clearAllListeners,
  clearCache,
  loadIncomes,
  loadExpenses,
  getGoals,
  deleteGoal,
  deleteHistoryEntry,
  migrateLegacySavings,
  getForceRecalcDate,
  setForceRecalcDate

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
  setBudgetUsersCache
} from './modules/analytics.js';

import {
  showProfileModal,
  showPasswordModal,
  showAddCategoryModal,
  showEditCategoryModal,
  showEditExpenseModal,
  showEditIncomeModal,
  showExpenseDetailsModal,
  showIncomeDetailsModal
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
import { initTheme, initThemeSelector } from './utils/theme.js';

import { log } from './modules/logger.js';

import { exportBudgetDataForLLM, setLLMExportDeps } from './utils/llmExport.js';

import { sanitizeHTML, escapeHTML } from './utils/sanitizer.js';
import { showConfirmModal } from './components/confirmModal.js';
import { initClickDelegation, getDataAttributes } from './handlers/clickDelegation.js';

// Import funkcji renderowania UI
import { renderSummary, setSummaryDeps, getLimitModalData } from './ui/renderSummary.js';
import { showLimitDetailModal } from './components/limitModal.js';
import { renderDailyEnvelope, toggleGaugeMode } from './ui/renderDailyEnvelope.js';
import { renderExpenses, changeExpensePage, setExpenseDeps, setExpenseFilter, setExpenseSearch, setExpenseAdvancedDeps, toggleExpenseFilterPanel, applyExpenseFilters, resetExpenseFilters } from './ui/renderExpenses.js';
import { renderSources, changeIncomePage, setIncomeDeps, setIncomeFilter, setIncomeSearch, setIncomeAdvancedDeps, toggleIncomeFilterPanel, applyIncomeFilters, resetIncomeFilters } from './ui/renderIncomes.js';
import { renderCategories, changeCategoryPage } from './ui/renderCategories.js';
import { renderAnalytics, selectPeriod, applyCustomPeriod, refreshCategoriesChart } from './ui/renderAnalytics.js';
import { renderLogs, changeLogPage, clearLogs, resetAndRenderLogs } from './ui/renderLogs.js';
import { renderSavingsSection, setSavingsDeps } from './ui/renderSavings.js';
import { showSavingsGoalModal, showGoalDepositModal } from './components/savingsGoalModal.js';
import { initNavIcons, setActiveNavItem, initMobileDrawer, setMobileDrawer } from './ui/initSidebar.js';
import { icon as lucideIcon } from './utils/icons.js';
import { barChartHTML, dailyChartHTML } from './ui/charts.js';
// Import handlerów
import { addExpense, editExpense, deleteExpense, realiseExpense, setExpenseHandlerDeps } from './handlers/expenseHandlers.js';
import { addIncome, editIncome, deleteIncome, realiseIncome, addCorrection, setIncomeHandlerDeps } from './handlers/incomeHandlers.js';
import { addCategory, editCategory, deleteCategory, startMergeCategory, cancelMergeCategory, selectMergeTarget, setCategoryHandlerDeps } from './handlers/categoryHandlers.js';

// Import modułu obecności użytkowników
import { initializePresence, cleanupPresence, recordActivity, setPresenceBudgetUsers } from './modules/presence.js';

// Import automatycznej wersji aplikacji
import { initVersion, checkForUpdate, startVersionPolling } from './utils/version.js';
import { Fmt } from './utils/fmt.js';
import { setInitialLoadDone } from './utils/animateNumber.js';

let budgetUsersCache = [];
let budgetUsersUnsubscribe = null;
let isLoadingData = false;


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
        await updateDailyEnvelope(null, false, 'midnight');
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
    loader.style.pointerEvents = 'none';
    setTimeout(() => {
      loader.style.display = 'none';
      document.body.classList.remove('app-loading');
      setInitialLoadDone();
    }, 450);
  }
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function setCorrectionModeUI(mode) {
  const label = document.getElementById('correctionAmountLabel');
  const input = document.getElementById('correctionAmountInput');
  const hint  = document.getElementById('correctionAmountHint');
  const info  = document.getElementById('correctionModeInfo');
  const btns  = document.querySelectorAll('[data-action="set-correction-mode"]');

  btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  if (mode === 'delta') {
    if (label) label.textContent = 'Kwota korekty (zł)';
    if (input) { input.placeholder = 'np. −200,00 lub +500,00'; input.min = ''; }
    if (hint)  hint.innerHTML = 'Podaj kwotę zmiany — <strong>dodatnia zwiększa</strong> środki, <strong>ujemna zmniejsza</strong>.';
    if (info)  info.textContent = 'Korekta kwotowa — wpisz wprost o ile zmienić środki, bez konieczności podawania nowego salda.';
  } else {
    if (label) label.textContent = 'Nowa kwota całkowitych środków (zł)';
    if (input) { input.placeholder = '0,00'; input.min = '0'; }
    if (hint)  hint.innerHTML = 'Wprowadź kwotę, którą <strong>chcesz mieć po korekcie</strong>. System wyliczy różnicę i zapisze ją jako korektę w historii.';
    if (info)  info.textContent = 'Korekta to różnica między obecnymi a deklarowanymi środkami. Wpisuje się jako pojedynczy wpis do historii przychodów (dodatnia lub ujemna), nie powiązana z konkretną transakcją.';
  }
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
  const today = getWarsawDateString();
  const now = today.slice(0, 7); // YYYY-MM

  const [yr, mo] = now.split('-').map(Number);
  const prevDate = new Date(yr, mo - 2, 1);
  const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const expNow  = expenses.filter(e => e.type === 'normal' && e.date?.startsWith(now));
  const expPrev = expenses.filter(e => e.type === 'normal' && e.date?.startsWith(prev));
  const expPlanned = expenses.filter(e => e.type === 'planned');
  const expToday = expenses.filter(e => e.type === 'normal' && e.date === today);

  const incNow  = incomes.filter(i => i.type === 'normal' && i.date?.startsWith(now));
  const incPrev = incomes.filter(i => i.type === 'normal' && i.date?.startsWith(prev));
  const incPlanned = incomes.filter(i => i.type === 'planned');

  const sum = arr => arr.reduce((s, x) => s + (x.amount || 0), 0);

  const expMonthTotal   = sum(expNow);
  const expPrevTotal    = sum(expPrev);
  const expAvg          = expNow.length > 0 ? expMonthTotal / expNow.length : 0;
  const expPlannedTotal = sum(expPlanned);
  const expTodayTotal   = sum(expToday);

  const incMonthTotal   = sum(incNow);
  const incPrevTotal    = sum(incPrev);
  const incAvg          = incNow.length > 0 ? incMonthTotal / incNow.length : 0;
  const incPlannedTotal = sum(incPlanned);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('expensesMonthTotal',  Fmt.zl(expMonthTotal));
  set('expensesTodayTotal',  Fmt.zl(expTodayTotal));
  set('expensesAvg',         Fmt.zl(expAvg));
  set('expensesPlannedTotal', Fmt.zl(expPlannedTotal));
  set('expensesPlannedCount', `${expPlanned.length} transakcji`);

  set('incomesMonthTotal',   Fmt.zl(incMonthTotal));
  set('incomesAvg',          Fmt.zl(incAvg));
  set('incomesPlannedTotal', Fmt.zl(incPlannedTotal));
  set('incomesPlannedCount', `${incPlanned.length} transakcji`);

  const deltaHtml = (current, previous, upGood) => {
    if (previous === 0) return '';
    const pct = ((current - previous) / previous) * 100;
    const isUp = pct > 0;
    const color = (isUp === upGood) ? 'var(--success)' : 'var(--danger)';
    const arrow = isUp ? '↑' : '↓';
    const sign  = isUp ? '+' : '';
    return `<span style="color:${color}">${arrow} ${sign}${pct.toFixed(1).replace('.', ',')}% vs poprzedni miesiąc</span>`;
  };

  const setDelta = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  setDelta('expensesMonthDelta', deltaHtml(expMonthTotal, expPrevTotal, false));
  setDelta('incomesMonthDelta',  deltaHtml(incMonthTotal, incPrevTotal, true));
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

    await clearCache();
    await fetchAllData(userId);
    await migrateLegacySavings();

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
        await updateDailyEnvelope(); // Aktualizuje tylko spent, nie zmienia limitu
        renderExpenses();
        renderCategories();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
        updateSectionStats();
      },
      onIncomesChange: async () => {
        clearLimitsCache();
        renderSources();
        renderSummary();
        renderDailyEnvelope();
        renderAnalytics();
        updateSectionStats();
      },
      onEndDatesChange: async () => {
        clearLimitsCache();
        renderSummary();
        renderDailyEnvelope();
      },
      onSavingGoalChange: async () => {
        clearLimitsCache();
        renderSummary();
        renderDailyEnvelope();
        renderSavingsSection();
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
    updateBudgetUserToggles();
    setBudgetUsersCache(users);
    setPresenceBudgetUsers(users, uid);
  });
}

function updateBudgetUserToggles() {
  const expenseToggle = document.getElementById('expenseUserToggle');
  const expenseHidden = document.getElementById('expenseUserId');
  const incomeToggle = document.getElementById('incomeUserToggle');
  const incomeHidden = document.getElementById('incomeUserId');
  const quickToggle  = document.getElementById('quickExpenseUserToggle');
  const quickHidden  = document.getElementById('quickExpenseUserId');

  if (!expenseToggle || !incomeToggle) return;

  const renderToggle = (container, hiddenInput) => {
    const currentValue = hiddenInput.value;
    container.innerHTML = budgetUsersCache.map((user, i) => {
      const isActive = currentValue ? user.id === currentValue : i === 0;
      const activeStyle = isActive
        ? 'border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)'
        : '';
      return `<button type="button" class="btn sm" style="flex:1;${activeStyle}" data-user-id="${user.id}">${user.name}</button>`;
    }).join('');

    if (!currentValue && budgetUsersCache.length > 0) {
      hiddenInput.value = budgetUsersCache[0].id;
    }

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('button').forEach(b => {
          b.style.borderColor = '';
          b.style.color = '';
          b.style.background = '';
        });
        btn.style.borderColor = 'var(--accent)';
        btn.style.color = 'var(--accent)';
        btn.style.background = 'color-mix(in srgb,var(--accent) 8%,transparent)';
        hiddenInput.value = btn.dataset.userId;
      });
    });
  };

  renderToggle(expenseToggle, expenseHidden);
  renderToggle(incomeToggle, incomeHidden);
  if (quickToggle && quickHidden) renderToggle(quickToggle, quickHidden);
}

window.resetExpenseForm = function() {
  const form = document.getElementById('expenseForm');
  if (!form) return;
  form.reset();
  document.getElementById('expenseType')?.dispatchEvent(new Event('change'));
  updateBudgetUserToggles();
  const s = document.getElementById('descriptionSuggestions');
  if (s) s.innerHTML = '';
};

window.resetIncomeForm = function() {
  const form = document.getElementById('incomeForm');
  if (!form) return;
  form.reset();
  document.getElementById('incomeType')?.dispatchEvent(new Event('change'));
  updateBudgetUserToggles();
  const s = document.getElementById('sourceSuggestions');
  if (s) s.innerHTML = '';
};

function getBudgetUserName(userId) {
  if (userId === 'system') return 'System';
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
  renderSavingsSection();
  updateSectionStats();
  await renderLogs();
  loadSettings();
  setupCategorySuggestions();
  setupSourceSuggestions();
  setupExpenseTypeToggle();
  setupIncomeTypeToggle();
  updateNavBadges();
  populateSimulationCategorySelect();
}

function populateSimulationCategorySelect() {
  const sel = document.getElementById('simulationCategory');
  if (!sel) return;
  const categories = getCategories();
  const current = sel.value;
  sel.innerHTML = '<option value="">Bez kategorii</option>' +
    categories.map(c => `<option value="${c.name}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>`).join('');
  if (current) sel.value = current;
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
      envelopeBadge.textContent = Fmt.zl(remaining) + ' zł';
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

  // Badge oszczędności: suma celów
  const savingsBadge = document.getElementById('navBadgeSavings');
  if (savingsBadge) {
    const totalSaved = getGoals().reduce((s, g) => s + g.current, 0);
    savingsBadge.textContent = totalSaved > 0 ? Fmt.zl(totalSaved) + ' zł' : '';
  }

  // Topbar chip koperty (mobile)
  updateTopbarEnvelopeChip();
}

function updateTopbarEnvelopeChip() {
  const chip = document.getElementById('topbarEnvelopeChip');
  const amountEl = document.getElementById('topbarEnvelopeAmount');
  if (!chip || !amountEl) return;
  try {
    const { remaining, total, spent } = calculateSpendingGauge();
    amountEl.textContent = Fmt.zl(remaining) + ' zł';
    const pct = total > 0 ? spent / total : 0;
    chip.dataset.status = pct > 0.85 ? 'danger' : pct > 0.6 ? 'warning' : 'ok';
    chip.style.display = '';
  } catch { /* brak danych koperty */ }
}

// renderSummary, renderSpendingDynamics, renderDailyEnvelope, renderAnalytics są importowane z src/ui/


function setupExpenseTypeToggle() {
  const expenseTypeSelect = document.getElementById('expenseType');
  const expenseDateField = document.getElementById('expenseDateField');
  const expenseTimeField = document.getElementById('expenseTimeField');

  if (!expenseTypeSelect || !expenseDateField || !expenseTimeField) return;

  const toggleDateTimeFields = () => {
    const isPlanned = expenseTypeSelect.value === 'planned';
    expenseDateField.style.display = isPlanned ? '' : 'none';
    expenseTimeField.style.display = isPlanned ? '' : 'none';
  };

  expenseTypeSelect.removeEventListener('change', toggleDateTimeFields);
  expenseTypeSelect.addEventListener('change', toggleDateTimeFields);
  toggleDateTimeFields();
}

function setupIncomeTypeToggle() {
  const incomeTypeSelect = document.getElementById('incomeType');
  const incomeDateField = document.getElementById('incomeDateField');
  const incomeTimeField = document.getElementById('incomeTimeField');

  if (!incomeTypeSelect || !incomeDateField || !incomeTimeField) return;

  const toggleDateTimeFields = () => {
    const isPlanned = incomeTypeSelect.value === 'planned';
    incomeDateField.style.display = isPlanned ? '' : 'none';
    incomeTimeField.style.display = isPlanned ? '' : 'none';
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

      if (value === '') {
        descriptionSuggestions.innerHTML = '';
        if (category) {
          updateDescriptionButtons(category);
        } else {
          descriptionButtons.innerHTML = '';
        }
        return;
      }

      const expenses = getExpenses();
      const relevantExpenses = category
        ? expenses.filter(e => e.category === category)
        : expenses;

      const descMap = new Map();
      relevantExpenses.forEach(e => {
        if (!e.description) return;
        if (!e.description.toLowerCase().includes(value)) return;
        if (!descMap.has(e.description)) {
          descMap.set(e.description, { catCounts: new Map(), total: 0 });
        }
        const entry = descMap.get(e.description);
        entry.total++;
        const cat = e.category || '';
        entry.catCounts.set(cat, (entry.catCounts.get(cat) || 0) + 1);
      });

      if (descMap.size === 0) {
        descriptionSuggestions.innerHTML = '';
        descriptionButtons.innerHTML = '';
        return;
      }

      const results = Array.from(descMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6)
        .map(([desc, { catCounts }]) => {
          let topCat = '';
          let topCount = 0;
          catCounts.forEach((count, cat) => {
            if (count > topCount) { topCount = count; topCat = cat; }
          });
          return { desc, topCat };
        });

      descriptionSuggestions.innerHTML = results.map(r => `
        <div class="suggestion-item" data-action="select-description-with-category"
             data-description="${escapeHTML(r.desc)}"
             data-category="${escapeHTML(r.topCat)}">
          <span class="suggestion-desc-text">${escapeHTML(r.desc)}</span>
          ${r.topCat && !category ? `<span class="suggestion-category-badge">${escapeHTML(r.topCat)}</span>` : ''}
        </div>
      `).join('');
      descriptionButtons.innerHTML = '';
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

const selectDescriptionWithCategory = (description, suggestedCategory) => {
  const descriptionInput = document.getElementById('expenseDescription');
  if (descriptionInput) descriptionInput.value = description;

  const descriptionSuggestions = document.getElementById('descriptionSuggestions');
  if (descriptionSuggestions) descriptionSuggestions.innerHTML = '';

  if (!suggestedCategory) return;

  const categoryInput = document.getElementById('expenseCategory');
  if (!categoryInput || categoryInput.value.trim()) return;

  categoryInput.value = suggestedCategory;

  const descriptionButtons = document.getElementById('descriptionButtons');
  if (descriptionButtons) {
    const topDescriptions = getTopDescriptionsForCategory(suggestedCategory, 5);
    descriptionButtons.innerHTML = topDescriptions.map(d => `
      <button type="button" class="category-quick-btn" data-action="select-description" data-description="${escapeHTML(d.name)}">
        ${escapeHTML(d.name)}
      </button>
    `).join('');
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


// window.addExpense, editExpense, deleteExpense -> src/handlers/expenseHandlers.js

// window.addIncome, window.addCorrection -> src/handlers/incomeHandlers.js

function loadSettings() {}

const saveSettings = async (e) => {
  e.preventDefault();

  try {
    renderSummary();

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('SETTINGS_UPDATE', {
      budgetUser: displayName,
      note: 'Ustawienia zapisane'
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

  const fmt = v => Fmt.zl(v);

  const findingsHTML = result.findings
    .map(({ text, type }) => {
      const color = type === 'good' ? 'var(--success)' : type === 'bad' ? 'var(--danger)' : 'var(--ink-2)';
      return `<li style="color:${color}">${escapeHTML(text)}</li>`;
    }).join('');

  const vc = v => v >= 0 ? 'var(--success)' : 'var(--danger)';
  const afSim = d.availableAfterSimulation ?? 0;
  const afterPlanned = afSim - (d.plannedExpensesBeforeSim ?? 0);

  const html = `
    <div style="background:${risk.soft};border-radius:10px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:48px;height:48px;border-radius:12px;background:${risk.color};color:#fff;display:grid;place-items:center;flex-shrink:0">${risk.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${risk.color};margin-bottom:2px">Wynik analizy</div>
        <div style="font-size:22px;font-weight:600;letter-spacing:-0.01em;color:${risk.color}">${escapeHTML(result.title)}</div>
        <div style="font-size:12px;color:${risk.color};opacity:0.85;margin-top:4px;line-height:1.4">${escapeHTML(result.summary)}</div>
      </div>
      <div class="num" style="font-size:28px;font-weight:500;color:${risk.color};white-space:nowrap;flex-shrink:0">${fmt(d.simulationAmount ?? 0)}<span style="font-size:14px;opacity:0.6;margin-left:4px">zł</span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0">
      <div class="metric"><div class="metric-label">Środki po wydatku</div><div class="metric-value">${fmt(d.availableAfterSimulation)} <span class="text-mute text-sm">zł</span></div></div>
      <div class="metric"><div class="metric-label">Nowy limit dzienny</div><div class="metric-value">${fmt(d.dailyBudgetAfter)} <span class="text-mute text-sm">zł/d</span></div></div>
      <div class="metric"><div class="metric-label">Wpływ na limit</div><div class="metric-value">${d.dailyBudgetBefore > 0 ? Fmt.pct(((d.dailyBudgetAfter - d.dailyBudgetBefore) / d.dailyBudgetBefore) * 100) : '—'}</div></div>
      <div class="metric"><div class="metric-label">Zobowiązania planowane</div><div class="metric-value">${fmt(d.plannedExpensesBeforeSim ?? 0)} <span class="text-mute text-sm">zł</span></div></div>
    </div>
    ${result.categoryAnalysis ? (() => {
      const ca = result.categoryAnalysis;
      const rows = [
        `<div class="metric"><div class="metric-label">Wydatki w kat. (30 dni)</div><div class="metric-value">${fmt(ca.total30d)} <span class="text-mute text-sm">zł</span></div></div>`,
        `<div class="metric"><div class="metric-label">Transakcji (30 dni)</div><div class="metric-value">${ca.count30d}</div></div>`,
        ca.avgAmount > 0 ? `<div class="metric"><div class="metric-label">Śr. kwota w kategorii</div><div class="metric-value">${fmt(ca.avgAmount)} <span class="text-mute text-sm">zł</span></div></div>` : '',
        ca.medianAmount > 0 ? `<div class="metric"><div class="metric-label">Mediana kwoty</div><div class="metric-value">${fmt(ca.medianAmount)} <span class="text-mute text-sm">zł</span></div></div>` : '',
      ].filter(Boolean).join('');
      return `<hr class="divider"><h3 style="margin:0 0 10px">Kategoria: ${escapeHTML(ca.category)}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${rows}</div>`;
    })() : ''}
    <hr class="divider">
    <h3 style="margin:0 0 10px">Analiza krok po kroku</h3>
    <ol style="padding-left:18px;font-size:13px;color:var(--ink-2);line-height:1.7;margin:0">
      <li>Aktualne dostępne środki: <strong class="num" style="color:${vc(d.projectedAvailable ?? 0)}">${fmt(d.projectedAvailable)}</strong> zł (prognozowane na dzień wydatku)</li>
      <li>Po wydatku zostanie: <strong class="num" style="color:${vc(afSim)}">${fmt(afSim)}</strong> zł</li>
      <li>Po odjęciu planowanych zobowiązań (<strong class="num">${fmt(d.plannedExpensesBeforeSim ?? 0)}</strong> zł): <strong class="num" style="color:${vc(afterPlanned)}">${fmt(Math.max(0, afterPlanned))}</strong> zł</li>
      <li>Podzielone na <strong>${d.daysToNextIncome ?? 30}</strong> dni → nowy limit dzienny: <strong class="num" style="color:${vc(d.dailyBudgetAfter ?? 0)}">${fmt(d.dailyBudgetAfter)}</strong> zł/d</li>
      <li>Mediana historyczna <strong class="num">${fmt(d.medianDailySpending)}</strong> zł — limit ${d.dailyBudgetAfter >= d.medianDailySpending ? '<span class="tag success" style="font-size:10px">powyżej mediany</span>' : '<span class="tag danger" style="font-size:10px">poniżej mediany</span>'}</li>
    </ol>
    ${findingsHTML ? `<hr class="divider"><h3 style="margin:0 0 10px">Szczegółowa analiza</h3><ul style="padding-left:18px;font-size:13px;line-height:1.7;margin:0">${findingsHTML}</ul>` : ''}
  `;

  container.innerHTML = sanitizeHTML(html);
}

const handleSimulateExpense = () => {
  const dateInput = document.getElementById('simulationDate');
  const amountInput = document.getElementById('simulationAmount');

  if (!dateInput || !amountInput) return;

  const date = dateInput.value;
  const amount = parseFloat(amountInput.value);
  const categoryInput = document.getElementById('simulationCategory');
  const category = categoryInput ? categoryInput.value : '';

  if (!date) {
    showErrorMessage('Wybierz datę wydatku');
    return;
  }

  if (!amount || amount <= 0) {
    showErrorMessage('Podaj prawidłową kwotę wydatku');
    return;
  }

  const result = simulateExpense(date, amount, category || null);
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


// ===== SZYBKI WYDATEK — logika =====

/** Otwiera quick-expense modal, czyści i inicjalizuje formularz. */
function openQuickExpenseModal() {
  openModal('quickExpenseModal');
  setupQuickExpenseSuggestions();
  // Wyczyść poprzednie dane
  const form = document.getElementById('quickExpenseForm');
  if (form) form.reset();
  document.getElementById('quickDescriptionSuggestions')?.replaceChildren();
  document.getElementById('quickDescriptionButtons')?.replaceChildren();
  // Fokus na kwotę po animacji bottom-sheet
  setTimeout(() => document.getElementById('quickAmount')?.focus(), 260);
}

/**
 * Inicjalizuje autocomplete kategorii + opisy w quick formularzu.
 * Wzorowane bezpośrednio na setupCategorySuggestions() — te same mechanizmy,
 * inne ID elementów.
 */
function setupQuickExpenseSuggestions() {
  const categoryInput     = document.getElementById('quickExpenseCategory');
  const categoryButtons   = document.getElementById('quickCategoryButtons');
  const descriptionInput  = document.getElementById('quickExpenseDescription');
  const descriptionSuggestions = document.getElementById('quickDescriptionSuggestions');
  const descriptionButtons     = document.getElementById('quickDescriptionButtons');

  if (!categoryInput || !categoryButtons) return;

  // Usuń stare listenery przez klonowanie
  const newCatInput = categoryInput.cloneNode(true);
  categoryInput.parentNode.replaceChild(newCatInput, categoryInput);
  const newDescInput = descriptionInput?.cloneNode(true);
  if (descriptionInput && newDescInput) descriptionInput.parentNode.replaceChild(newDescInput, descriptionInput);

  // Buduj kafelki top-5 z ikoną z katalogu kategorii
  const allCats    = getCategories();
  const topCats    = getTopCategories(5);
  const catWithIcon = (name) => allCats.find(c => c.name === name);

  function renderQuickCatButtons(cats) {
    if (!cats.length) { categoryButtons.innerHTML = ''; return; }
    categoryButtons.innerHTML = cats.map(tc => {
      const cat = catWithIcon(tc.name) || tc;
      const iconStr = cat.icon ? `${escapeHTML(cat.icon)} ` : '';
      return `<button type="button" class="category-quick-btn" data-action="select-quick-category" data-name="${escapeHTML(tc.name)}">${iconStr}${escapeHTML(tc.name)}</button>`;
    }).join('');
  }
  renderQuickCatButtons(topCats);

  // Filtruj kategorie przy wpisywaniu
  newCatInput.addEventListener('input', () => {
    const val = newCatInput.value.trim().toLowerCase();
    if (!val) { renderQuickCatButtons(topCats); return; }
    const filtered = allCats.filter(c => c.name.toLowerCase().includes(val)).slice(0, 5);
    if (filtered.length) {
      renderQuickCatButtons(filtered.map(c => ({ name: c.name })));
    } else {
      categoryButtons.innerHTML = '<p style="color:var(--ink-3);font-size:12px;padding:6px 0">Brak pasujących kategorii</p>';
    }
  });

  if (!newDescInput) return;

  function updateQuickDescButtons(category) {
    const top = getTopDescriptionsForCategory(category, 5);
    descriptionButtons.innerHTML = top.map(d =>
      `<button type="button" class="category-quick-btn" data-action="select-quick-description" data-description="${escapeHTML(d.name)}">${escapeHTML(d.name)}</button>`
    ).join('');
  }

  // Przy zmianie kategorii — zaktualizuj opisy
  newCatInput.addEventListener('change', () => {
    const cat = newCatInput.value.trim();
    if (cat) updateQuickDescButtons(cat);
  });

  newDescInput.addEventListener('focus', () => {
    const cat = newCatInput.value.trim();
    if (cat) updateQuickDescButtons(cat);
  });

  newDescInput.addEventListener('input', () => {
    const cat = newCatInput.value.trim();
    const val = newDescInput.value.trim().toLowerCase();

    if (!val) {
      descriptionSuggestions.innerHTML = '';
      if (cat) updateQuickDescButtons(cat); else descriptionButtons.innerHTML = '';
      return;
    }

    const expenses = getExpenses();
    const relevant = cat ? expenses.filter(e => e.category === cat) : expenses;
    const descMap = new Map();
    relevant.forEach(e => {
      if (!e.description?.toLowerCase().includes(val)) return;
      const entry = descMap.get(e.description) || { catCounts: new Map(), total: 0 };
      entry.total++;
      entry.catCounts.set(e.category || '', (entry.catCounts.get(e.category || '') || 0) + 1);
      descMap.set(e.description, entry);
    });

    if (!descMap.size) { descriptionSuggestions.innerHTML = ''; descriptionButtons.innerHTML = ''; return; }

    const results = Array.from(descMap.entries())
      .sort((a, b) => b[1].total - a[1].total).slice(0, 6)
      .map(([desc, { catCounts }]) => {
        let topCat = '', topCount = 0;
        catCounts.forEach((cnt, c) => { if (cnt > topCount) { topCount = cnt; topCat = c; } });
        return { desc, topCat };
      });

    descriptionSuggestions.innerHTML = results.map(r =>
      `<div class="suggestion-item" data-action="select-quick-description-with-category"
           data-description="${escapeHTML(r.desc)}" data-category="${escapeHTML(r.topCat)}">
        <span class="suggestion-desc-text">${escapeHTML(r.desc)}</span>
        ${r.topCat && !cat ? `<span class="suggestion-category-badge">${escapeHTML(r.topCat)}</span>` : ''}
      </div>`
    ).join('');
    descriptionButtons.innerHTML = '';
  });
}

/** Obsługa submit szybkiego formularza — ta sama logika co addExpense. */
async function addExpenseQuick(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn?.disabled) return;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.orig = submitBtn.textContent; submitBtn.textContent = 'Zapisywanie…'; }

  const amount    = parseFloat(form.expenseAmount?.value);
  const category  = (form.expenseCategory?.value || '').trim();
  const description = (form.expenseDescription?.value || '').trim();
  const userId    = form.expenseUser?.value || '';

  const restore = () => { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.orig || 'Zapisz wydatek'; } };

  if (!validateAmount(amount))  { showErrorMessage('Kwota musi być większa od 0'); restore(); return; }
  if (!category)                { showErrorMessage('Podaj kategorię'); restore(); return; }
  if (!description)             { showErrorMessage('Podaj opis'); restore(); return; }
  if (!userId)                  { showErrorMessage('Brak użytkownika — dodaj go w Ustawieniach'); restore(); return; }

  const categories = getCategories();
  if (!categories.some(c => c.name.toLowerCase() === category.toLowerCase())) {
    await saveCategories([...categories, { id: `cat_${Date.now()}`, name: escapeHTML(category), icon: getCategoryIcon(category) }]);
  }

  const date = getWarsawDateString();
  const time = getCurrentTimeString();
  const newExpense = {
    id: `exp_${Date.now()}`, amount, type: 'normal', userId,
    category: escapeHTML(category), description: escapeHTML(description), date, time,
  };

  try {
    await saveExpenses([...getExpenses(), newExpense]);
    await updateDailyEnvelope();
    clearLimitsCache();
    await log('EXPENSE_ADD', { amount, category, description, type: 'normal', budgetUser: getBudgetUserName(userId) });
    window.closeModal('quickExpenseModal');
    renderExpenses(); renderCategories(); renderSummary(); renderDailyEnvelope();
    showSuccessMessage(`Zapisano: ${description} — ${Fmt.zl(amount)} zł`);
  } catch (err) {
    console.error('❌ Błąd szybkiego wydatku:', err);
    showErrorMessage('Nie udało się zapisać wydatku');
  } finally { restore(); }
}

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
    resetAndRenderLogs();
    const listEl = document.getElementById('sharedBudgetUsersList');
    if (listEl) {
      listEl.innerHTML = budgetUsersCache.map(user => {
        const initial = (user.name || '?')[0].toUpperCase();
        const role = user.isOwner ? 'Właściciel' : 'Członek';
        return `<div class="row" style="gap:12px">
          <div class="avatar" style="background:var(--accent-soft);color:var(--accent);font-weight:600;flex-shrink:0">${escapeHTML(initial)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${escapeHTML(user.name || 'Nieznany')}</div>
            <div class="text-mute text-sm">${role}</div>
          </div>
        </div>`;
      }).join('');
    }
  }

  if (sectionId === 'analyticsSection') {
    setTimeout(() => refreshCategoriesChart(), 100);
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
    await loginUser(email, password);
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
    await registerUser(email, password, displayName);
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
  const authSection = document.getElementById('authSection');
  const appSection = document.getElementById('appSection');
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
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');

    const displayName = await getDisplayName(user.uid);
    updateDisplayNameInUI(displayName);

    // Fill sidebar email
    const sidebarEmail = document.getElementById('sidebarUserEmail');
    if (sidebarEmail) sidebarEmail.textContent = user.email || '';

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
    checkForUpdate();
    startVersionPolling();

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
  initTheme();
  initThemeSelector();
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
  if (simulationDateInput) {
    simulationDateInput.value = today;
    simulationDateInput.min = today;
  }

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
  setExpenseAdvancedDeps({ getCategories, getBudgetUsersCache: () => budgetUsersCache });
  setIncomeDeps({ getBudgetUserName });
  setIncomeAdvancedDeps({ getBudgetUsersCache: () => budgetUsersCache });
  setCategoryHandlerDeps({ renderCategories, renderExpenses });
  setSummaryDeps({ getBudgetUsersCache: () => budgetUsersCache });
  setSavingsDeps({ getBudgetUsersCache: () => budgetUsersCache });
  setLLMExportDeps({ getBudgetUsersCache: () => budgetUsersCache });
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
    setupIncomeTypeToggle
  });

  // Inicjalizuj event delegation dla bezpiecznej obsługi kliknięć
  initClickDelegation({
    // Kategorie
    'toggle-cat-menu': (el, e) => {
      e.stopImmediatePropagation();
      const id = el.dataset.id;
      const dropdown = document.getElementById(`cat-menu-${id}`);
      const isOpen = dropdown && dropdown.style.display !== 'none';
      document.querySelectorAll('.cat-menu-dropdown').forEach(d => { d.style.display = 'none'; });
      if (!isOpen && dropdown) dropdown.style.display = 'block';
    },
    'open-add-category-modal': () => showAddCategoryModal(),
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
    'select-description-with-category': (el) => selectDescriptionWithCategory(el.dataset.description, el.dataset.category),
    'select-category': (el) => selectCategory(getDataAttributes(el).name),

    // Wydatki - akcje
    'view-expense': (el, e) => {
      if (e.target.closest('[data-action]:not([data-action="view-expense"])')) return;
      const id = el.dataset.id;
      const expense = getExpenses().find(exp => exp.id === id);
      if (!expense) return;
      showExpenseDetailsModal(expense, {
        getBudgetUserName,
        onEdit: (expId) => editExpense(expId),
      });
    },
    'realise-expense': (el) => realiseExpense(getDataAttributes(el).id),
    'edit-expense': (el) => editExpense(getDataAttributes(el).id),
    'delete-expense': (el) => deleteExpense(getDataAttributes(el).id),
    'change-expense-page': (el) => changeExpensePage(parseInt(getDataAttributes(el).page, 10)),

    // Przychody - quick buttons
    'select-source': (el) => selectSource(getDataAttributes(el).source),

    // Przychody - akcje
    'view-income': (el, e) => {
      if (e.target.closest('[data-action]:not([data-action="view-income"])')) return;
      const id = el.dataset.id;
      const income = getIncomes().find(inc => inc.id === id);
      if (!income) return;
      showIncomeDetailsModal(income, {
        getBudgetUserName,
        onEdit: (incId) => editIncome(incId),
      });
    },
    'realise-income': (el) => realiseIncome(getDataAttributes(el).id),
    'edit-income': (el) => editIncome(getDataAttributes(el).id),
    'delete-income': (el) => deleteIncome(getDataAttributes(el).id),
    'change-income-page': (el) => changeIncomePage(parseInt(getDataAttributes(el).page, 10)),

    // Logi
    'change-log-page': (el) => changeLogPage(parseInt(getDataAttributes(el).page, 10)),
    'clear-logs': () => clearLogs(),

    // Autoryzacja
    'show-auth-tab': (el) => showAuthTab(el.dataset.tab),

    // Kafelki limitów
    'view-limit': (el) => {
      const index = parseInt(el.dataset.limitIndex, 10);
      const data = getLimitModalData(index);
      if (data) showLimitDetailModal(data);
    },

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

    // Toggle trybu gauges koperty (wydano / pozostało)
    'toggle-envelope-mode': () => toggleGaugeMode(),

    // Wymuszone przeliczenie koperty
    'force-recalc-envelope': async () => {
      const todayStr = getWarsawDateString();
      const lastDate = await getForceRecalcDate();
      if (lastDate === todayStr) {
        showErrorMessage('Przeliczenie koperty zostało już wymuszone dziś. Limit: 1×/dobę.');
        return;
      }
      const confirmed = await showPasswordModal(
        'Wymuś przeliczenie koperty',
        'Ta operacja wymaga potwierdzenia hasłem administratora. Koperta dnia zostanie przeliczona od nowa.'
      );
      if (!confirmed) return;
      try {
        const btn = document.getElementById('forceRecalcBtn');
        if (btn) btn.disabled = true;
        await recalculateEnvelope();
        await setForceRecalcDate(todayStr);
        const currentUser = getCurrentUser();
        const userName = getBudgetUserName(currentUser?.uid) || getDisplayName() || 'Admin';
        await log('ENVELOPE_FORCE_RECALC', {
          budgetUser: userName,
          date: todayStr,
          message: 'Ręczne wymuszenie przeliczenia koperty dnia'
        });
        renderDailyEnvelope();
        showSuccessMessage('Koperta dnia została przeliczona.');
        if (btn) btn.disabled = false;
      } catch (err) {
        showErrorMessage('Nie udało się przeliczyć koperty.');
        const btn = document.getElementById('forceRecalcBtn');
        if (btn) btn.disabled = false;
      }
    },

    // Szybki wydatek
    'open-quick-expense-modal': () => openQuickExpenseModal(),
    'select-quick-category': (el) => {
      const name = el.dataset.name;
      const catInput = document.getElementById('quickExpenseCategory');
      if (catInput) {
        catInput.value = name;
        // Zaktualizuj opisy dla tej kategorii
        const top = getTopDescriptionsForCategory(name, 5);
        const descBtns = document.getElementById('quickDescriptionButtons');
        if (descBtns) descBtns.innerHTML = top.map(d =>
          `<button type="button" class="category-quick-btn" data-action="select-quick-description" data-description="${escapeHTML(d.name)}">${escapeHTML(d.name)}</button>`
        ).join('');
        document.getElementById('quickDescriptionSuggestions')?.replaceChildren();
        document.getElementById('quickExpenseDescription')?.focus();
      }
    },
    'select-quick-description': (el) => {
      const descInput = document.getElementById('quickExpenseDescription');
      if (descInput) descInput.value = el.dataset.description || '';
      document.getElementById('quickDescriptionSuggestions')?.replaceChildren();
    },
    'select-quick-description-with-category': (el) => {
      const desc = el.dataset.description || '';
      const cat  = el.dataset.category  || '';
      const descInput = document.getElementById('quickExpenseDescription');
      if (descInput) descInput.value = desc;
      document.getElementById('quickDescriptionSuggestions')?.replaceChildren();
      const catInput = document.getElementById('quickExpenseCategory');
      if (catInput && !catInput.value.trim() && cat) catInput.value = cat;
    },

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
    'open-correction-modal': () => {
      const dateInput = document.getElementById('correctionDate');
      if (dateInput) dateInput.value = getWarsawDateString();
      const fundsDisplay = document.getElementById('currentFundsDisplay');
      const availableFunds = document.getElementById('availableFunds');
      if (fundsDisplay && availableFunds) fundsDisplay.textContent = availableFunds.textContent;
      // Resetuj tryb do "total" przy każdym otwarciu
      const form = document.getElementById('correctionForm');
      if (form) {
        form.correctionMode.value = 'total';
        setCorrectionModeUI('total');
      }
      openModal('correctionModal');
    },
    'set-correction-mode': (el) => {
      const mode = el.dataset.mode;
      const form = document.getElementById('correctionForm');
      if (!form) return;
      form.correctionMode.value = mode;
      setCorrectionModeUI(mode);
    },
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
    'filter-expenses': (el) => setExpenseFilter(el.dataset.filter),
    'toggle-expense-filters': () => toggleExpenseFilterPanel(),
    'apply-expense-filters':  () => applyExpenseFilters(),
    'reset-expense-filters':  () => resetExpenseFilters(),

    // Filtry przychodów
    'filter-incomes': (el) => setIncomeFilter(el.dataset.filter),
    'toggle-income-filters': () => toggleIncomeFilterPanel(),
    'apply-income-filters':  () => applyIncomeFilters(),
    'reset-income-filters':  () => resetIncomeFilters(),

    // Cele oszczędnościowe
    'open-savings-goal-modal': () => showSavingsGoalModal(null),
    'toggle-savings-goal': (el) => el.closest('.savings-goal-card')?.classList.toggle('collapsed'),
    'edit-savings-goal': (el) => {
      const goal = getGoals().find(g => g.id === el.dataset.goalId);
      if (goal) showSavingsGoalModal(goal);
    },
    'savings-goal-deposit': (el) => {
      const goal = getGoals().find(g => g.id === el.dataset.goalId);
      if (goal) showGoalDepositModal(goal, budgetUsersCache, el.dataset.mode ?? 'add');
    },
    'delete-savings-goal': async (el) => {
      const goal = getGoals().find(g => g.id === el.dataset.goalId);
      if (!goal) return;
      const confirmed = await showConfirmModal(
        `Usunąć cel "${goal.name}"?`,
        'Tej operacji nie można cofnąć. Historia wpłat zostanie usunięta.',
        { type: 'danger', confirmText: 'Usuń', cancelText: 'Anuluj' }
      );
      if (!confirmed) return;
      try {
        await deleteGoal(goal.id);
        showSuccessMessage(`Cel "${goal.name}" usunięty`);
      } catch {
        showErrorMessage('Nie udało się usunąć celu');
      }
    },

    'close-savings-goal': async (el) => {
      const goal = getGoals().find(g => g.id === el.dataset.goalId);
      if (!goal) return;
      const amtFmt = Fmt.zl(goal.current);
      const msg = goal.current > 0
        ? `${amtFmt} zł wróci do dostępnych środków budżetu. Historia wpłat zostanie usunięta.`
        : 'Cel zostanie usunięty. Historia wpłat zostanie usunięta.';
      const confirmed = await showConfirmModal(
        `Zamknąć cel "${goal.name}"?`,
        msg,
        { type: 'danger', confirmText: 'Zamknij cel', cancelText: 'Anuluj' }
      );
      if (!confirmed) return;
      try {
        await deleteGoal(goal.id);
        const info = goal.current > 0 ? ` — ${amtFmt} zł zwrócono do budżetu` : '';
        showSuccessMessage(`Cel "${goal.name}" zamknięty${info}`);
      } catch {
        showErrorMessage('Nie udało się zamknąć celu');
      }
    },

    'delete-savings-history': async (el) => {
      const confirmed = await showConfirmModal(
        'Usunąć ten wpis z archiwum?',
        'Wpis zostanie trwale usunięty z historii.',
        { type: 'danger', confirmText: 'Usuń wpis', cancelText: 'Anuluj' }
      );
      if (!confirmed) return;
      try {
        await deleteHistoryEntry(el.dataset.entryId);
        showSuccessMessage('Wpis usunięty');
      } catch {
        showErrorMessage('Nie udało się usunąć wpisu');
      }
    },

  });

  // Zamknij dropdown kategorii przy kliknięciu poza nim
  document.addEventListener('click', () => {
    document.querySelectorAll('.cat-menu-dropdown').forEach(d => { d.style.display = 'none'; });
  });

  // Wyszukiwanie wydatków i przychodów
  document.getElementById('expenseSearch')?.addEventListener('input', (e) => setExpenseSearch(e.target.value));
  document.getElementById('incomeSearch')?.addEventListener('input', (e) => setIncomeSearch(e.target.value));
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
  document.getElementById('settingsForm')?.addEventListener('submit', saveSettings);
  document.getElementById('quickExpenseForm')?.addEventListener('submit', addExpenseQuick);

  initPullToRefresh();
});

// Oznacz aktywność przy zamknięciu strony
window.addEventListener('beforeunload', () => {
  recordActivity();
});

function initPullToRefresh() {
  const THRESHOLD = 80;
  const indicator = document.getElementById('ptrIndicator');
  const iconDiv = document.getElementById('ptrIcon');
  if (!indicator || !iconDiv) return;

  iconDiv.innerHTML = lucideIcon('RefreshCw', { size: 18 });

  let startY = 0;
  let pulling = false;
  let refreshing = false;

  function updateIcon(dy) {
    const progress = Math.min(dy / THRESHOLD, 1);
    iconDiv.style.transform = `translateY(${progress * 60 - 60}px)`;
    iconDiv.style.opacity = String(Math.min(progress * 1.5, 1));
  }

  function resetIcon() {
    iconDiv.style.transition = 'transform 0.28s ease, opacity 0.28s ease';
    iconDiv.style.transform = 'translateY(-60px)';
    iconDiv.style.opacity = '0';
    indicator.classList.remove('ptr-loading', 'ptr-ready');
    setTimeout(() => { iconDiv.style.transition = ''; }, 280);
  }

  document.addEventListener('touchstart', (e) => {
    if (refreshing || window.scrollY > 0) return;
    startY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!pulling || refreshing) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { pulling = false; return; }
    updateIcon(dy);
    indicator.classList.toggle('ptr-ready', dy >= THRESHOLD);
  }, { passive: true });

  document.addEventListener('touchend', async (e) => {
    if (!pulling || refreshing) { pulling = false; return; }
    const dy = e.changedTouches[0].clientY - startY;
    pulling = false;

    if (dy >= THRESHOLD && window.scrollY <= 0) {
      refreshing = true;
      indicator.classList.add('ptr-loading');
      indicator.classList.remove('ptr-ready');
      iconDiv.style.transition = '';
      iconDiv.style.transform = 'translateY(0)';
      iconDiv.style.opacity = '1';
      await loadAllData();
      refreshing = false;
    }
    resetIcon();
  });
}