import { icon } from '@utils/icons.js';

const TOAST_TYPES = {
  error:   { cls: 'toast-error',   ic: 'X',             timeout: 5000 },
  warning: { cls: 'toast-warning', ic: 'AlertTriangle',  timeout: 5000 },
  info:    { cls: 'toast-info',    ic: 'Info',           timeout: 3000 },
  success: { cls: 'toast-success', ic: 'Check',          timeout: 3000 },
};

function showToast(message, type) {
  const cfg = TOAST_TYPES[type] ?? TOAST_TYPES.error;
  document.querySelector(`.toast[data-type="${type}"]`)?.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${cfg.cls}`;
  toast.dataset.type = type;
  toast.innerHTML = `<span class="toast-icon">${icon(cfg.ic, { size: 16, strokeWidth: 2 })}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, cfg.timeout);
}

export function showErrorMessage(message, type = 'error') {
  showToast(message, type);
}

export function showSuccessMessage(message) {
  showToast(message, 'success');
}

export function initGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('Globalny błąd:', event.error);
    showErrorMessage('Wystąpił nieoczekiwany błąd. Odśwież stronę i spróbuj ponownie.');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Niezłapany Promise rejection:', event.reason);
    showErrorMessage('Wystąpił błąd podczas przetwarzania danych.');
  });
}

export function logError(error, context = '') {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  console.error('Logged error:', errorInfo);
}

export async function withErrorHandling(fn, errorMessage = 'Wystąpił błąd') {
  try {
    return await fn();
  } catch (error) {
    logError(error, fn.name);
    showErrorMessage(errorMessage);
    throw error;
  }
}