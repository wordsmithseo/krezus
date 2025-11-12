// src/components/modals.js
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
  saveIncomes,
  getCategories,
  saveCategories
} from '../modules/dataManager.js';

import {
  showErrorMessage,
  showSuccessMessage
} from '../utils/errorHandler.js';

import {
  validateCategoryName,
  validateAmount
} from '../utils/validators.js';

import {
  log
} from '../modules/logger.js';

import {
  getWarsawDateString,
  getCurrentTimeString
} from '../utils/dateHelpers.js';

import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { showConfirmModal, showPromptModal } from './confirmModal.js';
import { getCategoryIcon } from '../utils/iconMapper.js';

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

    // Czyść kontener
    container.innerHTML = '';

    users.forEach(user => {
      const isOwner = user.isOwner;

      const itemDiv = document.createElement('div');
      itemDiv.className = 'budget-user-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'budget-user-info';

      const nameStrong = document.createElement('strong');
      nameStrong.textContent = user.name;
      infoDiv.appendChild(nameStrong);

      if (isOwner) {
        const ownerBadge = document.createElement('span');
        ownerBadge.className = 'owner-badge';
        ownerBadge.textContent = 'Właściciel';
        infoDiv.appendChild(ownerBadge);
      }

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'budget-user-actions';

      if (!isOwner) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon';
        editBtn.title = 'Edytuj';
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', () => window.handleEditBudgetUser(user.id, user.name));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon';
        deleteBtn.title = 'Usuń';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => window.handleDeleteBudgetUser(user.id, user.name));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
      }

      itemDiv.appendChild(infoDiv);
      itemDiv.appendChild(actionsDiv);
      container.appendChild(itemDiv);
    });
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
  const newName = await showPromptModal(
    'Edycja użytkownika budżetu',
    'Podaj nową nazwę użytkownika:',
    currentName,
    {
      placeholder: 'Nazwa użytkownika',
      validator: (value) => {
        if (!value || value.trim().length < 2) {
          return 'Nazwa musi mieć minimum 2 znaki';
        }
        return true;
      }
    }
  );

  if (!newName || newName.trim() === '') return;

  const trimmed = newName.trim();
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
    const confirmed = await showConfirmModal(
      'Usuwanie użytkownika',
      `Czy na pewno chcesz usunąć użytkownika "${userName}"?`,
      { type: 'danger', confirmText: 'Usuń', cancelText: 'Anuluj' }
    );

    if (!confirmed) return;

    try {
      await deleteBudgetUser(user.uid, userId);
      showSuccessMessage('Użytkownik usunięty');
    } catch (error) {
      console.error('❌ Błąd usuwania użytkownika:', error);
      showErrorMessage(error.message || 'Nie udało się usunąć użytkownika');
    }
  }
};

// ==================== MODAL EDYCJI KATEGORII ====================

export function showEditCategoryModal(categoryId, currentName) {
  const modal = document.getElementById('editCategoryModal') || createEditCategoryModal();

  document.getElementById('editCategoryId').value = categoryId;
  document.getElementById('editCategoryName').value = currentName;
  document.getElementById('editCategoryCurrentName').textContent = currentName;

  // Załaduj aktualną ikonę kategorii
  const categories = getCategories();
  const category = categories.find(c => c.id === categoryId);
  const currentIcon = category?.icon || getCategoryIcon(currentName);
  document.getElementById('editCategoryIcon').value = currentIcon;

  modal.classList.add('active');
  document.getElementById('editCategoryName').focus();
}

