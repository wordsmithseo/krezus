// src/app.js - Główna aplikacja Krezus v2.0 z indywidualnymi budżetami i real-time updates

import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthChange,
  checkIsAdmin,
  getDisplayName,
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

// Inicjalizacja
console.log('🚀 Aplikacja Krezus uruchomiona');
initGlobalErrorHandler();

// Callbacks dla powiadomień
window.onMessagesCountChange = (count) => {
  updateNotificationBadge('messagesBadge', count);
};

/**
 * Aktualizuj badge powiadomień
 */
function updateNotificationBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Nasłuchuj zmiany stanu uwierzytelnienia
onAuthChange(async (authState) => {
  const { user, displayName } = authState;
  
  if (user) {
    console.log('✅ Użytkownik zalogowany:', displayName);
    
    showApp();
    await loadAllData();
    setupApp();
    setupRealtimeUpdates();
    
    // Załaduj licznik powiadomień
    updateNotificationBadge('messagesBadge', getUnreadMessagesCount());
  } else {
    console.log('❌ Użytkownik niezalogowany');
    clearAllListeners();
    clearCache();
    showAuth();
  }
});

/**
 * Pokaż formularz uwierzytelniania
 */
function showAuth() {
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('appContainer').style.display = 'none';
  setupAuthForm();
}

/**
 * Pokaż aplikację
 */
function showApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  
  const displayName = getDisplayName();
  document.querySelectorAll('.user-display-name').forEach(el => {
    el.textContent = displayName;
  });
}

/**
 * Konfiguracja formularza uwierzytelniania
 */
function setupAuthForm() {
  const form = document.getElementById('authForm');
  const toggleLink = document.getElementById('authToggleLink');
  const toggleText = document.getElementById('authToggleText');
  const title = document.getElementById('authTitle');
  const submitBtn = document.getElementById('authSubmit');
  
  let isLogin = true;
  
  toggleLink?.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    
    if (isLogin) {
      title.textContent = 'Logowanie';
      submitBtn.textContent = '🔐 Zaloguj się';
      toggleText.textContent = 'Nie masz konta?';
      toggleLink.textContent = 'Zarejestruj się';
    } else {
      title.textContent = 'Rejestracja';
      submitBtn.textContent = '📝 Zarejestruj się';
      toggleText.textContent = 'Masz już konto?';
      toggleLink.textContent = 'Zaloguj się';
    }
  });
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    try {
      showLoader(true);
      
      if (isLogin) {
        await loginUser(email, password);
        showSuccessMessage('Zalogowano pomyślnie!');
      } else {
        await registerUser(email, password);
        showSuccessMessage('Konto utworzone pomyślnie!');
      }
      
      form.reset();
    } catch (error) {
      showErrorMessage(error.message);
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Załaduj wszystkie dane
 */
async function loadAllData() {
  try {
    showLoader(true);
    await fetchAllData();
    await autoRealiseDueTransactions();
    await updateDailyEnvelope();
    renderAll();
  } catch (error) {
    console.error('Błąd ładowania danych:', error);
    showErrorMessage('Nie udało się załadować danych');
  } finally {
    showLoader(false);
  }
}

/**
 * Konfiguruj aktualizacje real-time
 */
function setupRealtimeUpdates() {
  subscribeToRealtimeUpdates({
    onCategoriesChange: (categories) => {
      console.log('📊 Kategorie zaktualizowane');
      flashElement('categoriesTable');
      renderCategories();
      renderExpenseHistory();
      updateCategorySuggestions();
      populateCategoryMonthDropdown();
    },
    onExpensesChange: (expenses) => {
      console.log('💸 Wydatki zaktualizowane');
      flashElement('historyTable');
      renderExpenseHistory();
      renderSummary();
      renderCategories();
      renderCategoryChart();
      renderComparisons();
    },
    onIncomesChange: (incomes) => {
      console.log('💰 Źródła finansów zaktualizowane');
      flashElement('incomeHistoryTable');
      renderIncomeHistory();
      renderSources();
      renderSummary();
      renderComparisons();
    },
    onEndDatesChange: (endDates) => {
      console.log('📅 Daty końcowe zaktualizowane');
      renderSummary();
    },
    onSavingGoalChange: (goal) => {
      console.log('🎯 Cel oszczędności zaktualizowany');
      renderSummary();
    },
    onDailyEnvelopeChange: (envelope) => {
      console.log('📩 Koperta dnia zaktualizowana');
      renderSummary();
    }
  });
}

/**
 * Efekt migania dla zaktualizowanego elementu
 */
function flashElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove('flash-update');
    setTimeout(() => {
      element.classList.add('flash-update');
    }, 10);
  }
}

/**
 * Konfiguracja aplikacji
 */
function setupApp() {
  setupUserButtons();
  setupExpenseForm();
  setupSourcesSection();
  setupEndDatesForm();
  setupSavingGoalForm();
  setupCategoryInput();
  setupMonthSelector();
  setupComparisonsFilters();
}

/**
 * Renderuj wszystkie sekcje
 */
function renderAll() {
  renderSummary();
  renderCategories();
  renderExpenseHistory();
  renderIncomeHistory();
  renderSources();
  renderCategoryChart();
  renderComparisons();
  populateCategoryMonthDropdown();
  updateCategorySuggestions();
}

