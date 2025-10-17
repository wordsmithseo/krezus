// src/components/modals.js - Modale aplikacji Krezus
import { 
  getCurrentUser,
  getDisplayName,
  updateDisplayName,
  getUserMessages,
  markMessageAsRead,
  deleteMessage,
  sendBudgetInvitation,
  respondToInvitation
} from '../modules/auth.js';

import { 
  showErrorMessage, 
  showSuccessMessage 
} from '../utils/errorHandler.js';

// ==================== MODAL PROFILU ====================

export async function showProfileModal() {
  const modal = document.getElementById('profileModal') || createProfileModal();
  const user = getCurrentUser();
  
  if (!user) {
    showErrorMessage('Musisz być zalogowany');
    return;
  }

  // Wypełnij dane profilu
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileDisplayName').value = await getDisplayName(user.uid);

  modal.classList.add('active');
}

function createProfileModal() {
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>👤 Twój profil</h2>
        <button class="modal-close" onclick="closeModal('profileModal')">✕</button>
      </div>
      
      <div class="form-group">
        <label>Email</label>
        <p id="profileEmail" style="color: var(--gray);"></p>
      </div>

      <form id="profileForm" onsubmit="handleProfileUpdate(event)">
        <div class="form-group">
          <label>Nazwa użytkownika</label>
          <input type="text" id="profileDisplayName" required minlength="2">
        </div>
        
        <button type="submit" class="btn btn-primary">Zapisz zmiany</button>
      </form>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid var(--border);">

      <h3>📧 Zaproś użytkownika do współdzielenia budżetu</h3>
      <form id="inviteForm" onsubmit="handleSendInvitation(event)">
        <div class="form-group">
          <label>Adres email użytkownika</label>
          <input type="email" id="inviteEmail" required placeholder="nazwa@email.com">
        </div>
        <button type="submit" class="btn btn-success">Wyślij zaproszenie</button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

window.handleProfileUpdate = async (e) => {
  e.preventDefault();
  
  const user = getCurrentUser();
  if (!user) return;

  const newDisplayName = document.getElementById('profileDisplayName').value.trim();
  
  if (!newDisplayName || newDisplayName.length < 2) {
    showErrorMessage('Nazwa użytkownika musi mieć minimum 2 znaki');
    return;
  }

  try {
    await updateDisplayName(user.uid, newDisplayName);
    showSuccessMessage('Nazwa użytkownika zaktualizowana');
    closeModal('profileModal');
  } catch (error) {
    console.error('❌ Błąd aktualizacji profilu:', error);
    showErrorMessage('Nie udało się zaktualizować profilu');
  }
};

window.handleSendInvitation = async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('inviteEmail').value.trim();
  
  if (!email) {
    showErrorMessage('Podaj adres email');
    return;
  }

  try {
    await sendBudgetInvitation(email);
    showSuccessMessage('Zaproszenie wysłane pomyślnie');
    document.getElementById('inviteEmail').value = '';
  } catch (error) {
    console.error('❌ Błąd wysyłania zaproszenia:', error);
    showErrorMessage(error.message || 'Nie udało się wysłać zaproszenia');
  }
};

// ==================== MODAL WIADOMOŚCI ====================

export async function showMessagesModal() {
  const modal = document.getElementById('messagesModal') || createMessagesModal();
  const user = getCurrentUser();
  
  if (!user) {
    showErrorMessage('Musisz być zalogowany');
    return;
  }

  // Załaduj wiadomości
  await loadMessages(user.uid);

  modal.classList.add('active');
}

