// src/handlers/expenseHandlers.js
import {
  getCategories,
  getExpenses,
  saveCategories,
  saveExpenses,
  loadExpenses
} from '../modules/dataManager.js';
import {
  updateDailyEnvelope,
  clearLimitsCache
} from '../modules/budgetCalculator.js';
import { showEditExpenseModal } from '../components/modals.js';
import { showPasswordModal } from '../components/modals.js';
import { showErrorMessage, showSuccessMessage } from '../utils/errorHandler.js';
import { validateAmount } from '../utils/validators.js';
import { getCategoryIcon } from '../utils/iconMapper.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { log } from '../modules/logger.js';

let editingExpenseId = null;
let getBudgetUserNameFn = null;
let getBudgetUsersCacheFn = null;
let renderAfterChangeFn = null;
let setupExpenseTypeToggleFn = null;

export function setExpenseHandlerDeps({ getBudgetUserName, getBudgetUsersCache, renderAfterChange, setupExpenseTypeToggle }) {
  getBudgetUserNameFn = getBudgetUserName;
  getBudgetUsersCacheFn = getBudgetUsersCache;
  renderAfterChangeFn = renderAfterChange;
  setupExpenseTypeToggleFn = setupExpenseTypeToggle;
}

export async function addExpense(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (submitBtn && submitBtn.disabled) return;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Zapisywanie...';
  }

  const wasEditing = editingExpenseId;

  const amount = parseFloat(form.expenseAmount.value);
  const type = form.expenseType.value;
  const userId = form.expenseUser.value;
  const category = form.expenseCategory.value.trim();
  const description = form.expenseDescription.value.trim();

  if (!validateAmount(amount)) {
    showErrorMessage('Kwota musi być większa od 0');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
    return;
  }

  if (!userId) {
    showErrorMessage('Wybierz użytkownika');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
    return;
  }

  if (!category) {
    showErrorMessage('Podaj kategorię');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
    return;
  }

  if (!description) {
    showErrorMessage('Podaj opis');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
    return;
  }

  const categories = getCategories();
  if (!categories.some(c => c.name.toLowerCase() === category.toLowerCase())) {
    const newCategory = {
      id: `cat_${Date.now()}`,
      name: escapeHTML(category),
      icon: getCategoryIcon(category)
    };
    const updatedCategories = [...categories, newCategory];
    await saveCategories(updatedCategories);
  }

  let date, time;

  if (type === 'normal') {
    date = getWarsawDateString();
    time = getCurrentTimeString();
  } else {
    date = form.expenseDate.value;
    time = form.expenseTime.value || '';
  }

  const expense = {
    id: editingExpenseId || `exp_${Date.now()}`,
    amount,
    date,
    type,
    time,
    userId,
    category: escapeHTML(category),
    description: escapeHTML(description),
    timestamp: editingExpenseId ? getExpenses().find(e => e.id === editingExpenseId)?.timestamp : getCurrentTimeString()
  };

  const expenses = getExpenses();
  const updated = editingExpenseId
    ? expenses.map(e => e.id === editingExpenseId ? expense : e)
    : [...expenses, expense];

  try {
    await saveExpenses(updated);

    if (type === 'normal' && date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }

    const budgetUserName = getBudgetUserNameFn(userId);

    await log(wasEditing ? 'EXPENSE_EDIT' : 'EXPENSE_ADD', {
      amount,
      category,
      description,
      type,
      budgetUser: budgetUserName
    });

    form.reset();
    form.expenseDate.value = getWarsawDateString();
    form.expenseType.value = 'normal';
    editingExpenseId = null;
    document.getElementById('expenseFormTitle').textContent = '💸 Dodaj wydatek';
    document.getElementById('descriptionSuggestions').innerHTML = '';

    if (setupExpenseTypeToggleFn) setupExpenseTypeToggleFn();

    showSuccessMessage(wasEditing ? 'Wydatek zaktualizowany' : 'Wydatek dodany');
  } catch (error) {
    console.error('Błąd zapisywania wydatku:', error);
    showErrorMessage('Nie udało się zapisać wydatku');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || (wasEditing ? 'Zapisz zmiany' : 'Dodaj wydatek');
    }
  }
}

export function editExpense(expenseId) {
  const expense = getExpenses().find(e => e.id === expenseId);
  if (!expense) return;

  showEditExpenseModal(expense, getBudgetUsersCacheFn(), async (updatedExpense) => {
    const expenses = getExpenses();
    const updated = expenses.map(e => e.id === expenseId ? updatedExpense : e);

    try {
      await saveExpenses(updated);

      if (updatedExpense.type === 'normal' && updatedExpense.date === getWarsawDateString()) {
        await updateDailyEnvelope();
      }

      const budgetUserName = getBudgetUserNameFn(updatedExpense.userId);

      await log('EXPENSE_EDIT', {
        amount: updatedExpense.amount,
        category: updatedExpense.category,
        description: updatedExpense.description,
        type: updatedExpense.type,
        budgetUser: budgetUserName
      });

      clearLimitsCache();
      if (renderAfterChangeFn) renderAfterChangeFn('expense');
      showSuccessMessage('Wydatek zaktualizowany');
    } catch (error) {
      console.error('Błąd aktualizacji wydatku:', error);
      showErrorMessage('Nie udało się zaktualizować wydatku');
    }
  });
}

export async function deleteExpense(expenseId) {
  const confirmed = await showPasswordModal(
    'Usuwanie wydatku',
    'Czy na pewno chcesz usunąć ten wydatek? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );

  if (!confirmed) return;

  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expenseId);
  const updated = expenses.filter(e => e.id !== expenseId);

  try {
    await saveExpenses(updated);
    await loadExpenses();

    if (expense && expense.type === 'normal' && expense.date === getWarsawDateString()) {
      await updateDailyEnvelope();
    }

    const budgetUserName = expense?.userId ? getBudgetUserNameFn(expense.userId) : 'Nieznany';

    await log('EXPENSE_DELETE', {
      amount: expense?.amount,
      category: expense?.category,
      description: expense?.description,
      budgetUser: budgetUserName
    });

    clearLimitsCache();
    if (renderAfterChangeFn) renderAfterChangeFn('expense');
    showSuccessMessage('Wydatek usunięty');
  } catch (error) {
    console.error('Błąd usuwania wydatku:', error);
    showErrorMessage('Nie udało się usunąć wydatku');
  }
}

export async function realiseExpense(expenseId) {
  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expenseId);

  if (!expense || expense.type !== 'planned') return;

  expense.type = 'normal';
  expense.date = getWarsawDateString();
  expense.time = getCurrentTimeString();
  expense.wasPlanned = true;

  try {
    await saveExpenses(expenses);
    await updateDailyEnvelope();

    const budgetUserName = getBudgetUserNameFn(expense.userId);
    await log('EXPENSE_REALISE', {
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      budgetUser: budgetUserName
    });

    clearLimitsCache();
    if (renderAfterChangeFn) renderAfterChangeFn('expense');
    showSuccessMessage('Wydatek zrealizowany');
  } catch (error) {
    console.error('Błąd realizacji wydatku:', error);
    showErrorMessage('Nie udało się zrealizować wydatku');
  }
}
