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
  loginUser,
  sendPasswordReset
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

import { recordActivity } from '../modules/presence.js';

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
import { getCategoryIcon, getSourceIcon } from '../utils/iconMapper.js';
import { icon } from '../utils/icons.js';
import { Fmt } from '../utils/fmt.js';
import { userChipHTML } from '../ui/chips.js';

let budgetUsersUnsubscribe = null;

// ==================== MODAL PROFILU ====================

export async function showProfileModal() {
  const modal = document.getElementById('profileModal') || createProfileModal();
  const user = getCurrentUser();
  
  if (!user) {
    showErrorMessage('Musisz być zalogowany');
    return;
  }

  const resetBtn = document.getElementById('sendPasswordResetBtn');
  resetBtn.onclick = async () => {
    try {
      await sendPasswordReset(user.email);
      showSuccessMessage(`Link do zmiany hasła wysłany na ${user.email}`);
    } catch {
      showErrorMessage('Nie udało się wysłać linku do zmiany hasła');
    }
  };

  await loadBudgetUsers(user.uid);

  modal.classList.add('active');
}

function createProfileModal() {
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:520px">
      <div class="modal-header">
        <h3>Profil i użytkownicy</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('profileModal')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:20px">
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:8px">Bezpieczeństwo</div>
          <button type="button" class="btn sm" id="sendPasswordResetBtn">Wyślij link do zmiany hasła</button>
        </div>
        <hr class="divider" style="margin:0">
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:12px">Użytkownicy budżetu</div>
          <div id="budgetUsersList"></div>
          <form id="addBudgetUserForm" onsubmit="window.handleAddBudgetUser(event)" style="margin-top:12px">
            <div class="field">
              <label>Dodaj użytkownika</label>
              <div style="display:flex;gap:8px">
                <input type="text" id="newBudgetUserName" placeholder="Imię użytkownika" required minlength="2" style="flex:1">
                <button type="submit" class="btn accent sm">Dodaj</button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" onclick="window.closeModal('profileModal')">Zamknij</button>
      </div>
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
      itemDiv.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)';

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-size:13px;font-weight:500;flex:1';
      nameSpan.textContent = escapeHTML(user.name);
      itemDiv.appendChild(nameSpan);

      if (isOwner) {
        const badge = document.createElement('span');
        badge.className = 'tag';
        badge.textContent = 'Właściciel';
        itemDiv.appendChild(badge);
      } else {
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display:flex;gap:4px';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn ghost icon-only sm';
        editBtn.title = 'Edytuj';
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editBtn.addEventListener('click', () => window.handleEditBudgetUser(user.id, user.name));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn ghost icon-only sm';
        deleteBtn.title = 'Usuń';
        deleteBtn.style.color = 'var(--danger)';
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
        deleteBtn.addEventListener('click', () => window.handleDeleteBudgetUser(user.id, user.name));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        itemDiv.appendChild(actionsDiv);
      }

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

    const displayName = await getDisplayName(user.uid);
    await log('BUDGET_USER_ADD', {
      userName,
      budgetUser: displayName
    });

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

    const displayName = await getDisplayName(user.uid);
    await log('BUDGET_USER_EDIT', {
      oldName: currentName,
      newName: trimmed,
      budgetUser: displayName
    });

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

      const displayName = await getDisplayName(user.uid);
      await log('BUDGET_USER_DELETE', {
        userName,
        deletedTransactions: totalTransactions,
        budgetUser: displayName
      });

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

      const displayName = await getDisplayName(user.uid);
      await log('BUDGET_USER_DELETE', {
        userName,
        deletedTransactions: 0,
        budgetUser: displayName
      });

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
  const titleEl = document.getElementById('editCategoryTitle');
  if (titleEl) titleEl.textContent = `Edytuj: ${currentName}`;

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
        <h3 id="editCategoryTitle">Edytuj kategorię</h3>
        <button class="btn ghost icon-only sm modal-close" onclick="closeModal('editCategoryModal')" aria-label="Zamknij">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <form id="editCategoryForm" onsubmit="handleEditCategory(event)">
        <input type="hidden" id="editCategoryId">
        <div style="display:flex;flex-direction:column;padding:20px;gap:16px">
          <div class="field">
            <label>Nazwa</label>
            <input class="input" type="text" id="editCategoryName" required minlength="2" maxlength="50" placeholder="np. Hobby"/>
          </div>
          <div class="field">
            <label>Ikona (emoji)</label>
            <input class="input" type="text" id="editCategoryIcon" maxlength="2" placeholder="🎨"/>
            <div class="hint">Możesz pominąć — wybierzemy automatycznie na podstawie nazwy</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="closeModal('editCategoryModal')">Anuluj</button>
          <button type="submit" class="btn accent">Zapisz</button>
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

  const sanitizedName = escapeHTML(newName);

  const updatedCategories = categories.map(c =>
    c.id === categoryId ? { ...c, name: sanitizedName, icon: newIcon || getCategoryIcon(newName) } : c
  );

  const expenses = getExpenses();
  const updatedExpenses = expenses.map(e =>
    e.category === oldName ? { ...e, category: sanitizedName } : e
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
    const category = escapeHTML(document.getElementById('editExpenseCategory').value.trim());
    const description = escapeHTML(document.getElementById('editExpenseDescription').value.trim());

    if (!validateAmount(amount)) {
      showErrorMessage('Kwota musi być większa od 0');
      return;
    }

    if (!userId) {
      showErrorMessage('Wybierz użytkownika');
      return;
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
    <div class="modal-content" style="max-width:540px">
      <div class="modal-header">
        <h3>Edytuj wydatek</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('editExpenseModal')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <form id="editExpenseForm">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field">
              <label>Kwota (zł)</label>
              <input type="number" id="editExpenseAmount" step="0.01" required class="num">
            </div>
            <div class="field">
              <label>Typ transakcji</label>
              <select id="editExpenseType" required onchange="window.toggleEditExpenseTypeFields()">
                <option value="normal">Zwykły</option>
                <option value="planned">Planowany</option>
              </select>
            </div>
            <div class="field" id="editExpenseDateGroup">
              <label>Data</label>
              <input type="date" id="editExpenseDate" required>
            </div>
            <div class="field" id="editExpenseTimeGroup">
              <label>Godzina (opcjonalnie)</label>
              <input type="time" id="editExpenseTime">
            </div>
            <div class="field full">
              <label>Użytkownik</label>
              <select id="editExpenseUser" required>
                <option value="">Wybierz użytkownika</option>
              </select>
            </div>
            <div class="field full">
              <label>Kategoria</label>
              <input type="text" id="editExpenseCategory" list="editExpenseCategoriesDatalist" required autocomplete="off">
              <datalist id="editExpenseCategoriesDatalist"></datalist>
            </div>
            <div class="field full">
              <label>Opis</label>
              <input type="text" id="editExpenseDescription" required autocomplete="off">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="window.closeModal('editExpenseModal')">Anuluj</button>
          <button type="submit" class="btn accent">Zapisz zmiany</button>
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
    const source = escapeHTML(document.getElementById('editIncomeSource').value.trim());
    
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
    <div class="modal-content" style="max-width:540px">
      <div class="modal-header">
        <h3>Edytuj przychód</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('editIncomeModal')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <form id="editIncomeForm">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field">
              <label>Kwota (zł)</label>
              <input type="number" id="editIncomeAmount" step="0.01" required class="num">
            </div>
            <div class="field">
              <label>Typ transakcji</label>
              <select id="editIncomeType" required onchange="window.toggleEditIncomeTypeFields()">
                <option value="normal">Zwykły</option>
                <option value="planned">Planowany</option>
              </select>
            </div>
            <div class="field" id="editIncomeDateField">
              <label>Data</label>
              <input type="date" id="editIncomeDate" required>
            </div>
            <div class="field" id="editIncomeTimeField">
              <label>Godzina (opcjonalnie)</label>
              <input type="time" id="editIncomeTime">
            </div>
            <div class="field full">
              <label>Użytkownik</label>
              <select id="editIncomeUser" required>
                <option value="">Wybierz użytkownika</option>
              </select>
            </div>
            <div class="field full">
              <label>Źródło</label>
              <input type="text" id="editIncomeSource" placeholder="np. Wynagrodzenie" autocomplete="off">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="window.closeModal('editIncomeModal')">Anuluj</button>
          <button type="submit" class="btn accent">Zapisz zmiany</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

window.toggleEditIncomeTypeFields = function() {
  const type = document.getElementById('editIncomeType').value;
  const dateGroup = document.getElementById('editIncomeDateField');
  const timeGroup = document.getElementById('editIncomeTimeField');

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
    <div class="modal-content" style="max-width:420px">
      <div class="modal-header">
        <h3 id="passwordModalTitle">Potwierdź hasło</h3>
        <button class="btn ghost icon-only" onclick="window.closePasswordModal()"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <form id="passwordModalForm">
        <div class="modal-body" style="display:flex;flex-direction:column;gap:16px">
          <p id="passwordModalMessage" style="font-size:13px;color:var(--ink-2);margin:0"></p>
          <div class="field">
            <label>Wprowadź swoje hasło</label>
            <input type="password" id="passwordModalInput" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="passwordModalCancel" class="btn">Anuluj</button>
          <button type="submit" class="btn accent">Potwierdź</button>
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

// ==================== MODAL: NOWA KATEGORIA ====================

export function showAddCategoryModal() {
  let modal = document.getElementById('addCategoryModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'addCategoryModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nowa kategoria</h3>
          <button class="btn ghost icon-only" onclick="window.closeModal('addCategoryModal')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:16px">
          <div class="field">
            <label>Nazwa</label>
            <input type="text" id="newCategoryNameModal" placeholder="np. Hobby" minlength="2" maxlength="30">
          </div>
          <div class="field">
            <label>Ikona (emoji)</label>
            <input type="text" id="newCategoryIconModal" maxlength="2" placeholder="🎨">
            <div class="hint">Możesz pominąć — wybierzemy automatycznie na podstawie nazwy</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="window.closeModal('addCategoryModal')">Anuluj</button>
          <button type="button" class="btn accent" data-action="add-category">Dodaj kategorię</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) window.closeModal('addCategoryModal'); });
  }
  modal.classList.add('active');
  setTimeout(() => document.getElementById('newCategoryNameModal')?.focus(), 50);
}