function createMessagesModal() {
  const modal = document.createElement('div');
  modal.id = 'messagesModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>✉️ Wiadomości</h2>
        <button class="modal-close" onclick="closeModal('messagesModal')">✕</button>
      </div>
      
      <div id="messagesList"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

async function loadMessages(uid) {
  const container = document.getElementById('messagesList');
  
  try {
    const messages = await getUserMessages(uid);
    
    if (messages.length === 0) {
      container.innerHTML = '<p class="empty-state">Brak wiadomości</p>';
      return;
    }

    const html = messages.map(msg => {
      if (msg.type === 'budget_invitation') {
        return renderInvitationMessage(msg);
      } else if (msg.type === 'invitation_response') {
        return renderResponseMessage(msg);
      } else {
        return renderGenericMessage(msg);
      }
    }).join('');

    container.innerHTML = html;

  } catch (error) {
    console.error('❌ Błąd ładowania wiadomości:', error);
    container.innerHTML = '<p class="empty-state">Błąd ładowania wiadomości</p>';
  }
}

function renderInvitationMessage(msg) {
  const isPending = msg.status === 'pending';
  const date = new Date(msg.createdAt).toLocaleString('pl-PL');
  
  return `
    <div class="message-item ${msg.read ? '' : 'unread'}">
      <div class="message-header">
        <div>
          <strong class="message-from">📧 Zaproszenie do współdzielenia budżetu</strong>
          <div class="message-date">${date}</div>
        </div>
        <button class="btn-icon" onclick="handleDeleteMessage('${msg.id}')" title="Usuń">🗑️</button>
      </div>
      
      <div class="message-content">
        <p><strong>${msg.from.displayName}</strong> (${msg.from.email}) zaprasza Cię do współdzielenia budżetu.</p>
        ${isPending ? '<p><em>Po zaakceptowaniu Twój obecny budżet zostanie zastąpiony budżetem nadawcy.</em></p>' : ''}
      </div>
      
      ${isPending ? `
        <div class="message-actions">
          <button class="btn btn-success" onclick="handleRespondToInvitation('${msg.id}', true)">
            ✓ Zaakceptuj
          </button>
          <button class="btn btn-danger" onclick="handleRespondToInvitation('${msg.id}', false)">
            ✕ Odrzuć
          </button>
        </div>
      ` : `
        <div class="message-content">
          <p><strong>Status:</strong> ${msg.status === 'accepted' ? '✓ Zaakceptowane' : '✕ Odrzucone'}</p>
        </div>
      `}
    </div>
  `;
}

function renderResponseMessage(msg) {
  const date = new Date(msg.createdAt).toLocaleString('pl-PL');
  const icon = msg.accepted ? '✅' : '❌';
  
  return `
    <div class="message-item ${msg.read ? '' : 'unread'}">
      <div class="message-header">
        <div>
          <strong class="message-from">${icon} Odpowiedź na zaproszenie</strong>
          <div class="message-date">${date}</div>
        </div>
        <button class="btn-icon" onclick="handleDeleteMessage('${msg.id}')" title="Usuń">🗑️</button>
      </div>
      
      <div class="message-content">
        <p><strong>${msg.from.displayName}</strong> ${msg.message}</p>
      </div>
      
      ${!msg.read ? `
        <button class="btn btn-secondary" onclick="handleMarkAsRead('${msg.id}')">
          Oznacz jako przeczytane
        </button>
      ` : ''}
    </div>
  `;
}

function renderGenericMessage(msg) {
  const date = new Date(msg.createdAt).toLocaleString('pl-PL');
  
  return `
    <div class="message-item ${msg.read ? '' : 'unread'}">
      <div class="message-header">
        <div>
          <strong class="message-from">📨 Wiadomość</strong>
          <div class="message-date">${date}</div>
        </div>
        <button class="btn-icon" onclick="handleDeleteMessage('${msg.id}')" title="Usuń">🗑️</button>
      </div>
      
      <div class="message-content">
        <p>${msg.message || 'Brak treści'}</p>
      </div>
    </div>
  `;
}

// ==================== AKCJE WIADOMOŚCI ====================

window.handleRespondToInvitation = async (invitationId, accept) => {
  const user = getCurrentUser();
  if (!user) return;

  try {
    await respondToInvitation(invitationId, accept);
    showSuccessMessage(accept ? 'Zaproszenie zaakceptowane' : 'Zaproszenie odrzucone');
    
    // Odśwież listę wiadomości
    await loadMessages(user.uid);
    
    // Jeśli zaakceptowano, przeładuj aplikację aby załadować nowy budżet
    if (accept) {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  } catch (error) {
    console.error('❌ Błąd odpowiadania na zaproszenie:', error);
    showErrorMessage(error.message || 'Nie udało się odpowiedzieć na zaproszenie');
  }
};

window.handleMarkAsRead = async (messageId) => {
  const user = getCurrentUser();
  if (!user) return;

  try {
    await markMessageAsRead(user.uid, messageId);
    await loadMessages(user.uid);
  } catch (error) {
    console.error('❌ Błąd oznaczania wiadomości:', error);
    showErrorMessage('Nie udało się oznaczyć wiadomości');
  }
};

window.handleDeleteMessage = async (messageId) => {
  if (!confirm('Czy na pewno chcesz usunąć tę wiadomość?')) return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    await deleteMessage(user.uid, messageId);
    showSuccessMessage('Wiadomość usunięta');
    await loadMessages(user.uid);
  } catch (error) {
    console.error('❌ Błąd usuwania wiadomości:', error);
    showErrorMessage('Nie udało się usunąć wiadomości');
  }
};

// ==================== ZAMYKANIE MODALI ====================

window.closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
};

// Zamknij modal klikając poza nim
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// Zamknij modal klawiszem ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }
});