/**
 * Renderuj podsumowanie z pełnym systemem kopert
 */
function renderSummary() {
  const summaryDiv = document.getElementById('summary');
  if (!summaryDiv) return;
  
  summaryDiv.innerHTML = '';
  
  const envelope = getDailyEnvelope();
  const { spentToday, spentWeek, spentMonth } = calculateSpendingPeriods();
  const { 
    remainingReal, 
    daysLeft1, 
    daysLeft2, 
    dailyLimit1, 
    dailyLimit2 
  } = calculateDailyLimits();
  const {
    forecastDailyLimit1,
    forecastDailyLimit2
  } = calculateForecastLimits();
  const savingGoal = getSavingGoal();
  const endDates = getEndDates();
  
  // Koperta dnia
  if (envelope) {
    const envelopeBase = envelope.base_amount || 0;
    const envelopeExtra = envelope.today_extra_from_inflows || 0;
    const envelopeTotal = envelopeBase + envelopeExtra;
    const remainingToday = envelopeTotal - spentToday;
    const overspend = spentToday > envelopeTotal ? spentToday - envelopeTotal : 0;
    
    const setAtStr = envelope.set_at || '';
    let setAtTime = '';
    if (setAtStr) {
      try {
        const d = new Date(setAtStr);
        setAtTime = d.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        setAtTime = setAtStr.split('T')[1] ? setAtStr.split('T')[1].slice(0,5) : '';
      }
    }
    
    const chosenEndDate = endDates.primary;
    const chosenEndLabel = formatDateLabel(chosenEndDate);
    
    let progressPercent = 0;
    if (envelopeTotal > 0) {
      progressPercent = Math.min(100, Math.floor((spentToday / envelopeTotal) * 100));
    }
    
    let progressColour = '#27ae60';
    const ratio = envelopeTotal > 0 ? (spentToday / envelopeTotal) : 0;
    if (ratio > 1) {
      progressColour = '#c0392b';
    } else if (ratio > 0.75) {
      progressColour = '#e67e22';
    } else if (ratio > 0.5) {
      progressColour = '#f1c40f';
    }
    
    const med30Display = getGlobalMedian30d();
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'daily-envelope-card';
    cardDiv.innerHTML =
      `<h3>Koperta dnia: ${envelopeTotal.toFixed(2)} zł</h3>` +
      `<div class="daily-envelope-details">Ustalono o ${setAtTime} · do ${chosenEndLabel}</div>` +
      `<div class="daily-envelope-details">Wydano dziś: ${spentToday.toFixed(2)} zł</div>` +
      `<div class="daily-envelope-details">Zostało dziś: ${remainingToday.toFixed(2)} zł</div>` +
      `<div class="daily-envelope-details">Mediana wydatków (30 dni): ${med30Display.toFixed(2)} zł/dzień</div>` +
      `<div class="daily-envelope-progress"><div class="daily-envelope-progress-bar" style="width:${progressPercent}%;background:${progressColour};"></div></div>` +
      (overspend > 0 ? `<div class="daily-envelope-overspend">Pożyczyłeś z jutra: ${overspend.toFixed(2)} zł</div>` : '');
    summaryDiv.appendChild(cardDiv);
  }
  
  // Grupy podsumowania
  const groups = [
    {
      title: 'Stan posiadania',
      items: [
        { label: 'Pozostało (PLN)', value: remainingReal.toFixed(2), icon: '💼' },
        { label: 'Cel oszczędności (PLN)', value: savingGoal.toFixed(2), icon: '🏖' }
      ]
    },
    {
      title: 'Wydatki',
      items: [
        { label: 'Wydano dziś (PLN)', value: spentToday.toFixed(2), icon: '📅' },
        { label: 'Wydano w tym tygodniu (PLN)', value: spentWeek.toFixed(2), icon: '🗓️' },
        { label: 'Wydano w tym miesiącu (PLN)', value: spentMonth.toFixed(2), icon: '📆' }
      ]
    },
    {
      title: 'Prognoza do końca',
      items: [
        { label: `Dni do końca (${formatDateLabel(endDates.primary)})`, value: daysLeft1.toString(), icon: '📅' },
        { label: `Dni do końca (${formatDateLabel(endDates.secondary)})`, value: daysLeft2.toString(), icon: '📅' }
      ]
    }
  ];
  
  groups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'summary-group';
    const h3 = document.createElement('h3');
    h3.textContent = group.title;
    groupDiv.appendChild(h3);
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'summary-items';
    group.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'summary-item';
      div.innerHTML = `<span class="label">${item.icon} ${item.label}</span><span class="value">${item.value}</span>`;
      itemsDiv.appendChild(div);
    });
    groupDiv.appendChild(itemsDiv);
    summaryDiv.appendChild(groupDiv);
  });
  
  // Prognozowane limity
  const forecastContainer = document.getElementById('forecastSummary');
  if (forecastContainer) {
    forecastContainer.innerHTML = '';
    const forecastItems = [
      { label: `Prognozowany dzienny limit do ${formatDateLabel(endDates.primary)}`, value: `${forecastDailyLimit1.toFixed(2)}`, icon: '🔮' },
      { label: `Prognozowany dzienny limit do ${formatDateLabel(endDates.secondary)}`, value: `${forecastDailyLimit2.toFixed(2)}`, icon: '🔮' }
    ];
    forecastItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'summary-item';
      div.innerHTML = `<span class="label">${item.icon} ${item.label}</span><span class="value">${item.value}</span>`;
      forecastContainer.appendChild(div);
    });
  }
  
  // Wskaźnik tempa wydatków
  updateSpendingGaugeUI(spentMonth, dailyLimit1, new Date().getDate());
  
  // Sprawdź anomalie
  const anomalyResult = checkAnomalies();
  const anomalyDiv = document.getElementById('anomalyMessage');
  if (anomalyDiv) {
    if (anomalyResult.hasAnomalies) {
      anomalyDiv.textContent = '⚠️ Uwaga: ' + anomalyResult.messages.join(' ');
      anomalyDiv.style.display = 'block';
    } else {
      anomalyDiv.style.display = 'none';
    }
  }
}

