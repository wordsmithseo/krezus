// src/app.js - Główna aplikacja Krezus v2.0

import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthChange,
  checkIsAdmin,
  getDisplayName,
  getCurrentUser
} from './modules/auth.js';

import {
  fetchAllData,
  getCategories,
  getExpenses,
  getIncomes,
  saveCategories,
  saveExpenses,
  saveIncomes,
  saveEndDates,
  saveSavingGoal
} from './modules/dataManager.js';

import { showProfileModal } from './components/modals.js';

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

import { getWarsawDateString, getCurrentTimeString } from './utils/dateHelpers.js';

import { PAGINATION } from './utils/constants.js';

// Stan aplikacji
let isAdmin = false;
let currentExpensePage = 1;
let currentIncomePage = 1;

// Inicjalizacja
console.log('🚀 Aplikacja Krezus uruchomiona');
initGlobalErrorHandler();

// Nasłuchuj zmiany stanu uwierzytelnienia
onAuthChange(async (authState) => {
  const { user, isAdmin: adminStatus, displayName } = authState;
  
  if (user) {
    console.log('✅ Użytkownik zalogowany:', displayName);
    isAdmin = adminStatus;
    
    showApp();
    await loadAllData();
    setupApp();
  } else {
    console.log('❌ Użytkownik niezalogowany');
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
  
  // Aktualizuj wyświetlaną nazwę użytkownika
  const displayName = getDisplayName();
  document.querySelectorAll('.user-display-name').forEach(el => {
    el.textContent = displayName;
  });
  
  // Pokaż/ukryj przyciski admina
  if (isAdmin) {
    document.getElementById('editFundsButton')?.style.setProperty('display', 'inline-flex');
    document.getElementById('setEndDatesButton')?.removeAttribute('disabled');
    document.getElementById('budgetEndDate1')?.removeAttribute('disabled');
    document.getElementById('budgetEndDate2')?.removeAttribute('disabled');
  }
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
  
  // Przełączanie logowanie/rejestracja
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
  
  // Obsługa formularza
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
    renderAll();
  } catch (error) {
    console.error('Błąd ładowania danych:', error);
    showErrorMessage('Nie udało się załadować danych');
  } finally {
    showLoader(false);
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
}

/**
 * Renderuj wszystkie sekcje
 */
function renderAll() {
  renderSummary();
  renderCategories();
  renderExpenseHistory();
  renderIncomeHistory();
}

/**
 * Renderuj podsumowanie
 */
function renderSummary() {
  const summaryDiv = document.getElementById('summary');
  if (!summaryDiv) return;
  
  const incomes = getIncomes();
  const expenses = getExpenses();
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  incomes.forEach(inc => {
    if (!inc.planned) totalIncome += inc.amount;
  });
  
  expenses.forEach(exp => {
    if (!exp.planned) totalExpense += exp.amount * (exp.quantity || 1);
  });
  
  const remaining = totalIncome - totalExpense;
  
  summaryDiv.innerHTML = `
    <div class="summary-items">
      <div class="summary-item">
        <span class="label">💰 Przychody</span>
        <span class="value">${totalIncome.toFixed(2)} PLN</span>
      </div>
      <div class="summary-item">
        <span class="label">💸 Wydatki</span>
        <span class="value">${totalExpense.toFixed(2)} PLN</span>
      </div>
      <div class="summary-item">
        <span class="label">💵 Pozostało</span>
        <span class="value" style="color: ${remaining >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${remaining.toFixed(2)} PLN
        </span>
      </div>
    </div>
  `;
}

/**
 * Renderuj kategorie
 */
function renderCategories() {
  const tbody = document.querySelector('#categoriesTable tbody');
  if (!tbody) return;
  
  const categories = getCategories();
  const expenses = getExpenses();
  
  tbody.innerHTML = '';
  
  categories.forEach(cat => {
    const total = expenses
      .filter(e => e.categoryId === cat.id && !e.planned)
      .reduce((sum, e) => sum + (e.amount * (e.quantity || 1)), 0);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cat.name}</td>
      <td>${total.toFixed(2)}</td>
      <td><button onclick="window.editCategory('${cat.id}')">✏️</button></td>
      <td><button onclick="window.deleteCategory('${cat.id}')">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Renderuj historię wydatków
 */
function renderExpenseHistory() {
  const tbody = document.querySelector('#historyTable tbody');
  if (!tbody) return;
  
  const expenses = getExpenses();
  const categories = getCategories();
  
  tbody.innerHTML = '';
  
  const sorted = expenses.slice().sort((a, b) => {
    const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dateB - dateA;
  });
  
  const start = (currentExpensePage - 1) * PAGINATION.ITEMS_PER_PAGE;
  const end = start + PAGINATION.ITEMS_PER_PAGE;
  const page = sorted.slice(start, end);
  
  page.forEach(exp => {
    const cat = categories.find(c => c.id === exp.categoryId);
    const row = document.createElement('tr');
    if (exp.planned) row.classList.add('planned-row');
    
    row.innerHTML = `
      <td>${exp.date}</td>
      <td>${exp.time || '00:00'}</td>
      <td>${exp.user || 'Brak'}</td>
      <td>${cat ? cat.name : 'Nieznana'}</td>
      <td>${exp.description || '-'}</td>
      <td>${exp.quantity || 1}</td>
      <td>${(exp.amount * (exp.quantity || 1)).toFixed(2)}</td>
      <td><button onclick="window.editExpense('${exp.id}')">✏️</button></td>
      <td><button onclick="window.deleteExpense('${exp.id}')">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
  
  renderPagination('expensePagination', sorted.length, currentExpensePage, (page) => {
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
  
  const incomes = getIncomes();
  
  tbody.innerHTML = '';
  
  const sorted = incomes.slice().sort((a, b) => {
    const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dateB - dateA;
  });
  
  const start = (currentIncomePage - 1) * PAGINATION.ITEMS_PER_PAGE;
  const end = start + PAGINATION.ITEMS_PER_PAGE;
  const page = sorted.slice(start, end);
  
  page.forEach(inc => {
    const row = document.createElement('tr');
    if (inc.planned) row.classList.add('planned-row');
    
    row.innerHTML = `
      <td>${inc.date}</td>
      <td>${inc.time || '00:00'}</td>
      <td>${inc.user || 'Brak'}</td>
      <td>${inc.description || '-'}</td>
      <td>${inc.amount.toFixed(2)}</td>
      <td><button onclick="window.editIncome('${inc.id}')">✏️</button></td>
      <td><button onclick="window.deleteIncome('${inc.id}')">🗑️</button></td>
      <td>${inc.planned ? `<button onclick="window.toggleIncomeStatus('${inc.id}')">✅ Realizuj</button>` : '-'}</td>
    `;
    tbody.appendChild(row);
  });
  
  renderPagination('incomePagination', sorted.length, currentIncomePage, (page) => {
    currentIncomePage = page;
    renderIncomeHistory();
  });
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
    html += `<button class="pagination-btn" onclick="window.changePage('${containerId}', ${currentPage - 1})">◀</button>`;
  }
  
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? 'active' : '';
    html += `<button class="pagination-btn ${active}" onclick="window.changePage('${containerId}', ${i})">${i}</button>`;
  }
  
  if (currentPage < totalPages) {
    html += `<button class="pagination-btn" onclick="window.changePage('${containerId}', ${currentPage + 1})">▶</button>`;
  }
  
  container.innerHTML = html;
  
  window.changePage = (id, page) => onPageChange(page);
}

/**
 * Konfiguracja przycisków użytkownika
 */
function setupUserButtons() {
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
  if (dateInput) dateInput.value = getWarsawDateString();
  
  attachValidator(document.getElementById('expenseAmount'), validateAmount);
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('expenseDate').value;
    const categoryName = document.getElementById('expenseCategory').value.trim();
    const user = document.getElementById('expenseUser').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const quantity = parseFloat(document.getElementById('expenseQuantity').value) || 1;
    const desc = document.getElementById('expenseDesc').value.trim();
    const planned = document.getElementById('expenseType').value === 'planned';
    
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
      expenses.push({
        id: Date.now().toString(),
        date,
        time: getCurrentTimeString(),
        categoryId: cat.id,
        amount,
        quantity,
        description: desc,
        user: getDisplayName() || user,
        planned
      });
      
      await saveExpenses(expenses);
      
      form.reset();
      dateInput.value = getWarsawDateString();
      document.getElementById('expenseQuantity').value = '1';
      
      renderAll();
      showSuccessMessage('Wydatek dodany!');
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
  
  addBtn?.addEventListener('click', () => {
    if (addContainer) addContainer.style.display = 'block';
  });
  
  document.getElementById('cancelAddFunds')?.addEventListener('click', () => {
    if (addContainer) addContainer.style.display = 'none';
  });
  
  document.getElementById('confirmAddFunds')?.addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('addFundsAmount').value);
    const user = document.getElementById('addFundsUser').value;
    const desc = document.getElementById('addFundsDesc').value.trim();
    
    if (!validateAmount(amount).valid) {
      showErrorMessage('Nieprawidłowa kwota');
      return;
    }
    
    try {
      showLoader(true);
      
      const incomes = getIncomes();
      incomes.push({
        id: Date.now().toString(),
        date: getWarsawDateString(),
        time: getCurrentTimeString(),
        amount,
        description: desc || 'Dodanie środków',
        user: getDisplayName() || user,
        planned: false
      });
      
      await saveIncomes(incomes);
      
      document.getElementById('addFundsAmount').value = '';
      document.getElementById('addFundsDesc').value = '';
      if (addContainer) addContainer.style.display = 'none';
      
      renderAll();
      showSuccessMessage('Środki dodane!');
    } catch (error) {
      showErrorMessage('Nie udało się dodać środków');
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
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      showErrorMessage('Funkcja dostępna tylko dla admina');
      return;
    }
    
    const date1 = document.getElementById('budgetEndDate1').value;
    const date2 = document.getElementById('budgetEndDate2').value;
    
    try {
      showLoader(true);
      await saveEndDates(date1, date2);
      renderAll();
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
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      showErrorMessage('Funkcja dostępna tylko dla admina');
      return;
    }
    
    const goal = parseFloat(document.getElementById('savingGoal').value);
    
    if (!validateAmount(goal).valid) {
      showErrorMessage('Nieprawidłowa kwota');
      return;
    }
    
    try {
      showLoader(true);
      await saveSavingGoal(goal);
      renderAll();
      showSuccessMessage('Cel zaktualizowany!');
    } catch (error) {
      showErrorMessage('Nie udało się zaktualizować celu');
    } finally {
      showLoader(false);
    }
  });
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
 * Funkcje globalne (dostępne z HTML)
 */
window.editCategory = (id) => {
  console.log('Edycja kategorii:', id);
};

window.deleteCategory = (id) => {
  console.log('Usuwanie kategorii:', id);
};

window.editExpense = (id) => {
  console.log('Edycja wydatku:', id);
};

window.deleteExpense = (id) => {
  console.log('Usuwanie wydatku:', id);
};

window.editIncome = (id) => {
  console.log('Edycja przychodu:', id);
};

window.deleteIncome = (id) => {
  console.log('Usuwanie przychodu:', id);
};

window.toggleIncomeStatus = (id) => {
  console.log('Zmiana statusu przychodu:', id);
};

console.log('✅ Aplikacja Krezus gotowa do działania!');