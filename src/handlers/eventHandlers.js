// src/handlers/eventHandlers.js
// Centralne zarządzanie event handlerami - zastępuje inline handlery

/**
 * Inicjalizuje event listenery dla nawigacji
 */
export function initNavigationHandlers(showSectionCallback) {
  const navButtons = document.querySelectorAll('[data-section]');

  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = button.dataset.section;
      if (sectionId && showSectionCallback) {
        showSectionCallback(sectionId);
      }
    });
  });

  // Hamburger menu dla mobile
  const hamburger = document.querySelector('.nav-hamburger');
  const navMenu = document.getElementById('navMenu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
  }
}

/**
 * Inicjalizuje event listenery dla formularzy
 */
export function initFormHandlers(handlers) {
  const {
    onLogin,
    onRegister,
    onLogout,
    onAddCategory,
    onAddExpense,
    onAddIncome,
    onAddCorrection,
    onSaveSettings
  } = handlers;

  // Formularz logowania
  const loginForm = document.getElementById('loginForm');
  if (loginForm && onLogin) {
    loginForm.addEventListener('submit', onLogin);
  }

  // Formularz rejestracji
  const registerForm = document.getElementById('registerForm');
  if (registerForm && onRegister) {
    registerForm.addEventListener('submit', onRegister);
  }

  // Przycisk wylogowania
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && onLogout) {
    logoutBtn.addEventListener('click', onLogout);
  }

  // Formularz kategorii
  const categoryForm = document.getElementById('categoryForm');
  if (categoryForm && onAddCategory) {
    categoryForm.addEventListener('submit', onAddCategory);
  }

  // Formularz wydatków
  const expenseForm = document.getElementById('expenseForm');
  if (expenseForm && onAddExpense) {
    expenseForm.addEventListener('submit', onAddExpense);
  }

  // Formularz przychodów
  const incomeForm = document.getElementById('incomeForm');
  if (incomeForm && onAddIncome) {
    incomeForm.addEventListener('submit', onAddIncome);
  }

  // Formularz korekty
  const correctionForm = document.getElementById('correctionForm');
  if (correctionForm && onAddCorrection) {
    correctionForm.addEventListener('submit', onAddCorrection);
  }

  // Formularz ustawień
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm && onSaveSettings) {
    settingsForm.addEventListener('submit', onSaveSettings);
  }
}

/**
 * Inicjalizuje listenery dla zakładek auth (logowanie/rejestracja)
 */
export function initAuthTabHandlers() {
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const tabName = button.textContent.includes('Logowanie') ? 'login' : 'register';
      showAuthTab(tabName);
    });
  });
}

/**
 * Pokazuje zakładkę auth
 */
export function showAuthTab(tabName) {
  // Ukryj wszystkie zakładki
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Pokaż wybraną zakładkę
  if (tabName === 'login') {
    document.getElementById('loginTab')?.classList.add('active');
    document.querySelectorAll('.tab-btn')[0]?.classList.add('active');
  } else {
    document.getElementById('registerTab')?.classList.add('active');
    document.querySelectorAll('.tab-btn')[1]?.classList.add('active');
  }
}

/**
 * Inicjalizuje listenery dla przycisków okresu analityki
 */
export function initAnalyticsPeriodHandlers(onSelectPeriod, onApplyCustomPeriod) {
  const periodButtons = document.querySelectorAll('.period-btn:not(:last-child)');

  periodButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const days = [7, 30, 90][index];
      if (onSelectPeriod) {
        onSelectPeriod(days);
      }
    });
  });

  // Przycisk custom period
  const customButton = document.querySelector('.period-btn:last-child');
  if (customButton) {
    customButton.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
      customButton.classList.add('active');
      const customInputs = document.getElementById('customPeriodInputs');
      if (customInputs) customInputs.style.display = 'block';
    });
  }

  // Przycisk apply custom period
  const applyButton = document.getElementById('applyCustomPeriodBtn');
  if (applyButton && onApplyCustomPeriod) {
    applyButton.addEventListener('click', onApplyCustomPeriod);
  }
}