/**
 * Aktualizuj wskaźnik tempa wydatków
 */
function updateSpendingGaugeUI(spentMonth, dailyLimit, daysElapsed) {
  const container = document.getElementById('spendingGaugeContainer');
  if (!container) return;
  
  if (container.innerHTML.trim() === '') {
    container.innerHTML = '<div class="spending-gauge"><div class="gauge-pointer"></div></div>';
  }
  
  const { pointerRatio } = calculateSpendingGauge(spentMonth, dailyLimit, daysElapsed);
  
  const pointer = container.querySelector('.gauge-pointer');
  if (pointer) {
    pointer.style.left = (pointerRatio * 100) + '%';
  }
}

/**
 * Renderuj kategorie
 */
function renderCategories() {
  const tbody = document.querySelector('#categoriesTable tbody');
  const datalist = document.getElementById('categoryList');
  if (!tbody) return;
  
  const categories = getCategories();
  const expenses = getExpenses();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  tbody.innerHTML = '';
  if (datalist) datalist.innerHTML = '';
  
  categories.forEach(cat => {
    const spent = expenses
      .filter(e => e.categoryId === cat.id && (!e.planned || new Date(e.date) <= today))
      .reduce((acc, e) => acc + (e.amount * (e.quantity || 1)), 0);
    
    const row = document.createElement('tr');
    const editHtml = `<button class="edit-category" data-id="${cat.id}" style="background:none;border:none;color:#2980b9;cursor:pointer;font-size:1.2rem;">✏️</button>`;
    const deleteHtml = `<button class="delete-category" data-id="${cat.id}" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:1.2rem;">🗑️</button>`;
    row.innerHTML = `<td>${cat.name}</td><td>${spent.toFixed(2)}</td><td>${editHtml}</td><td>${deleteHtml}</td>`;
    tbody.appendChild(row);
    
    if (datalist) {
      const opt = document.createElement('option');
      opt.value = cat.name;
      datalist.appendChild(opt);
    }
    
    const editBtn = row.querySelector('button.edit-category');
    editBtn && editBtn.addEventListener('click', () => editCategory(cat.id));
    
    const delBtn = row.querySelector('button.delete-category');
    delBtn && delBtn.addEventListener('click', () => deleteCategory(cat.id));
  });
}

/**
 * Edytuj kategorię
 */
async function editCategory(catId) {
  const cat = getCategories().find(c => c.id === catId);
  if (!cat) return;
  
  const newName = prompt('Podaj nową nazwę kategorii:', cat.name);
  if (newName === null) return;
  
  const trimmed = newName.trim();
  if (!trimmed) return;
  
  cat.name = trimmed;
  const categories = getCategories();
  await saveCategories(categories);
}

/**
 * Usuń kategorię
 */
async function deleteCategory(catId) {
  if (!confirm('Czy na pewno chcesz usunąć tę kategorię oraz wszystkie powiązane wydatki?')) return;
  
  let categories = getCategories().filter(c => c.id !== catId);
  let expenses = getExpenses().filter(e => e.categoryId !== catId);
  
  await saveCategories(categories);
  await saveExpenses(expenses);
  
  showSuccessMessage('Kategoria usunięta!');
}

/**
 * Renderuj historię wydatków
 */
function renderExpenseHistory() {
  const tbody = document.querySelector('#historyTable tbody');
  if (!tbody) return;
  
  const expenses = getExpenses().slice();
  const categories = getCategories();
  
  expenses.sort((a, b) => {
    const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dateB - dateA;
  });
  
  const totalPages = Math.ceil(expenses.length / PAGINATION.ITEMS_PER_PAGE);
  if (currentExpensePage < 1) currentExpensePage = 1;
  if (currentExpensePage > totalPages) currentExpensePage = totalPages || 1;
  
  const start = (currentExpensePage - 1) * PAGINATION.ITEMS_PER_PAGE;
  const page = expenses.slice(start, start + PAGINATION.ITEMS_PER_PAGE);
  
  tbody.innerHTML = '';
  
  page.forEach(exp => {
    const cat = categories.find(c => c.id === exp.categoryId);
    const row = document.createElement('tr');
    if (exp.planned) row.classList.add('planned-row');
    
    let plannedIcon = '';
    if (exp.planned) {
      plannedIcon = '🕐 ';
    } else if (exp.wasPlanned) {
      plannedIcon = '🕐✔️ ';
    }
    
    const editHtml = `<button onclick="window.editExpense('${exp.id}')">✏️</button>`;
    const deleteHtml = `<button onclick="window.deleteExpense('${exp.id}')">🗑️</button>`;
    
    row.innerHTML = `
      <td>${exp.date}</td>
      <td>${exp.time || '00:00'}</td>
      <td>${cat ? cat.name : 'Nieznana'}</td>
      <td>${plannedIcon}${exp.description || '-'}</td>
      <td>${exp.quantity || 1}</td>
      <td>${(exp.amount * (exp.quantity || 1)).toFixed(2)}</td>
      <td>${editHtml}</td>
      <td>${deleteHtml}</td>
    `;
    tbody.appendChild(row);
  });
  
  renderPagination('expensePagination', expenses.length, currentExpensePage, (page) => {
    currentExpensePage = page;
    renderExpenseHistory();
  });
}

