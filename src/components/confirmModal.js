// src/components/confirmModal.js
import { escapeHTML } from '../utils/sanitizer.js';

/**
 * Modal potwierdzenia — spójny z resztą design systemu appki.
 * @param {string} title
 * @param {string} message
 * @param {{ confirmText?, cancelText?, type? }} options  type: 'danger' | 'warning' | 'info'
 * @returns {Promise<boolean>}
 */
export function showConfirmModal(title, message, options = {}) {
  return new Promise((resolve) => {
    const {
      confirmText = 'Potwierdź',
      cancelText  = 'Anuluj',
      type        = 'warning',
    } = options;

    const existing = document.getElementById('confirmModal');
    if (existing) existing.remove();

    const confirmCls = type === 'danger' ? 'btn btn-danger' : 'btn accent';

    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10001';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h3>${escapeHTML(title)}</h3>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:var(--ink-2);line-height:1.6;margin:0">${escapeHTML(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" data-action="cancel">${escapeHTML(cancelText)}</button>
          <button class="${confirmCls}" data-action="confirm">${escapeHTML(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    const cancelBtn  = modal.querySelector('[data-action="cancel"]');

    const done = (result) => { modal.remove(); resolve(result); };

    confirmBtn.addEventListener('click', () => done(true));
    cancelBtn.addEventListener('click',  () => done(false));
    modal.addEventListener('click', (e) => { if (e.target === modal) done(false); });

    const onKey = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); done(false); }
    };
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => confirmBtn.focus());
  });
}

/**
 * Modal z inputem — spójny z resztą design systemu appki.
 * @param {string} title
 * @param {string} message
 * @param {string} defaultValue
 * @param {{ placeholder?, confirmText?, cancelText?, inputType?, validator? }} options
 * @returns {Promise<string|null>}
 */
export function showPromptModal(title, message, defaultValue = '', options = {}) {
  return new Promise((resolve) => {
    const {
      placeholder  = '',
      confirmText  = 'OK',
      cancelText   = 'Anuluj',
      inputType    = 'text',
      validator    = null,
    } = options;

    const existing = document.getElementById('promptModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'promptModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10001';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h3>${escapeHTML(title)}</h3>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
          ${message ? `<p style="font-size:13px;color:var(--ink-2);line-height:1.6;margin:0">${escapeHTML(message)}</p>` : ''}
          <input type="${escapeHTML(inputType)}" class="input" id="promptInput"
            value="${escapeHTML(defaultValue)}"
            placeholder="${escapeHTML(placeholder)}">
          <div id="promptError" style="display:none;font-size:12px;color:var(--danger);margin-top:-4px"></div>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" data-action="cancel">${escapeHTML(cancelText)}</button>
          <button class="btn accent" data-action="confirm">${escapeHTML(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const input      = modal.querySelector('#promptInput');
    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    const cancelBtn  = modal.querySelector('[data-action="cancel"]');
    const errorDiv   = modal.querySelector('#promptError');

    const done = (value) => { modal.remove(); resolve(value); };

    const handleConfirm = () => {
      const value = input.value.trim();
      if (validator) {
        const result = validator(value);
        if (result !== true) {
          errorDiv.textContent = result;
          errorDiv.style.display = 'block';
          return;
        }
      }
      done(value);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click',  () => done(null));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleConfirm(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) done(null); });

    const onKey = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); done(null); }
    };
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}
