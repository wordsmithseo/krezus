// src/app.js
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
  autoRealiseDueTransactions,
  subscribeToRealtimeUpdates,
  getCategories,
  getExpenses,
  getIncomes,
  getEndDates,
  getSavingGoal,
  saveCategories,
  saveExpenses,
  saveIncomes,
  saveEndDates,
  saveSavingGoal
} from './modules/dataManager.js';

import {
  calculateRealisedTotals,
  calculateSpendingPeriods,
  calculateDailyLimits,
  calculateForecastLimits,
  computeSourcesRemaining,
  checkAnomalies,
  calculateSpendingGauge,
  getTopCategories,
  getTopDescriptionsForCategory,
  computeComparisons,
  getGlobalMedian30d,
  updateDailyEnvelope
} from './modules/budgetCalculator.js';

import { 
  showProfileModal 
} from './components/modals.js';

import {
  getWarsawDateString,
  getCurrentTimeString,
  getDaysLeftFor,
  formatDateLabel,
  parseDateTime,
  isRealised
} from './utils/dateHelpers.js';

import {
  validateAmount,
  validateDate,
  validateQuantity,
  validateCategoryName,
  validateEmail,
  validatePassword,
  attachValidator
} from './utils/validators.js';

import {
  showErrorMessage,
  showSuccessMessage,
  initGlobalErrorHandler,
  logError,
  withErrorHandling
} from './utils/errorHandler.js';

import {
  PAGINATION,
  DAILY_ENVELOPE,
  ANIMATION_DELAYS
} from './utils/constants.js';

/**
 * Stan aplikacji
 */
let currentIncomePage = 1;
let currentExpensePage = 1;
let isAdmin = false;
let categoryChart = null;
let comparisonsChart = null;

/**
 * Inicjalizacja aplikacji
 */
async function initApp() {
  // Inicjalizuj globalną obsługę błędów
  initGlobalErrorHandler();
  
  // Nasłuchuj zmian stanu uwierzytelniania
  onAuthChange(async (authState) => {
    if (authState.user) {
      // Użytkownik zalogowany
      isAdmin = authState.isAdmin;
      await showMainApp();
    } else {
      // Użytkownik niezalogowany
      showAuthScreen();
    }
  });
  
  // Konfiguruj formularz uwierzytelniania
  setupAuthForm();
}

/**
 * Pokaż ekran uwierzytelniania
 */
function showAuthScreen() {
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('appContainer').style.display = 'none';
}

/**
 * Pokaż główną aplikację
 */
async function showMainApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  
  // Aktualizuj nazwę użytkownika w UI
  const displayName = getDisplayName();
  document.querySelectorAll('.user-display-name').forEach(el => {
    el.textContent = displayName;
  });
  
  // Pokaż loader
  showLoader(true);
  
  try {
    // Załaduj wszystkie dane
    await fetchAllData();
    
    // Automatycznie realizuj przeterminowane transakcje
    await autoRealiseDueTransactions();
    
    // Zaktualizuj kopertę dnia
    if (DAILY_ENVELOPE.ENABLED) {
      await updateDailyEnvelope();
    }
    
    // Renderuj interfejs
    renderAll();
    
    // Skonfiguruj obsługę formularzy
    setupForms();
    
    // Skonfiguruj nasłuchiwanie zmian w czasie rzeczywistym
    setupRealtimeUpdates();
    
    // Ukryj loader
    showLoader(false);
  } catch (error) {
    logError(error, 'showMainApp');
    showErrorMessage('Wystąpił błąd podczas ładowania aplikacji');
    showLoader(false);
  }
}

/**
 * Konfiguracja formularza uwierzytelniania
 */
