// src/components/modals.js
import { 
  getDisplayName, 
  updateUserProfile, 
  getCurrentUser,
  sendBudgetInvitation,
  getPendingInvitations,
  acceptBudgetInvitation,
  rejectBudgetInvitation,
  getMessages,
  markMessageAsRead,
  deleteMessage
} from '../modules/auth.js';
import { validateDisplayName, validateEmail } from '../utils/validators.js';
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
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
        
        <div class="invite-section">
          <h3 style="margin-bottom: 10px; font-size: 1.1rem; color: var(--primary);">
            📨 Zaproś do współdzielenia budżetu
          </h3>
          <form id="inviteForm">
            <div class="form-group">
              <label for="inviteEmail">Email użytkownika</label>
              <input 
                type="email" 
                id="inviteEmail" 
                required
                placeholder="email@example.com"
                aria-label="Email użytkownika do zaproszenia"
                aria-required="true"
              />
              <small>Wpisz email użytkownika, którego chcesz zaprosić</small>
            </div>
            
            <button 
              type="submit" 
              class="btn-primary"
              style="width: 100%;"
              aria-label="Wyślij zaproszenie"
            >
              ✉️ Wyślij zaproszenie
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
  
  return modal;
}

/**
 * Pokaż modal edycji profilu
 */