function createEditCategoryModal() {
  const modal = document.createElement('div');
  modal.id = 'editCategoryModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>✏️ Edytuj kategorię</h2>
        <button class="modal-close" onclick="closeModal('editCategoryModal')">✕</button>
      </div>

      <p style="margin-bottom: 20px; color: var(--gray);">
        Edytujesz kategorię: <strong id="editCategoryCurrentName"></strong>
      </p>

      <form id="editCategoryForm" onsubmit="handleEditCategory(event)">
        <input type="hidden" id="editCategoryId">

        <div class="form-row">
          <div class="form-group" style="flex: 2;">
            <label>Nowa nazwa kategorii</label>
            <input type="text" id="editCategoryName" required minlength="2" maxlength="50">
          </div>
          <div class="form-group" style="flex: 1;">
            <label>Ikona</label>
            <input type="text" id="editCategoryIcon" maxlength="2" style="font-size: 1.5rem; text-align: center;" placeholder="📌">
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('editCategoryModal')">Anuluj</button>
          <button type="submit" class="btn btn-primary">Zapisz</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

window.handleEditCategory = async (e) => {
  e.preventDefault();

  const categoryId = document.getElementById('editCategoryId').value;
  const newName = document.getElementById('editCategoryName').value.trim();
  const newIcon = document.getElementById('editCategoryIcon').value.trim();

  if (!validateCategoryName(newName)) {
    showErrorMessage('Nazwa kategorii musi mieć od 2 do 50 znaków');
    return;
  }

  const categories = getCategories();
  const currentCategory = categories.find(c => c.id === categoryId);

  if (!currentCategory) {
    showErrorMessage('Kategoria nie istnieje');
    return;
  }

  const oldName = currentCategory.name;

  if (categories.some(c => c.id !== categoryId && c.name.toLowerCase() === newName.toLowerCase())) {
    showErrorMessage('Kategoria o tej nazwie już istnieje');
    return;
  }

  const updatedCategories = categories.map(c =>
    c.id === categoryId ? { ...c, name: newName, icon: newIcon || getCategoryIcon(newName) } : c
  );

  const expenses = getExpenses();
  const updatedExpenses = expenses.map(e =>
    e.category === oldName ? { ...e, category: newName } : e
  );

  try {
    await saveCategories(updatedCategories);
    await saveExpenses(updatedExpenses);

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('CATEGORY_EDIT', {
      oldName,
      newName,
      icon: newIcon,
      budgetUser: displayName
    });

    closeModal('editCategoryModal');
    showSuccessMessage('Kategoria zaktualizowana');
  } catch (error) {
    console.error('❌ Błąd edycji kategorii:', error);
    showErrorMessage('Nie udało się zaktualizować kategorii');
  }
};

// ==================== MODAL EDYCJI WYDATKU ====================

export async function showEditExpenseModal(expense, budgetUsers, onSave) {
  const modal = document.getElementById('editExpenseModal') || createEditExpenseModal();

  document.getElementById('editExpenseAmount').value = expense.amount;
  document.getElementById('editExpenseDate').value = expense.date;
  document.getElementById('editExpenseType').value = expense.type || 'normal';
  document.getElementById('editExpenseTime').value = expense.time || '';
  document.getElementById('editExpenseCategory').value = expense.category;
  document.getElementById('editExpenseDescription').value = expense.description;

  const userSelect = document.getElementById('editExpenseUser');
  userSelect.innerHTML = '<option value="">Wybierz użytkownika</option>' +
    budgetUsers.map(user =>
      `<option value="${user.id}" ${user.id === expense.userId ? 'selected' : ''}>${user.name}${user.isOwner ? ' (Właściciel)' : ''}</option>`
    ).join('');

  // Załaduj budżety celowe
  const { getBudgetStatistics } = await import('../modules/purposeBudgetManager.js');
  const budgets = getBudgetStatistics();
  const budgetSelect = document.getElementById('editExpensePurposeBudget');
  budgetSelect.innerHTML = budgets.map(budget => {
    const available = budget.remaining.toFixed(2);
    return `<option value="${budget.id}" ${budget.id === expense.purposeBudgetId ? 'selected' : ''}>${budget.name} (dostępne: ${available} zł)</option>`;
  }).join('');

  const categoriesDatalist = document.getElementById('editExpenseCategoriesDatalist');
  const categories = getCategories();
  categoriesDatalist.innerHTML = categories.map(cat => `<option value="${cat.name}">`).join('');
  
  toggleEditExpenseTypeFields();
  
  const form = document.getElementById('editExpenseForm');
  form.onsubmit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('editExpenseAmount').value);
    const type = document.getElementById('editExpenseType').value;
    const userId = document.getElementById('editExpenseUser').value;
    const purposeBudgetId = document.getElementById('editExpensePurposeBudget').value;
    const category = document.getElementById('editExpenseCategory').value.trim();
    const description = document.getElementById('editExpenseDescription').value.trim();

    if (!validateAmount(amount)) {
      showErrorMessage('Kwota musi być większa od 0');
      return;
    }

    if (!userId) {
      showErrorMessage('Wybierz użytkownika');
      return;
    }

    if (!purposeBudgetId) {
      showErrorMessage('Wybierz budżet celowy');
      return;
    }

    // Waliduj dostępność środków w budżecie celowym (tylko dla normalnych wydatków)
    if (type === 'normal') {
      const { canSpendFromBudget } = await import('../modules/purposeBudgetManager.js');
      const validation = canSpendFromBudget(purposeBudgetId, amount, expense.id);
      if (!validation.canSpend) {
        showErrorMessage(validation.message);
        return;
      }
    }

    if (!category) {
      showErrorMessage('Podaj kategorię');
      return;
    }

    if (!description) {
      showErrorMessage('Podaj opis');
      return;
    }

    const updatedExpense = {
      ...expense,
      amount,
      type,
      userId,
      purposeBudgetId,
      category,
      description,
      date: type === 'normal' ? expense.date : document.getElementById('editExpenseDate').value,
      time: type === 'normal' ? expense.time : (document.getElementById('editExpenseTime').value || '')
    };

    closeModal('editExpenseModal');
    await onSave(updatedExpense);
  };
  
  modal.classList.add('active');
  document.getElementById('editExpenseAmount').focus();
}

