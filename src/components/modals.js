// src/components/modals.js - Modale aplikacji Krezus v1.5.2
import { 
  getCurrentUser,
  getDisplayName,
  updateDisplayName,
  getBudgetUsers,
  addBudgetUser,
  updateBudgetUser,
  deleteBudgetUser,
  subscribeToBudgetUsers,
  loginUser
} from '../modules/auth.js';

import {
  getExpenses,
  getIncomes,
  saveExpenses,
  saveIncomes
} from '../modules/dataManager.js';

import { 
  showErrorMessage, 
  showSuccessMessage 
} from '../utils/errorHandler.js';

let budgetUsersUnsubscribe = null;

// ==================== MODAL PROFILU ====================

export async function showProfileModal() {
  const modal = document.getElementById('profileModal') || createProfileModal();
  const user = getCurrentUser();
  
  if (!user) {
    showErrorMessage('Musisz być zalogowany');
    return;
  }

  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileDisplayName').value = await getDisplayName(user.uid);

  await loadBudgetUsers(user.uid);

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

      <h3>👥 Użytkownicy budżetu</h3>
      <div id="budgetUsersList"></div>

      <form id="addBudgetUserForm" onsubmit="handleAddBudgetUser(event)" style="margin-top: 20px;">
        <div class="form-group">
          <label>Dodaj nowego użytkownika</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="newBudgetUserName" placeholder="Imię użytkownika" required minlength="2" style="flex: 1;">
            <button type="submit" class="btn btn-success">Dodaj</button>
          </div>
        </div>
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
  } catch (error) {
    console.error('❌ Błąd aktualizacji profilu:', error);
    showErrorMessage('Nie udało się zaktualizować profilu');
  }
};

// ==================== ZARZĄDZANIE UŻYTKOWNIKAMI BUDŻETU ====================