// ==================== MODAL SZCZEGÓŁÓW WYDATKU ====================

export function showExpenseDetailsModal(expense, { getBudgetUserName, onEdit } = {}) {
  const modalId = 'expenseDetailsModal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const cat = getCategories().find(c => c.name === expense.category) || null;
  const catIcon = cat?.icon || getCategoryIcon(expense.category || '');
  const userName = getBudgetUserName ? getBudgetUserName(expense.userId) : (expense.userId || '—');

  const iconCal   = icon('Calendar', { size: 15, strokeWidth: 1.75 });
  const iconTag   = icon('Tag',      { size: 15, strokeWidth: 1.75 });
  const iconText  = icon('Edit',     { size: 15, strokeWidth: 1.75 });
  const iconUser  = icon('User',     { size: 15, strokeWidth: 1.75 });

  const ICON_COL  = 'width:28px;flex-shrink:0;color:var(--ink-3);display:flex;align-items:center;justify-content:center;padding-top:1px';
  const ROW_STYLE = 'display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)';
  const LABEL     = 'font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);font-weight:500;margin-bottom:2px';

  const statusTag = expense.type === 'planned'
    ? '<span class="tag info dot">Planowany</span>'
    : '<span class="tag success dot">Zrealizowany</span>';

  const wasPlannedTag = expense.wasPlanned
    ? '<span class="tag" style="margin-left:6px;background:color-mix(in srgb,var(--info,#6c9) 12%,var(--surface));color:var(--ink-2)">Było planowane</span>'
    : '';

  const catHtml = cat
    ? `<span style="display:inline-flex;align-items:center;gap:5px">${catIcon ? `<span>${escapeHTML(catIcon)}</span>` : ''}${escapeHTML(cat.name)}</span>`
    : (expense.category ? escapeHTML(expense.category) : '<span style="color:var(--ink-3)">—</span>');

  const userHtml = expense.userId && userName
    ? userChipHTML({ id: expense.userId, name: userName })
    : '<span style="color:var(--ink-3)">—</span>';

  const timeStr = expense.time ? `<span style="color:var(--ink-3);margin-left:8px">${escapeHTML(expense.time)}</span>` : '';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:440px">
      <div class="modal-header">
        <h3>Szczegóły wydatku</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('expenseDetailsModal')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div style="background:var(--surface-2);border-radius:10px;padding:18px 20px;text-align:center;margin-bottom:20px">
          <div style="font-size:30px;font-weight:700;letter-spacing:-.02em;color:var(--danger)">−${Fmt.zl(expense.amount)}</div>
          <div style="margin-top:10px">${statusTag}${wasPlannedTag}</div>
        </div>
        <div style="display:flex;flex-direction:column">
          <div style="${ROW_STYLE}">
            <div style="${ICON_COL}">${iconCal}</div>
            <div>
              <div style="${LABEL}">Data</div>
              <div style="font-size:14px">${escapeHTML(Fmt.dateLong(expense.date))}${timeStr}</div>
            </div>
          </div>
          <div style="${ROW_STYLE}">
            <div style="${ICON_COL}">${iconTag}</div>
            <div>
              <div style="${LABEL}">Kategoria</div>
              <div style="font-size:14px">${catHtml}</div>
            </div>
          </div>
          <div style="${ROW_STYLE}">
            <div style="${ICON_COL}">${iconText}</div>
            <div>
              <div style="${LABEL}">Opis</div>
              <div style="font-size:14px">${expense.description ? escapeHTML(expense.description) : '<span style="color:var(--ink-3)">—</span>'}</div>
            </div>
          </div>
          <div style="${ROW_STYLE};border-bottom:none">
            <div style="${ICON_COL}">${iconUser}</div>
            <div>
              <div style="${LABEL}">Użytkownik</div>
              <div style="font-size:14px">${userHtml}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${onEdit ? `<button type="button" class="btn" id="_detailExpenseEditBtn">Edytuj</button>` : ''}
        <button type="button" class="btn accent" onclick="window.closeModal('expenseDetailsModal')">Zamknij</button>
      </div>
    </div>
  `;

  if (onEdit) {
    modal.querySelector('#_detailExpenseEditBtn').onclick = () => {
      modal.classList.remove('active');
      onEdit(expense.id);
    };
  }

  modal.classList.add('active');
}

// ==================== MODAL SZCZEGÓŁÓW PRZYCHODU ====================

export function showIncomeDetailsModal(income, { getBudgetUserName, onEdit } = {}) {
  const modalId = 'incomeDetailsModal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const isCorrection = income.source === 'KOREKTA';
  const userName = getBudgetUserName ? getBudgetUserName(income.userId) : (income.userId || '—');
  const srcIcon  = !isCorrection && income.source ? getSourceIcon(income.source) : '';

  const iconCal  = icon('Calendar', { size: 15, strokeWidth: 1.75 });
  const iconWal  = icon('Wallet',   { size: 15, strokeWidth: 1.75 });
  const iconText = icon('Edit',     { size: 15, strokeWidth: 1.75 });
  const iconUser = icon('User',     { size: 15, strokeWidth: 1.75 });

  const ICON_COL  = 'width:28px;flex-shrink:0;color:var(--ink-3);display:flex;align-items:center;justify-content:center;padding-top:1px';
  const ROW_STYLE = 'display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)';
  const LABEL     = 'font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);font-weight:500;margin-bottom:2px';

  const statusTag = isCorrection
    ? '<span class="tag info dot">Korekta</span>'
    : income.type === 'planned'
      ? '<span class="tag info dot">Planowany</span>'
      : '<span class="tag success dot">Zrealizowany</span>';

  const wasPlannedTag = income.wasPlanned
    ? '<span class="tag" style="margin-left:6px;background:color-mix(in srgb,var(--info,#6c9) 12%,var(--surface));color:var(--ink-2)">Było planowane</span>'
    : '';

  const amountSign = income.amount >= 0 ? '+' : '';
  const amountColor = income.amount >= 0 ? 'var(--success)' : 'var(--danger)';

  const sourceLabel = isCorrection ? 'Korekta' : 'Źródło';
  const sourceHtml = isCorrection
    ? `<span style="font-weight:600">KOREKTA</span>${income.correctionReason ? `<br><span style="color:var(--ink-3);font-size:12px">${escapeHTML(income.correctionReason)}</span>` : ''}`
    : (income.source ? escapeHTML(`${srcIcon ? srcIcon + ' ' : ''}${income.source}`) : '<span style="color:var(--ink-3)">—</span>');

  const userHtml = income.userId && userName
    ? userChipHTML({ id: income.userId, name: userName })
    : '<span style="color:var(--ink-3)">—</span>';

  const timeStr = income.time ? `<span style="color:var(--ink-3);margin-left:8px">${escapeHTML(income.time)}</span>` : '';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:440px">
      <div class="modal-header">
        <h3>Szczegóły przychodu</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('incomeDetailsModal')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div style="background:var(--surface-2);border-radius:10px;padding:18px 20px;text-align:center;margin-bottom:20px">
          <div style="font-size:30px;font-weight:700;letter-spacing:-.02em;color:${amountColor}">${amountSign}${Fmt.zl(Math.abs(income.amount))}</div>
          <div style="margin-top:10px">${statusTag}${wasPlannedTag}</div>
        </div>
        <div style="display:flex;flex-direction:column">
          <div style="${ROW_STYLE}">
            <div style="${ICON_COL}">${iconCal}</div>
            <div>
              <div style="${LABEL}">Data</div>
              <div style="font-size:14px">${escapeHTML(Fmt.dateLong(income.date))}${timeStr}</div>
            </div>
          </div>
          <div style="${ROW_STYLE}">
            <div style="${ICON_COL}">${iconWal}</div>
            <div>
              <div style="${LABEL}">${sourceLabel}</div>
              <div style="font-size:14px">${sourceHtml}</div>
            </div>
          </div>
          ${income.description ? `
          <div style="${ROW_STYLE}">
            <div style="${ICON_COL}">${iconText}</div>
            <div>
              <div style="${LABEL}">Opis</div>
              <div style="font-size:14px">${escapeHTML(income.description)}</div>
            </div>
          </div>
          ` : ''}
          <div style="${ROW_STYLE};border-bottom:none">
            <div style="${ICON_COL}">${iconUser}</div>
            <div>
              <div style="${LABEL}">Użytkownik</div>
              <div style="font-size:14px">${userHtml}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${onEdit && !isCorrection ? `<button type="button" class="btn" id="_detailIncomeEditBtn">Edytuj</button>` : ''}
        <button type="button" class="btn accent" onclick="window.closeModal('incomeDetailsModal')">Zamknij</button>
      </div>
    </div>
  `;

  if (onEdit && !isCorrection) {
    modal.querySelector('#_detailIncomeEditBtn').onclick = () => {
      modal.classList.remove('active');
      onEdit(income.id);
    };
  }

  modal.classList.add('active');
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