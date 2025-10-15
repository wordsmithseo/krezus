// src/utils/errorHandler.js

/**
 * Wyświetl komunikat błędu użytkownikowi
 * @param {string} message - Wiadomość błędu
 * @param {string} type - Typ błędu ('error', 'warning', 'info')
 */
export function showErrorMessage(message, type = 'error') {
  // Usuń poprzednie komunikaty błędów
  const existingError = document.querySelector('.error-toast');
  if (existingError) {
    existingError.remove();
  }
  
  const colors = {
    error: '#c0392b',
    warning: '#f39c12',
    info: '#3498db'
  };
  
  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${colors[type] || colors.error};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.2rem;">${icons[type] || icons.error}</span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Automatycznie usuń po 5 sekundach
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Wyświetl komunikat sukcesu
 * @param {string} message - Wiadomość sukcesu
 */
export function showSuccessMessage(message) {
  const existingSuccess = document.querySelector('.success-toast');
  if (existingSuccess) {
    existingSuccess.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.2rem;">✅</span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Globalna obsługa błędów aplikacji
 */
export function initGlobalErrorHandler() {
  // Obsługa niezłapanych błędów
  window.addEventListener('error', (event) => {
    console.error('Globalny błąd:', event.error);
    showErrorMessage('Wystąpił nieoczekiwany błąd. Odśwież stronę i spróbuj ponownie.');
  });
  
  // Obsługa niezłapanych Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Niezłapany Promise rejection:', event.reason);
    showErrorMessage('Wystąpił błąd podczas przetwarzania danych.');
  });
}

/**
 * Logger błędów (można rozszerzyć o wysyłanie do serwera)
 * @param {Error} error - Obiekt błędu
 * @param {string} context - Kontekst wystąpienia błędu
 */
export function logError(error, context = '') {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  console.error('Logged error:', errorInfo);
  
  // TODO: Można dodać wysyłanie do Firebase Analytics lub innego serwisu
}

/**
 * Wrapper dla funkcji asynchronicznych z obsługą błędów
 * @param {Function} fn - Funkcja asynchroniczna
 * @param {string} errorMessage - Niestandardowa wiadomość błędu
 */
export async function withErrorHandling(fn, errorMessage = 'Wystąpił błąd') {
  try {
    return await fn();
  } catch (error) {
    logError(error, fn.name);
    showErrorMessage(errorMessage);
    throw error;
  }
}