async function loadBudgetUsers(uid) {
  const container = document.getElementById('budgetUsersList');
  
  if (budgetUsersUnsubscribe) {
    budgetUsersUnsubscribe();
  }
  
  budgetUsersUnsubscribe = subscribeToBudgetUsers(uid, (users) => {
    if (users.length === 0) {
      container.innerHTML = '<p class="empty-state">Brak użytkowników</p>';
      return;
    }

    const html = users.map(user => {
      const isOwner = user.isOwner;
      return `
        <div class="budget-user-item">
          <div class="budget-user-info">
            <strong>${user.name}</strong>
            ${isOwner ? '<span class="owner-badge">Właściciel</span>' : ''}
          </div>
          <div class="budget-user-actions">
            ${!isOwner ? `
              <button class="btn-icon" onclick="handleEditBudgetUser('${user.id}', '${user.name}')" title="Edytuj">✏️</button>
              <button class="btn-icon" onclick="handleDeleteBudgetUser('${user.id}', '${user.name}')" title="Usuń">🗑️</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  });
}

window.handleAddBudgetUser = async (e) => {
  e.preventDefault();
  
  const user = getCurrentUser();
  if (!user) return;
  
  const input = document.getElementById('newBudgetUserName');
  const userName = input.value.trim();
  
  if (!userName || userName.length < 2) {
    showErrorMessage('Nazwa użytkownika musi mieć minimum 2 znaki');
    return;
  }
  
  try {
    await addBudgetUser(user.uid, userName);
    showSuccessMessage('Użytkownik dodany');
    input.value = '';
  } catch (error) {
    console.error('❌ Błąd dodawania użytkownika:', error);
    showErrorMessage('Nie udało się dodać użytkownika');
  }
};

window.handleEditBudgetUser = async (userId, currentName) => {
  const newName = prompt('Podaj nową nazwę użytkownika:', currentName);
  
  if (!newName || newName.trim() === '') return;
  
  const trimmed = newName.trim();
  
  if (trimmed.length < 2) {
    showErrorMessage('Nazwa musi mieć minimum 2 znaki');
    return;
  }
  
  const user = getCurrentUser();
  if (!user) return;
  
  try {
    await updateBudgetUser(user.uid, userId, { name: trimmed });
    showSuccessMessage('Użytkownik zaktualizowany');
  } catch (error) {
    console.error('❌ Błąd aktualizacji użytkownika:', error);
    showErrorMessage('Nie udało się zaktualizować użytkownika');
  }
};

window.handleDeleteBudgetUser = async (userId, userName) => {
  const user = getCurrentUser();
  if (!user) return;
  
  // Sprawdź ile transakcji ma użytkownik
  const expenses = getExpenses();
  const incomes = getIncomes();
  
  const userExpenses = expenses.filter(e => e.userId === userId);
  const userIncomes = incomes.filter(i => i.userId === userId);
  const totalTransactions = userExpenses.length + userIncomes.length;
  
  if (totalTransactions > 0) {
    const confirmed = await showPasswordModal(
      'Usuwanie użytkownika',
      `Użytkownik "${userName}" posiada ${totalTransactions} transakcji (${userExpenses.length} wydatków, ${userIncomes.length} przychodów). Wszystkie te transakcje zostaną TRWALE usunięte. Aby potwierdzić, podaj hasło głównego konta.`
    );
    
    if (!confirmed) return;
    
    // Usuń wszystkie transakcje użytkownika
    const updatedExpenses = expenses.filter(e => e.userId !== userId);
    const updatedIncomes = incomes.filter(i => i.userId !== userId);
    
    try {
      await saveExpenses(updatedExpenses);
      await saveIncomes(updatedIncomes);
      await deleteBudgetUser(user.uid, userId);
      showSuccessMessage('Użytkownik i wszystkie jego transakcje zostały usunięte');
    } catch (error) {
      console.error('❌ Błąd usuwania użytkownika:', error);
      showErrorMessage('Nie udało się usunąć użytkownika');
    }
  } else {
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika "${userName}"?`)) return;
    
    try {
      await deleteBudgetUser(user.uid, userId);
      showSuccessMessage('Użytkownik usunięty');
    } catch (error) {
      console.error('❌ Błąd usuwania użytkownika:', error);
      showErrorMessage(error.message || 'Nie udało się usunąć użytkownika');
    }
  }
};

// ==================== MODAL HASŁA ====================

export async function showPasswordModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('passwordModal') || createPasswordModal();
    
    document.getElementById('passwordModalTitle').textContent = title;
    document.getElementById('passwordModalMessage').textContent = message;
    document.getElementById('passwordModalInput').value = '';
    
    const form = document.getElementById('passwordModalForm');
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      const password = document.getElementById('passwordModalInput').value;
      const user = getCurrentUser();
      
      if (!user) {
        showErrorMessage('Musisz być zalogowany');
        resolve(false);
        closePasswordModal();
        return;
      }
      
      try {
        // Weryfikacja hasła poprzez ponowne logowanie
        await loginUser(user.email, password);
        showSuccessMessage('Hasło poprawne');
        resolve(true);
        closePasswordModal();
      } catch (error) {
        showErrorMessage('Nieprawidłowe hasło');
        document.getElementById('passwordModalInput').value = '';
        document.getElementById('passwordModalInput').focus();
      }
    };
    
    const handleCancel = () => {
      resolve(false);
      closePasswordModal();
    };
    
    form.onsubmit = handleSubmit;
    document.getElementById('passwordModalCancel').onclick = handleCancel;
    
    modal.classList.add('active');
    document.getElementById('passwordModalInput').focus();
  });
}

function createPasswordModal() {
  const modal = document.createElement('div');
  modal.id = 'passwordModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="passwordModalTitle">Potwierdź hasło</h2>
        <button class="modal-close" onclick="closePasswordModal()">✕</button>
      </div>
      
      <p id="passwordModalMessage" style="margin-bottom: 20px;"></p>
      
      <form id="passwordModalForm">
        <div class="form-group">
          <label>Wprowadź swoje hasło</label>
          <input type="password" id="passwordModalInput" required>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="passwordModalCancel" class="btn btn-secondary">Anuluj</button>
          <button type="submit" class="btn btn-primary">Potwierdź</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

function closePasswordModal() {
  const modal = document.getElementById('passwordModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==================== ZAMYKANIE MODALI ====================

window.closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    
    if (modalId === 'profileModal' && budgetUsersUnsubscribe) {
      budgetUsersUnsubscribe();
      budgetUsersUnsubscribe = null;
    }
  }
};

window.closePasswordModal = closePasswordModal;

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
    
    if (e.target.id === 'profileModal' && budgetUsersUnsubscribe) {
      budgetUsersUnsubscribe();
      budgetUsersUnsubscribe = null;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
      
      if (modal.id === 'profileModal' && budgetUsersUnsubscribe) {
        budgetUsersUnsubscribe();
        budgetUsersUnsubscribe = null;
      }
    });
  }
});