function setupAuthForm() {
  const form = document.getElementById('authForm');
  const toggleLink = document.getElementById('authToggleLink');
  let isLoginMode = true;
  
  // Przełączanie między logowaniem a rejestracją
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmit');
    const toggleText = document.getElementById('authToggleText');
    
    if (isLoginMode) {
      title.textContent = 'Logowanie';
      submitBtn.innerHTML = '🔐 Zaloguj się';
      toggleText.textContent = 'Nie masz konta?';
      toggleLink.textContent = 'Zarejestruj się';
    } else {
      title.textContent = 'Rejestracja';
      submitBtn.innerHTML = '📝 Zarejestruj się';
      toggleText.textContent = 'Masz już konto?';
      toggleLink.textContent = 'Zaloguj się';
    }
  });
  
  // Obsługa wysłania formularza
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    // Walidacja
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      showErrorMessage(emailValidation.error);
      return;
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      showErrorMessage(passwordValidation.error);
      return;
    }
    
    const submitBtn = document.getElementById('authSubmit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Przetwarzanie...';
    
    try {
      if (isLoginMode) {
        await loginUser(email, password);
        showSuccessMessage('Zalogowano pomyślnie!');
      } else {
        await registerUser(email, password);
        showSuccessMessage('Konto zostało utworzone!');
      }
      
      // Wyczyść formularz
      form.reset();
    } catch (error) {
      showErrorMessage(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  // Dodaj walidatory do pól
  attachValidator(document.getElementById('authEmail'), validateEmail);
  attachValidator(document.getElementById('authPassword'), validatePassword);
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
 * Renderuj wszystkie komponenty
 */
function renderAll() {
  renderSummary();
  renderSources();
  renderIncomeHistory();
  renderCategories();
  renderExpenseHistory();
  renderCategoryChart();
  renderComparisons();
  updateAdminUI();
  populateCategoryMonthDropdown();
  updateCategorySuggestions();
  updateDescriptionSuggestions();
}

/**
 * Konfiguracja nasłuchiwania zmian w czasie rzeczywistym
 */
function setupRealtimeUpdates() {
  subscribeToRealtimeUpdates({
    onCategoriesChange: async () => {
      await autoRealiseDueTransactions();
      renderCategories();
      renderSummary();
      flashElement('#categories');
      flashElement('#summary-section');
    },
    onExpensesChange: async () => {
      await autoRealiseDueTransactions();
      currentExpensePage = 1;
      renderCategories();
      renderExpenseHistory();
      renderSummary();
      flashElement('#expense-history');
      flashElement('#summary-section');
    },
    onIncomesChange: async () => {
      await autoRealiseDueTransactions();
      if (DAILY_ENVELOPE.ENABLED) {
        await updateDailyEnvelope();
      }
      currentIncomePage = 1;
      renderIncomeHistory();
      renderSources();
      renderSummary();
      flashElement('#income-history');
      flashElement('#summary-section');
    },
    onEndDatesChange: async () => {
      const endDates = getEndDates();
      const input1 = document.getElementById('budgetEndDate1');
      const input2 = document.getElementById('budgetEndDate2');
      if (input1) input1.value = endDates.primary;
      if (input2) input2.value = endDates.secondary;
      
      if (DAILY_ENVELOPE.ENABLED) {
        await updateDailyEnvelope();
      }
      
      renderSummary();
      flashElement('#summary-section');
    },
    onSavingGoalChange: async () => {
      const savingGoal = getSavingGoal();
      const input = document.getElementById('savingGoal');
      if (input) input.value = savingGoal;
      
      if (DAILY_ENVELOPE.ENABLED) {
        await updateDailyEnvelope();
      }
      
      renderSummary();
      flashElement('#summary-section');
    }
  });
}

/**
 * Dodaj efekt flash do elementu
 */
function flashElement(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add('flash-update');
    setTimeout(() => {
      el.classList.remove('flash-update');
    }, ANIMATION_DELAYS.FLASH);
  }
}

/**
 * Wyświetl feedback sukcesu (confetti + scroll)
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
  
  showSuccessMessage('Operacja zakończona pomyślnie');
}

// Inicjalizuj aplikację po załadowaniu DOM
document.addEventListener('DOMContentLoaded', initApp);