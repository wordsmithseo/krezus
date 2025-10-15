// src/components/modals.js
import { getDisplayName, updateUserProfile, getCurrentUser } from '../modules/auth.js';
import { validateDisplayName } from '../utils/validators.js';
import { showSuccessMessage, showErrorMessage } from '../utils/errorHandler.js';
import { ANIMATION_DELAYS } from '../utils/constants.js';

/**
 * Utwórz modal edycji profilu
 */
export function createProfileModal() {
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'profileModalTitle');
  modal.setAttribute('aria-modal', 'true');
  
  const user = getCurrentUser();
  const currentDisplayName = getDisplayName();
  const email = user ? user.email : '';
  
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="profileModalTitle">Edycja profilu</h2>
        <button 
          class="modal-close" 
          aria-label="Zamknij modal edycji profilu"
          type="button"
        >
          ✕
        </button>
      </div>
      <div class="modal-body">
        <form id="profileForm">
          <div class="form-group">
            <label for="profileEmail">Email</label>
            <input 
              type="email" 
              id="profileEmail" 
              value="${email}" 
              disabled 
              readonly
              aria-label="Adres email użytkownika"
            />
            <small>Email nie może być zmieniony</small>
          </div>
          
          <div class="form-group">
            <label for="profileDisplayName">Nazwa użytkownika</label>
            <input 
              type="text" 
              id="profileDisplayName" 
              value="${currentDisplayName}" 
              required
              minlength="2"
              maxlength="50"
              aria-label="Nazwa wyświetlana użytkownika"
              aria-required="true"
            />
            <small>Ta nazwa będzie używana w aplikacji</small>
          </div>
          
          <div class="modal-actions">
            <button 
              type="submit" 
              class="btn-primary"
              aria-label="Zapisz zmiany profilu"
            >
              💾 Zapisz
            </button>
            <button 
              type="button" 
              class="btn-secondary modal-cancel"
              aria-label="Anuluj edycję profilu"
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  return modal;
}

/**
 * Pokaż modal edycji profilu
 */
export function showProfileModal() {
  // Usuń istniejący modal jeśli jest
  const existing = document.getElementById('profileModal');
  if (existing) {
    existing.remove();
  }
  
  const modal = createProfileModal();
  document.body.appendChild(modal);
  
  // Pokaż modal z animacją
  setTimeout(() => {
    modal.classList.add('modal-visible');
    
    // Focus na pierwszym polu input
    const firstInput = modal.querySelector('#profileDisplayName');
    if (firstInput) {
      firstInput.focus();
    }
  }, 10);
  
  // Obsługa zamknięcia modala
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.modal-cancel');
  const overlay = modal.querySelector('.modal-overlay');
  
  const closeModal = () => {
    modal.classList.remove('modal-visible');
    setTimeout(() => {
      modal.remove();
    }, ANIMATION_DELAYS.MODAL_FADE);
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  
  // Zamknij modal klawiszem Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Obsługa formularza
  const form = modal.querySelector('#profileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const displayNameInput = modal.querySelector('#profileDisplayName');
    const newDisplayName = displayNameInput.value.trim();
    
    // Walidacja
    const validation = validateDisplayName(newDisplayName);
    if (!validation.valid) {
      showErrorMessage(validation.error);
      return;
    }
    
    try {
      // Pokaż loading
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Zapisywanie...';
      
      await updateUserProfile(newDisplayName);
      
      showSuccessMessage('Profil został zaktualizowany');
      closeModal();
      
      // Odśwież wyświetlane dane użytkownika w interfejsie
      updateUserDisplayInUI(newDisplayName);
      
    } catch (error) {
      showErrorMessage('Nie udało się zaktualizować profilu: ' + error.message);
      
      // Przywróć przycisk
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

/**
 * Aktualizuj wyświetlaną nazwę użytkownika w interfejsie
 */
function updateUserDisplayInUI(displayName) {
  const userNameElements = document.querySelectorAll('.user-display-name');
  userNameElements.forEach(el => {
    el.textContent = displayName;
  });
}

/**
 * Utwórz modal potwierdzenia
 */
export function createConfirmModal(title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal confirm-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'confirmModalTitle');
  modal.setAttribute('aria-modal', 'true');
  
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content modal-sm">
      <div class="modal-header">
        <h2 id="confirmModalTitle">${title}</h2>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-actions">
        <button 
          type="button" 
          class="btn-danger confirm-yes"
          aria-label="Potwierdź akcję"
        >
          Tak
        </button>
        <button 
          type="button" 
          class="btn-secondary confirm-no"
          aria-label="Anuluj akcję"
        >
          Nie
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.classList.add('modal-visible');
  }, 10);
  
  const closeModal = () => {
    modal.classList.remove('modal-visible');
    setTimeout(() => {
      modal.remove();
    }, ANIMATION_DELAYS.MODAL_FADE);
  };
  
  const yesBtn = modal.querySelector('.confirm-yes');
  const noBtn = modal.querySelector('.confirm-no');
  const overlay = modal.querySelector('.modal-overlay');
  
  yesBtn.addEventListener('click', () => {
    onConfirm();
    closeModal();
  });
  
  noBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  
  // Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}