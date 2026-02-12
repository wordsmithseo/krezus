// src/utils/globalHandlers.js
// Centralne zarządzanie funkcjami globalnymi (window.*)

/**
 * Rejestruje funkcje jako globalne na obiekcie window
 * Używane tymczasowo dla kompatybilności z onclick handlerami
 * Docelowo wszystkie te handlery powinny być zastąpione addEventListener
 */
export function registerGlobalHandlers(handlers) {
  Object.entries(handlers).forEach(([name, handler]) => {
    if (typeof handler === 'function') {
      window[name] = handler;
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
 * Lista globalnych handlerów pozostających na window
 * Większość została przeniesiona do event delegation (data-action) lub addEventListener
 */
export const REGISTERED_HANDLERS = [
  'onDisplayNameUpdate' // Wywoływany z auth.js - jedyny pozostały window handler
];