/**
 * Renderuj historię źródeł finansów
 */
function renderIncomeHistory() {
  const tbody = document.querySelector('#incomeHistoryTable tbody');
  if (!tbody) return;
  
  const incomes = getIncomes().slice();
  
  incomes.sort((a, b) => {
    const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dateB - dateA;
  });
  
  const totalPages = Math.ceil(incomes.length / PAGINATION.ITEMS_PER_PAGE);
  if (currentIncomePage < 1) currentIncomePage = 1;
  if (currentIncomePage > totalPages) currentIncomePage = totalPages || 1;
  
  const start = (currentIncomePage - 1) * PAGINATION.ITEMS_PER_PAGE;
  const page = incomes.slice(start, start + PAGINATION.ITEMS_PER_PAGE);
  
  tbody.innerHTML = '';
  
  page.forEach(inc => {
    const row = document.createElement('tr');
    if (inc.planned) row.classList.add('planned-row');
    
    let iconStr = '';
    if (inc.planned) {
      iconStr = '🕐 ';
    } else if (inc.wasPlanned) {
      iconStr = '🕐✔️ ';
    }
    
    let descContent = inc.description || '';
    if (descContent && descContent.toUpperCase() === 'KOREKTA') {
      descContent = `<span style="color:#c0392b; font-weight:600;">${descContent}</span>`;
    }
    
    let actionHtml = '';
    if (inc.planned) {
      actionHtml = `<button onclick="window.toggleIncomeStatus('${inc.id}')">✅ Zrealizuj</button>`;
    }
    
    row.innerHTML = `
      <td>${inc.date}</td>
      <td>${inc.time || '00:00'}</td>
      <td>${iconStr}${descContent}</td>
      <td>${inc.amount.toFixed(2)}</td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(row);
  });
  
  renderPagination('incomePagination', incomes.length, currentIncomePage, (page) => {
    currentIncomePage = page;
    renderIncomeHistory();
  });
}

/**
 * Renderuj źródła finansów
 */
function renderSources() {
  const remaining = computeSourcesRemaining();
  let totalAvailable = 0;
  remaining.forEach(item => {
    totalAvailable += item.left;
  });
  
  if (totalAvailable < 0) totalAvailable = 0;
  
  const availElem = document.getElementById('availableFunds');
  if (availElem) {
    availElem.textContent = totalAvailable.toFixed(2);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const realised = getIncomes().filter(rec => {
    if (!rec.planned) return true;
    const d = new Date(rec.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() <= today.getTime();
  });
  
  realised.sort((a, b) => {
    const dtA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dtB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dtB - dtA;
  });
  
  const lastRec = realised.length > 0 ? realised[0] : null;
  const lastElem = document.getElementById('lastIncomeDate');
  if (lastElem) {
    if (lastRec) {
      const dtStr = lastRec.date + (lastRec.time ? (' ' + lastRec.time) : '');
      lastElem.textContent = dtStr;
    } else {
      lastElem.textContent = 'Brak';
    }
  }
  
  // Pokaż przycisk edycji dla wszystkich
  const editBtn = document.getElementById('editFundsButton');
  if (editBtn) {
    editBtn.style.display = 'inline-flex';
  }
}

/**
 * Renderuj paginację
 */
function renderPagination(containerId, totalItems, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const totalPages = Math.ceil(totalItems / PAGINATION.ITEMS_PER_PAGE);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  
  if (currentPage > 1) {
    html += `<button class="pagination-btn" data-page="${currentPage - 1}">◀</button>`;
  }
  
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;
  
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const active = i === currentPage ? 'active' : '';
    html += `<button class="pagination-btn ${active}" data-page="${i}">${i}</button>`;
  }
  
  if (currentPage < totalPages) {
    html += `<button class="pagination-btn" data-page="${currentPage + 1}">▶</button>`;
  }
  
  container.innerHTML = html;
  
  container.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.getAttribute('data-page'));
      onPageChange(page);
    });
  });
}

/**
 * Konfiguracja przycisków użytkownika
 */
function setupUserButtons() {
  document.getElementById('messagesBtn')?.addEventListener('click', () => {
    showMessagesModal();
  });
  
  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    showProfileModal();
  });
  
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
      await logoutUser();
      showSuccessMessage('Wylogowano pomyślnie');
    } catch (error) {
      showErrorMessage('Nie udało się wylogować');
    }
  });
}

/**
 * Konfiguracja formularza wydatków
 */
function setupExpenseForm() {
  const form = document.getElementById('expenseForm');
  if (!form) return;
  
  const dateInput = document.getElementById('expenseDate');
  const typeSelect = document.getElementById('expenseType');
  
  if (dateInput) dateInput.value = getWarsawDateString();
  
  attachValidator(document.getElementById('expenseAmount'), validateAmount);
  
  // Obsługa widoczności daty
  const updateDateVisibility = () => {
    if (typeSelect && typeSelect.value === 'normal') {
      dateInput.value = getWarsawDateString();
      dateInput.disabled = true;
      dateInput.type = 'hidden';
      const dateLabel = form.querySelector('label[for="expenseDate"]');
      if (dateLabel) dateLabel.style.display = 'none';
    } else {
      dateInput.disabled = false;
      dateInput.type = 'date';
      const dateLabel = form.querySelector('label[for="expenseDate"]');
      if (dateLabel) dateLabel.style.display = 'block';
    }
  };
  
  typeSelect?.addEventListener('change', updateDateVisibility);
  updateDateVisibility();
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = dateInput.value;
    const categoryName = document.getElementById('expenseCategory').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const quantity = parseFloat(document.getElementById('expenseQuantity').value) || 1;
    const desc = document.getElementById('expenseDesc').value.trim();
    const planned = typeSelect.value === 'planned';
    
    const validation = validateAmount(amount);
    if (!validation.valid) {
      showErrorMessage(validation.error);
      return;
    }
    
    try {
      showLoader(true);
      
      let categories = getCategories();
      let cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      if (!cat) {
        cat = { id: Date.now().toString(), name: categoryName };
        categories.push(cat);
        await saveCategories(categories);
      }
      
      const expenses = getExpenses();
      
      if (editingExpenseId) {
        const idx = expenses.findIndex(e => e.id === editingExpenseId);
        if (idx !== -1) {
          const existingExp = expenses[idx] || {};
          expenses[idx] = { 
            ...existingExp, 
            id: editingExpenseId, 
            date, 
            time: getCurrentTimeString(), 
            categoryId: cat.id, 
            amount, 
            quantity, 
            description: desc, 
            user: getDisplayName(), 
            planned 
          };
        }
        editingExpenseId = null;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '➖ Dodaj wydatek';
      } else {
        expenses.push({
          id: Date.now().toString(),
          date,
          time: getCurrentTimeString(),
          categoryId: cat.id,
          amount,
          quantity,
          description: desc,
          user: getDisplayName(),
          planned
        });
      }
      
      await saveExpenses(expenses);
      
      form.reset();
      dateInput.value = getWarsawDateString();
      document.getElementById('expenseQuantity').value = '1';
      updateDateVisibility();
      
      currentExpensePage = 1;
      showSuccessFeedback();
    } catch (error) {
      showErrorMessage('Nie udało się dodać wydatku');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja sekcji źródeł finansów
 */
function setupSourcesSection() {
  const addBtn = document.getElementById('showAddFundsForm');
  const addContainer = document.getElementById('addFundsContainer');
  const typeSelect = document.getElementById('addFundsType');
  const dateContainer = document.getElementById('addFundsDateContainer');
  
  addBtn?.addEventListener('click', () => {
    if (addContainer) addContainer.style.display = 'block';
  });
  
  document.getElementById('cancelAddFunds')?.addEventListener('click', () => {
    if (addContainer) addContainer.style.display = 'none';
  });
  
  typeSelect?.addEventListener('change', () => {
    if (dateContainer) {
      dateContainer.style.display = typeSelect.value === 'planned' ? 'block' : 'none';
    }
  });
  
  document.getElementById('confirmAddFunds')?.addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('addFundsAmount').value);
    const desc = document.getElementById('addFundsDesc').value.trim();
    const typeVal = typeSelect?.value || 'normal';
    const planned = typeVal === 'planned';
    
    let dateStr;
    if (planned) {
      const dateInput = document.getElementById('addFundsDate');
      dateStr = dateInput?.value || '';
      if (!dateStr) {
        showErrorMessage('Podaj datę planowanego wpływu');
        return;
      }
    } else {
      dateStr = getWarsawDateString();
    }
    
    if (!validateAmount(amount).valid) {
      showErrorMessage('Nieprawidłowa kwota');
      return;
    }
    
    try {
      showLoader(true);
      
      const incomes = getIncomes();
      incomes.push({
        id: Date.now().toString(),
        date: dateStr,
        time: getCurrentTimeString(),
        amount,
        description: desc || 'Dodanie środków',
        user: getDisplayName(),
        planned
      });
      
      await saveIncomes(incomes);
      
      if (!planned) {
        await updateDailyEnvelope();
      }
      
      document.getElementById('addFundsAmount').value = '';
      document.getElementById('addFundsDesc').value = '';
      if (addContainer) addContainer.style.display = 'none';
      
      currentIncomePage = 1;
      showSuccessFeedback();
    } catch (error) {
      showErrorMessage('Nie udało się dodać środków');
    } finally {
      showLoader(false);
    }
  });
  
  // Edycja stanu środków
  document.getElementById('editFundsButton')?.addEventListener('click', () => {
    const editContainer = document.getElementById('editFundsContainer');
    if (!editContainer) return;
    
    const availElem = document.getElementById('availableFunds');
    const currentVal = availElem ? parseFloat(availElem.textContent) || 0 : 0;
    const inputField = document.getElementById('editFundsAmount');
    if (inputField) inputField.value = currentVal.toFixed(2);
    
    editContainer.style.display = 'block';
  });
  
  document.getElementById('cancelEditFunds')?.addEventListener('click', () => {
    const editContainer = document.getElementById('editFundsContainer');
    if (editContainer) editContainer.style.display = 'none';
  });
  
  document.getElementById('confirmEditFunds')?.addEventListener('click', async () => {
    const inputField = document.getElementById('editFundsAmount');
    const newVal = inputField ? parseFloat(inputField.value) : NaN;
    const availElem = document.getElementById('availableFunds');
    const currentVal = availElem ? parseFloat(availElem.textContent) || 0 : 0;
    
    if (isNaN(newVal) || newVal < 0) {
      showErrorMessage('Proszę podać poprawną kwotę');
      return;
    }
    
    const delta = newVal - currentVal;
    
    if (Math.abs(delta) < 0.001) {
      const editContainer = document.getElementById('editFundsContainer');
      if (editContainer) editContainer.style.display = 'none';
      return;
    }
    
    try {
      showLoader(true);
      
      const incomes = getIncomes();
      incomes.push({
        id: Date.now().toString(),
        date: getWarsawDateString(),
        time: getCurrentTimeString(),
        amount: delta,
        description: 'KOREKTA',
        user: getDisplayName(),
        planned: false
      });
      
      await saveIncomes(incomes);
      await updateDailyEnvelope();
      
      const editContainer = document.getElementById('editFundsContainer');
      if (editContainer) editContainer.style.display = 'none';
      
      showSuccessFeedback();
    } catch (error) {
      showErrorMessage('Nie udało się edytować stanu środków');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja formularza dat końcowych
 */
function setupEndDatesForm() {
  const form = document.getElementById('endDatesForm');
  
  // Włącz pola dla wszystkich użytkowników
  document.getElementById('setEndDatesButton')?.removeAttribute('disabled');
  document.getElementById('budgetEndDate1')?.removeAttribute('disabled');
  document.getElementById('budgetEndDate2')?.removeAttribute('disabled');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date1 = document.getElementById('budgetEndDate1').value;
    const date2 = document.getElementById('budgetEndDate2').value;
    
    try {
      showLoader(true);
      await saveEndDates(date1, date2);
      await updateDailyEnvelope();
      showSuccessMessage('Daty zaktualizowane!');
    } catch (error) {
      showErrorMessage('Nie udało się zaktualizować dat');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja formularza celu oszczędności
 */
function setupSavingGoalForm() {
  const form = document.getElementById('savingGoalForm');
  
  // Włącz formularz dla wszystkich użytkowników
  if (form) {
    const inputs = form.querySelectorAll('input, button');
    inputs.forEach(el => el.disabled = false);
  }
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const goal = parseFloat(document.getElementById('savingGoal').value);
    
    if (!validateAmount(goal).valid) {
      showErrorMessage('Nieprawidłowa kwota');
      return;
    }
    
    try {
      showLoader(true);
      await saveSavingGoal(goal);
      await updateDailyEnvelope();
      showSuccessMessage('Cel zaktualizowany!');
    } catch (error) {
      showErrorMessage('Nie udało się zaktualizować celu');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja sugestii kategorii
 */
function setupCategoryInput() {
  const expCatInput = document.getElementById('expenseCategory');
  if (expCatInput) {
    expCatInput.addEventListener('input', () => {
      updateDescriptionSuggestions();
    });
  }
}

/**
 * Aktualizuj sugestie kategorii
 */
function updateCategorySuggestions() {
  const container = document.getElementById('categorySuggestions');
  if (!container) return;
  
  const topCatIds = getTopCategories(5);
  const categories = getCategories();
  const topCats = topCatIds.map(id => categories.find(c => c.id === id)).filter(Boolean);
  
  if (topCats.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.innerHTML = '';
  container.style.display = 'flex';
  
  topCats.forEach(cat => {
    const tile = document.createElement('div');
    tile.className = 'suggestion-tile';
    tile.textContent = cat.name;
    tile.addEventListener('click', () => {
      const catInput = document.getElementById('expenseCategory');
      if (catInput) {
        catInput.value = cat.name;
        updateDescriptionSuggestions();
      }
    });
    container.appendChild(tile);
  });
}

/**
 * Aktualizuj sugestie opisów
 */
function updateDescriptionSuggestions() {
  const container = document.getElementById('descriptionSuggestions');
  if (!container) return;
  
  const catInput = document.getElementById('expenseCategory');
  if (!catInput) return;
  
  const name = (catInput.value || '').trim().toLowerCase();
  const categories = getCategories();
  const cat = categories.find(c => c.name && c.name.toLowerCase() === name);
  
  if (!cat) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  
  const descriptions = getTopDescriptionsForCategory(cat.id, 5);
  
  if (descriptions.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  
  container.innerHTML = '';
  container.style.display = 'flex';
  
  descriptions.forEach(desc => {
    const tile = document.createElement('div');
    tile.className = 'suggestion-tile';
    tile.textContent = desc;
    tile.addEventListener('click', () => {
      const descInput = document.getElementById('expenseDesc');
      if (descInput) {
        descInput.value = desc;
      }
    });
    container.appendChild(tile);
  });
}

/**
 * Wypełnij dropdown miesięcy dla wykresu kategorii
 */
function populateCategoryMonthDropdown() {
  const select = document.getElementById('categoryMonthSelect');
  if (!select) return;
  
  const currentVal = select.value;
  const monthSet = new Set();
  
  getExpenses().forEach(exp => {
    if (exp && exp.date) {
      const month = exp.date.slice(0, 7);
      monthSet.add(month);
    }
  });
  
  const months = Array.from(monthSet);
  months.sort((a, b) => b.localeCompare(a));
  
  select.innerHTML = '';
  
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'Wszystkie';
  select.appendChild(optAll);
  
  months.forEach(m => {
    const parts = m.split('-');
    if (parts.length === 2) {
      const year = Number(parts[0]);
      const monthNum = Number(parts[1]) - 1;
      const dateObj = new Date(year, monthNum, 1);
      const monthName = dateObj.toLocaleString('pl-PL', { month: 'long' });
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year;
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = label;
      select.appendChild(opt);
    }
  });
  
  if (currentVal && (currentVal === '' || monthSet.has(currentVal))) {
    select.value = currentVal;
  }
}

/**
 * Konfiguracja selektora miesięcy
 */
function setupMonthSelector() {
  const select = document.getElementById('categoryMonthSelect');
  select?.addEventListener('change', () => {
    renderCategoryChart();
  });
}

/**
 * Renderuj wykres kategorii
 */
function renderCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const expenses = getExpenses();
  const categories = getCategories();
  
  const monthSelect = document.getElementById('categoryMonthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : '';
  
  const totals = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  expenses.forEach(exp => {
    if (exp.planned) {
      const dCheck = new Date(exp.date);
      dCheck.setHours(0, 0, 0, 0);
      if (dCheck.getTime() > today.getTime()) return;
    }
    
    if (selectedMonth && exp.date && exp.date.slice(0, 7) !== selectedMonth) {
      return;
    }
    
    const cat = categories.find(c => c.id === exp.categoryId);
    const name = cat ? cat.name : 'Nieznana';
    const cost = exp.amount * (exp.quantity || 1);
    totals[name] = (totals[name] || 0) + cost;
  });
  
  const labels = Object.keys(totals);
  const data = labels.map(l => totals[l]);
  
  const colors = labels.map((_, i) => {
    const hue = (i * 360 / labels.length) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  });
  
  if (window.categoryChartInstance) {
    window.categoryChartInstance.destroy();
  }
  
  if (labels.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const legendDiv = document.getElementById('chartLegend');
    if (legendDiv) legendDiv.innerHTML = '';
    return;
  }
  
  window.categoryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '',
        data: data,
        backgroundColor: colors,
        maxBarThickness: 60,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const val = context.dataset.data[idx];
              return `${context.chart.data.labels[idx]}: ${val.toFixed(2)} PLN`;
            }
          }
        }
      }
    }
  });
  
  const legendDiv = document.getElementById('chartLegend');
  if (legendDiv) {
    legendDiv.innerHTML = '';
    labels.forEach((lbl, i) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const colorBox = document.createElement('span');
      colorBox.className = 'legend-color';
      colorBox.style.backgroundColor = colors[i];
      item.appendChild(colorBox);
      const text = document.createTextNode(`${lbl} (${data[i].toFixed(2)})`);
      item.appendChild(text);
      legendDiv.appendChild(item);
    });
  }
}

/**
 * Konfiguracja filtrów porównań
 */
function setupComparisonsFilters() {
  const periodSel = document.getElementById('comparisonPeriod');
  
  periodSel?.addEventListener('change', () => {
    renderComparisons();
  });
}

/**
 * Renderuj porównania
 */
function renderComparisons() {
  const periodSel = document.getElementById('comparisonPeriod');
  if (!periodSel) return;
  
  const periodType = periodSel.value;
  
  const results = computeComparisons(periodType, 'all');
  
  const incomeDiff = [];
  const expenseDiff = [];
  for (let i = 0; i < results.length; i++) {
    if (i === 0) {
      incomeDiff.push({ delta: 0, percent: 0 });
      expenseDiff.push({ delta: 0, percent: 0 });
    } else {
      const prevIncome = results[i - 1].incomeSum;
      const prevExpense = results[i - 1].expenseSum;
      const currIncome = results[i].incomeSum;
      const currExpense = results[i].expenseSum;
      const deltaIncome = currIncome - prevIncome;
      const deltaExpense = currExpense - prevExpense;
      const incomePct = prevIncome !== 0 ? (deltaIncome / prevIncome * 100) : 0;
      const expensePct = prevExpense !== 0 ? (deltaExpense / prevExpense * 100) : 0;
      incomeDiff.push({ delta: deltaIncome, percent: incomePct });
      expenseDiff.push({ delta: deltaExpense, percent: expensePct });
    }
  }
  
  const ctxElem = document.getElementById('comparisonsChart');
  if (!ctxElem) return;
  
  const ctx = ctxElem.getContext('2d');
  
  if (window.comparisonsChartInstance) {
    window.comparisonsChartInstance.destroy();
  }
  
  const labels = results.map(r => r.label);
  const incomeData = results.map(r => parseFloat(r.incomeSum.toFixed(2)));
  const expenseData = results.map(r => parseFloat(r.expenseSum.toFixed(2)));
  
  const incomeColors = new Array(results.length).fill('rgba(0, 184, 148, 0.8)');
  const expenseColors = new Array(results.length).fill('#e74c3c');
  
  window.comparisonsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Nowe źródła finansów',
          data: incomeData,
          backgroundColor: incomeColors,
          maxBarThickness: 50
        },
        {
          label: 'Wydatki',
          data: expenseData,
          backgroundColor: expenseColors,
          maxBarThickness: 50
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const datasetLabel = context.dataset.label;
              if (datasetLabel === 'Nowe źródła finansów') {
                const deltaObj = incomeDiff[idx];
                const deltaAbs = deltaObj.delta;
                const deltaPct = deltaObj.percent;
                const signAbs = deltaAbs >= 0 ? '+' : '';
                const signPct = deltaPct >= 0 ? '+' : '';
                return `${datasetLabel}: ${incomeData[idx].toFixed(2)} PLN (Δ ${signAbs}${deltaAbs.toFixed(2)} PLN, ${signPct}${deltaPct.toFixed(1)}%)`;
              } else {
                const deltaObj = expenseDiff[idx];
                const deltaAbs = deltaObj.delta;
                const deltaPct = deltaObj.percent;
                const signAbs = deltaAbs >= 0 ? '+' : '';
                const signPct = deltaPct >= 0 ? '+' : '';
                return `${datasetLabel}: ${expenseData[idx].toFixed(2)} PLN (Δ ${signAbs}${deltaAbs.toFixed(2)} PLN, ${signPct}${deltaPct.toFixed(1)}%)`;
              }
            }
          }
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  });
  
  const tableDiv = document.getElementById('comparisonsTable');
  if (tableDiv) {
    let html = '<table><thead><tr><th>Okres</th><th>Nowe źródła finansów (PLN)</th><th>Δ Nowe źródła</th><th>Wydatki (PLN)</th><th>Δ Wydatki</th><th>Transakcje</th><th>Średni dzienny wydatek (PLN)</th></tr></thead><tbody>';
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const incDiffObj = incomeDiff[i];
      const expDiffObj = expenseDiff[i];
      const signIncAbs = incDiffObj.delta >= 0 ? '+' : '';
      const signIncPct = incDiffObj.percent >= 0 ? '+' : '';
      const signExpAbs = expDiffObj.delta >= 0 ? '+' : '';
      const signExpPct = expDiffObj.percent >= 0 ? '+' : '';
      const incDeltaStr = `${signIncAbs}${incDiffObj.delta.toFixed(2)} PLN (${signIncPct}${incDiffObj.percent.toFixed(1)}%)`;
      const expDeltaStr = `${signExpAbs}${expDiffObj.delta.toFixed(2)} PLN (${signExpPct}${expDiffObj.percent.toFixed(1)}%)`;
      html += `<tr><td>${res.label}</td><td>${res.incomeSum.toFixed(2)}</td><td>${incDeltaStr}</td><td>${res.expenseSum.toFixed(2)}</td><td>${expDeltaStr}</td><td>${res.transactionCount}</td><td>${res.avgDailySpend.toFixed(2)}</td></tr>`;
    }
    html += '</tbody></table>';
    tableDiv.innerHTML = html;
  }
}

/**
 * Pokaż/ukryj loader
 */
function showLoader(show) {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.toggle('visible', show);
  }
}

/**
 * Pokaż feedback sukcesu
 */
function showSuccessFeedback() {
  try {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  } catch (err) {
    // Confetti może nie być dostępne
  }
  const summarySection = document.getElementById('summary-section');
  if (summarySection) {
    summarySection.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Edytuj wydatek
 */
window.editExpense = async (expId) => {
  const expense = getExpenses().find(e => e.id === expId);
  if (!expense) return;
  
  editingExpenseId = expId;
  const cat = getCategories().find(c => c.id === expense.categoryId);
  
  document.getElementById('expenseDate').value = expense.date;
  document.getElementById('expenseCategory').value = cat ? cat.name : '';
  document.getElementById('expenseAmount').value = expense.amount;
  document.getElementById('expenseDesc').value = expense.description || '';
  document.getElementById('expenseQuantity').value = expense.quantity || 1;
  document.getElementById('expenseType').value = expense.planned ? 'planned' : 'normal';
  
  const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '💾 Zapisz wydatek';
  
  const expSection = document.getElementById('add-expense');
  expSection && expSection.scrollIntoView({ behavior: 'smooth' });
};

/**
 * Usuń wydatek
 */
window.deleteExpense = async (expId) => {
  if (!confirm('Czy na pewno chcesz usunąć ten wydatek?')) return;
  
  let expenses = getExpenses().filter(e => e.id !== expId);
  await saveExpenses(expenses);
  
  currentExpensePage = 1;
  showSuccessFeedback();
};

/**
 * Przełącz status przychodu (planowany/zrealizowany)
 */
window.toggleIncomeStatus = async (incId) => {
  const inc = getIncomes().find(item => item.id === incId);
  if (!inc) return;
  
  if (inc.planned) {
    inc.wasPlanned = true;
    inc.planned = false;
    inc.date = getWarsawDateString();
    inc.time = getCurrentTimeString();
  } else {
    return;
  }
  
  const incomes = getIncomes();
  await saveIncomes(incomes);
  await updateDailyEnvelope();
  
  showSuccessFeedback();
};

console.log('✅ Aplikacja Krezus gotowa do działania!');