export function showProfileModal() {
  const existing = document.getElementById('profileModal');
  if (existing) {
    existing.remove();
  }
  
  const modal = createProfileModal();
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.classList.add('modal-visible');
    
    const firstInput = modal.querySelector('#profileDisplayName');
    if (firstInput) {
      firstInput.focus();
    }
  }, 10);
  
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
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Obsługa formularza profilu
  const form = modal.querySelector('#profileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const displayNameInput = modal.querySelector('#profileDisplayName');
    const newDisplayName = displayNameInput.value.trim();
    
    const validation = validateDisplayName(newDisplayName);
    if (!validation.valid) {
      showErrorMessage(validation.error);
      return;
    }
    
    try {
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Zapisywanie...';
      
      await updateUserProfile(newDisplayName);
      
      showSuccessMessage('Profil został zaktualizowany');
      closeModal();
      
      updateUserDisplayInUI(newDisplayName);
      
    } catch (error) {
      showErrorMessage('Nie udało się zaktualizować profilu: ' + error.message);
      
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  // Obsługa formularza zaproszenia
  const inviteForm = modal.querySelector('#inviteForm');
  inviteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = modal.querySelector('#inviteEmail');
    const email = emailInput.value.trim();
    
    const validation = validateEmail(email);
    if (!validation.valid) {
      showErrorMessage(validation.error);
      return;
    }
    
    try {
      const submitBtn = inviteForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Wysyłanie...';
      
      await sendBudgetInvitation(email);
      
      showSuccessMessage('Zaproszenie zostało wysłane!');
      emailInput.value = '';
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      
    } catch (error) {
      showErrorMessage(error.message || 'Nie udało się wysłać zaproszenia');
      
      const submitBtn = inviteForm.querySelector('button[type="submit"]');
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
 * Pokaż modal z zaproszeniami
 */
export async function showInvitationsModal() {
  const existing = document.getElementById('invitationsModal');
  if (existing) {
    existing.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'invitationsModal';
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'invitationsModalTitle');
  modal.setAttribute('aria-modal', 'true');
  
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h2 id="invitationsModalTitle">📬 Zaproszenia do budżetu</h2>
        <button 
          class="modal-close" 
          aria-label="Zamknij modal zaproszeń"
          type="button"
        >
          ✕
        </button>
      </div>
      <div class="modal-body">
        <div id="invitationsContent">
          <div style="text-align: center; padding: 20px;">
            <div class="spinner" style="margin: 0 auto;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.classList.add('modal-visible');
  }, 10);
  
  const closeBtn = modal.querySelector('.modal-close');
  const overlay = modal.querySelector('.modal-overlay');
  
  const closeModal = () => {
    modal.classList.remove('modal-visible');
    setTimeout(() => {
      modal.remove();
    }, ANIMATION_DELAYS.MODAL_FADE);
  };
  
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Załaduj zaproszenia
  try {
    const invitations = await getPendingInvitations();
    const contentDiv = modal.querySelector('#invitationsContent');
    
    if (invitations.length === 0) {
      contentDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
          <p style="color: #666; font-size: 1.1rem;">Brak oczekujących zaproszeń</p>
        </div>
      `;
    } else {
      contentDiv.innerHTML = invitations.map(inv => `
        <div class="invitation-card" data-id="${inv.id}" style="
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          background: #f9f9f9;
        ">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--primary), var(--secondary));
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 1.5rem;
              font-weight: bold;
            ">
              ${inv.fromDisplayName.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--primary); font-size: 1.1rem;">
                ${inv.fromDisplayName}
              </div>
              <div style="font-size: 0.9rem; color: #666;">
                ${inv.fromEmail}
              </div>
            </div>
          </div>
          
          <p style="margin: 10px 0; color: #333;">
            Zaprasza Cię do współdzielenia budżetu. Po akceptacji Twój budżet zostanie zastąpiony danymi z profilu <strong>${inv.fromDisplayName}</strong>.
          </p>
          
          <div style="font-size: 0.85rem; color: #999; margin-bottom: 15px;">
            Wysłane: ${new Date(inv.createdAt).toLocaleString('pl-PL')}
          </div>
          
          <div style="display: flex; gap: 10px;">
            <button 
              class="btn-primary accept-invite" 
              data-id="${inv.id}"
              style="flex: 1;"
            >
              ✅ Akceptuj
            </button>
            <button 
              class="btn-danger reject-invite" 
              data-id="${inv.id}"
              style="flex: 1;"
            >
              ❌ Odrzuć
            </button>
          </div>
        </div>
      `).join('');
      
      // Obsługa przycisków
      contentDiv.querySelectorAll('.accept-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
          const invId = btn.getAttribute('data-id');
          
          if (!confirm('Czy na pewno chcesz zaakceptować to zaproszenie? Twój obecny budżet zostanie zastąpiony.')) {
            return;
          }
          
          try {
            btn.disabled = true;
            btn.textContent = '⏳ Akceptowanie...';
            
            await acceptBudgetInvitation(invId);
            
            showSuccessMessage('Zaproszenie zaakceptowane! Przeładuj stronę aby zobaczyć zmiany.');
            
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
          } catch (error) {
            showErrorMessage(error.message || 'Nie udało się zaakceptować zaproszenia');
            btn.disabled = false;
            btn.textContent = '✅ Akceptuj';
          }
        });
      });
      
      contentDiv.querySelectorAll('.reject-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
          const invId = btn.getAttribute('data-id');
          
          if (!confirm('Czy na pewno chcesz odrzucić to zaproszenie?')) {
            return;
          }
          
          try {
            btn.disabled = true;
            btn.textContent = '⏳ Odrzucanie...';
            
            await rejectBudgetInvitation(invId);
            
            showSuccessMessage('Zaproszenie odrzucone');
            
            const card = btn.closest('.invitation-card');
            if (card) {
              card.style.animation = 'slideOut 0.3s ease-out';
              setTimeout(() => {
                card.remove();
                
                // Sprawdź czy są jeszcze zaproszenia
                const remaining = contentDiv.querySelectorAll('.invitation-card');
                if (remaining.length === 0) {
                  contentDiv.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                      <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                      <p style="color: #666; font-size: 1.1rem;">Brak oczekujących zaproszeń</p>
                    </div>
                  `;
                }
              }, 300);
            }
            
          } catch (error) {
            showErrorMessage(error.message || 'Nie udało się odrzucić zaproszenia');
            btn.disabled = false;
            btn.textContent = '❌ Odrzuć';
          }
        });
      });
    }
  } catch (error) {
    const contentDiv = modal.querySelector('#invitationsContent');
    contentDiv.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
        <p style="color: #666;">Nie udało się załadować zaproszeń</p>
      </div>
    `;
  }
}

/**
 * Pokaż modal z wiadomościami
 */
export async function showMessagesModal() {
  const existing = document.getElementById('messagesModal');
  if (existing) {
    existing.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'messagesModal';
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'messagesModalTitle');
  modal.setAttribute('aria-modal', 'true');
  
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2 id="messagesModalTitle">💌 Wiadomości</h2>
        <button 
          class="modal-close" 
          aria-label="Zamknij modal wiadomości"
          type="button"
        >
          ✕
        </button>
      </div>
      <div class="modal-body">
        <div id="messagesContent">
          <div style="text-align: center; padding: 20px;">
            <div class="spinner" style="margin: 0 auto;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.classList.add('modal-visible');
  }, 10);
  
  const closeBtn = modal.querySelector('.modal-close');
  const overlay = modal.querySelector('.modal-overlay');
  
  const closeModal = () => {
    modal.classList.remove('modal-visible');
    setTimeout(() => {
      modal.remove();
    }, ANIMATION_DELAYS.MODAL_FADE);
  };
  
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Załaduj wiadomości
  try {
    const messages = await getMessages();
    const contentDiv = modal.querySelector('#messagesContent');
    
    if (messages.length === 0) {
      contentDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">📪</div>
          <p style="color: #666; font-size: 1.1rem;">Brak wiadomości</p>
        </div>
      `;
    } else {
      contentDiv.innerHTML = messages.map(msg => {
        const isUnread = !msg.read;
        const iconMap = {
          'invitation_accepted': '✅',
          'invitation_rejected': '❌',
          'system': 'ℹ️'
        };
        const icon = iconMap[msg.type] || '💬';
        
        return `
          <div class="message-card" data-id="${msg.id}" style="
            border: 1px solid ${isUnread ? 'var(--primary)' : '#e0e0e0'};
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            background: ${isUnread ? '#f0f2ff' : '#f9f9f9'};
            ${isUnread ? 'box-shadow: 0 2px 8px rgba(108, 92, 231, 0.2);' : ''}
          ">
            <div style="display: flex; gap: 12px; align-items: start;">
              <div style="font-size: 1.8rem; flex-shrink: 0;">${icon}</div>
              <div style="flex: 1;">
                <div style="
                  font-weight: ${isUnread ? '600' : '400'};
                  color: ${isUnread ? 'var(--primary)' : '#333'};
                  margin-bottom: 8px;
                  line-height: 1.5;
                ">
                  ${msg.message}
                </div>
                <div style="font-size: 0.85rem; color: #999; margin-bottom: 10px;">
                  ${new Date(msg.createdAt).toLocaleString('pl-PL')}
                </div>
                <div style="display: flex; gap: 8px;">
                  ${isUnread ? `
                    <button 
                      class="mark-read-btn" 
                      data-id="${msg.id}"
                      style="
                        background: var(--primary);
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        font-size: 0.85rem;
                        cursor: pointer;
                      "
                    >
                      ✓ Oznacz jako przeczytane
                    </button>
                  ` : ''}
                  <button 
                    class="delete-msg-btn" 
                    data-id="${msg.id}"
                    style="
                      background: var(--danger);
                      color: white;
                      border: none;
                      padding: 6px 12px;
                      border-radius: 4px;
                      font-size: 0.85rem;
                      cursor: pointer;
                    "
                  >
                    🗑️ Usuń
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Obsługa przycisków oznaczania jako przeczytane
      contentDiv.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const msgId = btn.getAttribute('data-id');
          
          try {
            await markMessageAsRead(msgId);
            
            const card = btn.closest('.message-card');
            if (card) {
              card.style.border = '1px solid #e0e0e0';
              card.style.background = '#f9f9f9';
              card.style.boxShadow = 'none';
              
              const messageText = card.querySelector('div > div');
              if (messageText) {
                messageText.style.fontWeight = '400';
                messageText.style.color = '#333';
              }
              
              btn.remove();
            }
            
          } catch (error) {
            showErrorMessage('Nie udało się oznaczyć wiadomości');
          }
        });
      });
      
      // Obsługa przycisków usuwania
      contentDiv.querySelectorAll('.delete-msg-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const msgId = btn.getAttribute('data-id');
          
          if (!confirm('Czy na pewno chcesz usunąć tę wiadomość?')) {
            return;
          }
          
          try {
            await deleteMessage(msgId);
            
            const card = btn.closest('.message-card');
            if (card) {
              card.style.animation = 'slideOut 0.3s ease-out';
              setTimeout(() => {
                card.remove();
                
                const remaining = contentDiv.querySelectorAll('.message-card');
                if (remaining.length === 0) {
                  contentDiv.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                      <div style="font-size: 3rem; margin-bottom: 15px;">📪</div>
                      <p style="color: #666; font-size: 1.1rem;">Brak wiadomości</p>
                    </div>
                  `;
                }
              }, 300);
            }
            
          } catch (error) {
            showErrorMessage('Nie udało się usunąć wiadomości');
          }
        });
      });
    }
  } catch (error) {
    const contentDiv = modal.querySelector('#messagesContent');
    contentDiv.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
        <p style="color: #666;">Nie udało się załadować wiadomości</p>
      </div>
    `;
  }
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
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}