function createEditExpenseModal() {
  const modal = document.createElement('div');
  modal.id = 'editExpenseModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>✏️ Edytuj wydatek</h2>
        <button class="modal-close" onclick="closeModal('editExpenseModal')">✕</button>
      </div>
      
      <form id="editExpenseForm">
        <div class="form-row">
          <div class="form-group">
            <label>Kwota (zł)</label>
            <input type="number" id="editExpenseAmount" step="0.01" required>
          </div>
          <div class="form-group">
            <label>Typ transakcji</label>
            <select id="editExpenseType" required onchange="toggleEditExpenseTypeFields()">
              <option value="normal">Zwykły</option>
              <option value="planned">Planowany</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group" id="editExpenseDateGroup">
            <label>Data</label>
            <input type="date" id="editExpenseDate" required>
          </div>
          <div class="form-group" id="editExpenseTimeGroup">
            <label>Godzina (opcjonalnie)</label>
            <input type="time" id="editExpenseTime">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Użytkownik</label>
            <select id="editExpenseUser" required>
              <option value="">Wybierz użytkownika</option>
            </select>
          </div>
          <div class="form-group">
            <label>Budżet celowy</label>
            <select id="editExpensePurposeBudget" required>
              <option value="">Ładowanie...</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Kategoria</label>
            <input type="text" id="editExpenseCategory" list="editExpenseCategoriesDatalist" required autocomplete="off">
            <datalist id="editExpenseCategoriesDatalist"></datalist>
          </div>
        </div>
        
        <div class="form-group">
          <label>Opis</label>
          <input type="text" id="editExpenseDescription" required autocomplete="off">
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('editExpenseModal')">Anuluj</button>
          <button type="submit" class="btn btn-primary">Zapisz zmiany</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

window.toggleEditExpenseTypeFields = function() {
  const type = document.getElementById('editExpenseType').value;
  const dateGroup = document.getElementById('editExpenseDateGroup');
  const timeGroup = document.getElementById('editExpenseTimeGroup');
  
  if (type === 'normal') {
    dateGroup.style.display = 'none';
    timeGroup.style.display = 'none';
  } else {
    dateGroup.style.display = 'block';
    timeGroup.style.display = 'block';
  }
};

// ==================== MODAL EDYCJI PRZYCHODU ====================

export function showEditIncomeModal(income, budgetUsers, onSave) {
  const modal = document.getElementById('editIncomeModal') || createEditIncomeModal();
  
  document.getElementById('editIncomeAmount').value = income.amount;
  document.getElementById('editIncomeDate').value = income.date;
  document.getElementById('editIncomeType').value = income.type || 'normal';
  document.getElementById('editIncomeTime').value = income.time || '';
  document.getElementById('editIncomeSource').value = income.source || '';
  
  const userSelect = document.getElementById('editIncomeUser');
  userSelect.innerHTML = '<option value="">Wybierz użytkownika</option>' +
    budgetUsers.map(user => 
      `<option value="${user.id}" ${user.id === income.userId ? 'selected' : ''}>${user.name}${user.isOwner ? ' (Właściciel)' : ''}</option>`
    ).join('');
  
  toggleEditIncomeTypeFields();
  
  const form = document.getElementById('editIncomeForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('editIncomeAmount').value);
    const type = document.getElementById('editIncomeType').value;
    const userId = document.getElementById('editIncomeUser').value;
    const source = document.getElementById('editIncomeSource').value.trim();
    
    if (!validateAmount(amount)) {
      showErrorMessage('Kwota musi być większa od 0');
      return;
    }

    if (!userId) {
      showErrorMessage('Wybierz użytkownika');
      return;
    }

    const updatedIncome = {
      ...income,
      amount,
      type,
      userId,
      source,
      date: document.getElementById('editIncomeDate').value,
      time: document.getElementById('editIncomeTime').value || ''
    };
    
    closeModal('editIncomeModal');
    await onSave(updatedIncome);
  };
  
  modal.classList.add('active');
  document.getElementById('editIncomeAmount').focus();
}

function createEditIncomeModal() {
  const modal = document.createElement('div');
  modal.id = 'editIncomeModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>✏️ Edytuj przychód</h2>
        <button class="modal-close" onclick="closeModal('editIncomeModal')">✕</button>
      </div>
      
      <form id="editIncomeForm">
        <div class="form-row">
          <div class="form-group">
            <label>Kwota (zł)</label>
            <input type="number" id="editIncomeAmount" step="0.01" required>
          </div>
          <div class="form-group">
            <label>Typ transakcji</label>
            <select id="editIncomeType" required onchange="toggleEditIncomeTypeFields()">
              <option value="normal">Zwykły</option>
              <option value="planned">Planowany</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Data</label>
            <input type="date" id="editIncomeDate" required>
          </div>
          <div class="form-group">
            <label>Godzina (opcjonalnie)</label>
            <input type="time" id="editIncomeTime">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Użytkownik</label>
            <select id="editIncomeUser" required>
              <option value="">Wybierz użytkownika</option>
            </select>
          </div>
          <div class="form-group">
            <label>Źródło</label>
            <input type="text" id="editIncomeSource" placeholder="np. Wynagrodzenie" autocomplete="off">
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('editIncomeModal')">Anuluj</button>
          <button type="submit" class="btn btn-primary">Zapisz zmiany</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

window.toggleEditIncomeTypeFields = function() {
  const type = document.getElementById('editIncomeType').value;
  const dateGroup = document.querySelector('#editIncomeDate')?.closest('.form-group');
  const timeGroup = document.querySelector('#editIncomeTime')?.closest('.form-group');
  
  if (!dateGroup || !timeGroup) return;
  
  if (type === 'normal') {
    dateGroup.style.display = 'none';
    timeGroup.style.display = 'none';
  } else {
    dateGroup.style.display = 'block';
    timeGroup.style.display = 'block';
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

// ==================== MODAL DODAWANIA/EDYCJI BUDŻETU CELOWEGO ====================

export async function showPurposeBudgetModal(budget = null) {
  const modal = document.getElementById('purposeBudgetModal') || createPurposeBudgetModal();
  const isEditing = !!budget;

  document.getElementById('purposeBudgetModalTitle').textContent = isEditing ? '✏️ Edytuj budżet celowy' : '➕ Dodaj budżet celowy';
  document.getElementById('purposeBudgetName').value = isEditing ? budget.name : '';

  // Wyświetl informację o dostępnych środkach
  const { calculateAvailableFunds } = await import('../modules/budgetCalculator.js');
  const { getPurposeBudgets } = await import('../modules/dataManager.js');
  const { available } = calculateAvailableFunds();
  const budgets = getPurposeBudgets();
  const totalBudgeted = budgets
    .filter(b => b.name !== 'Ogólny' && !(isEditing && b.id === budget.id))
    .reduce((sum, b) => sum + b.amount, 0);
  const availableForBudgets = available - totalBudgeted;

  const infoElement = document.getElementById('purposeBudgetAvailableInfo');
  infoElement.textContent = `Dostępne środki na budżety: ${availableForBudgets.toFixed(2)} zł`;
  infoElement.style.color = availableForBudgets > 0 ? '#4CAF50' : '#f44336';

  // Ustaw wartości formularza
  if (isEditing) {
    document.getElementById('purposeBudgetAmount').value = budget.amount;
    document.getElementById('purposeBudgetPercent').value = ((budget.amount / available) * 100).toFixed(1);
  } else {
    document.getElementById('purposeBudgetAmount').value = '';
    document.getElementById('purposeBudgetPercent').value = '';
  }

  // Obsługa przełączania między kwotą a procentem
  const typeSelect = document.getElementById('purposeBudgetType');
  const amountGroup = document.getElementById('purposeBudgetAmountGroup');
  const percentGroup = document.getElementById('purposeBudgetPercentGroup');

  typeSelect.value = 'amount';
  amountGroup.style.display = 'block';
  percentGroup.style.display = 'none';

  typeSelect.onchange = () => {
    if (typeSelect.value === 'amount') {
      amountGroup.style.display = 'block';
      percentGroup.style.display = 'none';
      document.getElementById('purposeBudgetAmount').required = true;
      document.getElementById('purposeBudgetPercent').required = false;
    } else {
      amountGroup.style.display = 'none';
      percentGroup.style.display = 'block';
      document.getElementById('purposeBudgetAmount').required = false;
      document.getElementById('purposeBudgetPercent').required = true;
    }
  };

  const form = document.getElementById('purposeBudgetForm');
  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('purposeBudgetName').value.trim();
    const type = document.getElementById('purposeBudgetType').value;

    let amount;
    if (type === 'amount') {
      amount = parseFloat(document.getElementById('purposeBudgetAmount').value);
    } else {
      const percent = parseFloat(document.getElementById('purposeBudgetPercent').value);
      if (isNaN(percent) || percent <= 0 || percent > 100) {
        showErrorMessage('Procent musi być między 0 a 100');
        return;
      }
      amount = (available * percent) / 100;
    }

    if (!name) {
      showErrorMessage('Podaj nazwę budżetu');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      showErrorMessage('Kwota musi być większa od 0');
      return;
    }

    try {
      if (isEditing) {
        const { updatePurposeBudget } = await import('../modules/purposeBudgetManager.js');
        await updatePurposeBudget(budget.id, name, amount);
        showSuccessMessage('Budżet celowy zaktualizowany');
      } else {
        const { createPurposeBudget } = await import('../modules/purposeBudgetManager.js');
        await createPurposeBudget(name, amount);
        showSuccessMessage('Budżet celowy utworzony');
      }

      closeModal('purposeBudgetModal');

      // Odśwież widok budżetów
      if (window.renderPurposeBudgets) {
        window.renderPurposeBudgets();
      }
      if (window.renderSummary) {
        window.renderSummary();
      }
      if (window.setupPurposeBudgetSelect) {
        window.setupPurposeBudgetSelect();
      }
    } catch (error) {
      console.error('❌ Błąd zapisu budżetu celowego:', error);
      showErrorMessage(error.message || 'Nie udało się zapisać budżetu celowego');
    }
  };

  modal.classList.add('active');
  document.getElementById('purposeBudgetName').focus();
}

function createPurposeBudgetModal() {
  const modal = document.createElement('div');
  modal.id = 'purposeBudgetModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2 id="purposeBudgetModalTitle">➕ Dodaj budżet celowy</h2>
        <button class="modal-close" onclick="closeModal('purposeBudgetModal')">✕</button>
      </div>

      <p id="purposeBudgetAvailableInfo" style="margin-bottom: 20px; font-weight: bold;"></p>

      <form id="purposeBudgetForm">
        <div class="form-group">
          <label>Nazwa budżetu</label>
          <input type="text" id="purposeBudgetName" required maxlength="50" placeholder="np. Wakacje, Remont, Prezenty">
        </div>

        <div class="form-group">
          <label>Określ budżet jako</label>
          <select id="purposeBudgetType">
            <option value="amount">Kwota w złotych</option>
            <option value="percent">Procent dostępnych środków</option>
          </select>
        </div>

        <div class="form-group" id="purposeBudgetAmountGroup">
          <label>Kwota (zł)</label>
          <input type="number" id="purposeBudgetAmount" step="0.01" min="0.01">
        </div>

        <div class="form-group" id="purposeBudgetPercentGroup" style="display: none;">
          <label>Procent (%)</label>
          <input type="number" id="purposeBudgetPercent" step="0.1" min="0.1" max="100">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('purposeBudgetModal')">Anuluj</button>
          <button type="submit" class="btn btn-primary">Zapisz</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
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