// src/components/confirmModal.js
import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';

/**
 * Pokazuje modal potwierdzenia (zamiana dla confirm())
 * @param {string} title - Tytuł modalu
 * @param {string} message - Wiadomość
 * @param {Object} options - Opcje (confirmText, cancelText, type)
 * @returns {Promise<boolean>} - true jeśli potwierdzono, false jeśli anulowano
 */
export function showConfirmModal(title, message, options = {}) {
  return new Promise((resolve) => {
    const {
      confirmText = 'Potwierdź',
      cancelText = 'Anuluj',
      type = 'warning' // 'warning', 'danger', 'info'
    } = options;

    // Usuń istniejące modale potwierdzenia
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10001';

    const typeColors = {
      warning: '#f39c12',
      danger: '#e74c3c',
      info: '#3498db'
    };

    const typeIcons = {
      warning: '⚠️',
      danger: '🗑️',
      info: 'ℹ️'
    };

    const html = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header" style="background-color: ${typeColors[type]}; color: white;">
          <h2>${typeIcons[type]} ${escapeHTML(title)}</h2>
        </div>
        <div class="modal-body">
          <p style="font-size: 1.1rem; line-height: 1.6;">${escapeHTML(message)}</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 20px;">
          <button class="btn btn-secondary" data-action="cancel">${escapeHTML(cancelText)}</button>
          <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;

    modal.innerHTML = sanitizeHTML(html);
    document.body.appendChild(modal);

    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');

    const cleanup = () => {
      modal.remove();
    };

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // ESC zamyka modal
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Kliknięcie w tło zamyka modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });
  });
}

/**
 * Pokazuje modal z inputem (zamiana dla prompt())
 * @param {string} title - Tytuł modalu
 * @param {string} message - Wiadomość
 * @param {string} defaultValue - Domyślna wartość
 * @param {Object} options - Opcje (placeholder, confirmText, cancelText)
 * @returns {Promise<string|null>} - wartość inputa lub null jeśli anulowano
 */
export function showPromptModal(title, message, defaultValue = '', options = {}) {
  return new Promise((resolve) => {
    const {
      placeholder = '',
      confirmText = 'OK',
      cancelText = 'Anuluj',
      inputType = 'text',
      validator = null
    } = options;

    const existingModal = document.getElementById('promptModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'promptModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10001';

    const html = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>${escapeHTML(title)}</h2>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 15px;">${escapeHTML(message)}</p>
          <input
            type="${inputType}"
            class="form-control"
            id="promptInput"
            value="${escapeHTML(defaultValue)}"
            placeholder="${escapeHTML(placeholder)}"
            style="width: 100%; padding: 10px; font-size: 1rem;"
          />
          <div id="promptError" style="color: #e74c3c; margin-top: 10px; display: none;"></div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 20px;">
          <button class="btn btn-secondary" data-action="cancel">${escapeHTML(cancelText)}</button>
          <button class="btn btn-primary" data-action="confirm">${escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;

    modal.innerHTML = sanitizeHTML(html);
    document.body.appendChild(modal);

    const input = modal.querySelector('#promptInput');
    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const errorDiv = modal.querySelector('#promptError');

    const cleanup = () => {
      modal.remove();
    };

    const handleConfirm = () => {
      const value = input.value.trim();

      // Walidacja
      if (validator) {
        const validationResult = validator(value);
        if (validationResult !== true) {
          errorDiv.textContent = validationResult;
          errorDiv.style.display = 'block';
          return;
        }
      }

      cleanup();
      resolve(value);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    // Enter potwierdza
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleConfirm();
      }
    });

    // ESC anuluje
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Focus na input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
  });
}
