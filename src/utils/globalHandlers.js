// src/utils/globalHandlers.js
// Centralne zarządzanie funkcjami globalnymi (window.*)
// TODO: Docelowo usunąć wszystkie window.* i zastąpić event listenerami

/**
 * Rejestruje funkcje jako globalne na obiekcie window
 * Używane tymczasowo dla kompatybilności z onclick handlerami
 * Docelowo wszystkie te handlery powinny być zastąpione addEventListener
 */
export function registerGlobalHandlers(handlers) {
  Object.entries(handlers).forEach(([name, handler]) => {
    if (typeof handler === 'function') {
      window[name] = handler;
      console.warn(`⚠️ Registered global handler: window.${name} - consider migrating to addEventListener`);
    }
  });
}

/**
 * Usuwa zarejestrowane funkcje globalne
 */
export function unregisterGlobalHandlers(handlerNames) {
  handlerNames.forEach(name => {
    if (window[name]) {
      delete window[name];
    }
  });
}

/**
 * Lista wszystkich globalnych handlerów zarejestrowanych przez aplikację
 * Używana do debugowania i migracji
 */
export const REGISTERED_HANDLERS = [
  'onDisplayNameUpdate',
  'selectPeriod',
  'applyCustomPeriod',
  'selectCategory',
  'selectDescription',
  'selectSource',
  'changeExpensePage',
  'realiseExpense',
  'changeIncomePage',
  'realiseIncome',
  'editIncome',
  'deleteIncome',
  'addCategory',
  'editCategory',
  'deleteCategory',
  'addExpense',
  'editExpense',
  'deleteExpense',
  'addIncome',
  'addCorrection',
  'saveSettings',
  'changeLogPage',
  'clearLogs',
  'showSection',
  'openProfile',
  'handleLogin',
  'handleRegister',
  'handleLogout'
];
