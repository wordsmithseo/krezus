// src/handlers/categoryHandlers.js
import {
  getCategories,
  getExpenses,
  saveCategories,
  saveExpenses
} from '../modules/dataManager.js';
import { getCurrentUser, getDisplayName } from '../modules/auth.js';
import { showEditCategoryModal, showPasswordModal } from '../components/modals.js';
import { showConfirmModal } from '../components/confirmModal.js';
import { showErrorMessage, showSuccessMessage } from '../utils/errorHandler.js';
import { validateCategoryName } from '../utils/validators.js';
import { getCategoryIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { log } from '../modules/logger.js';

let mergingCategoryId = null;
let renderCategoriesFn = null;
let renderExpensesFn = null;

export function setCategoryHandlerDeps({ renderCategories, renderExpenses }) {
  renderCategoriesFn = renderCategories;
  renderExpensesFn = renderExpenses;
}

export function getMergingCategoryId() {
  return mergingCategoryId;
}

export async function addCategory() {
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();

  if (!validateCategoryName(name)) {
    showErrorMessage('Nazwa kategorii musi mieć od 2 do 30 znaków');
    return;
  }

  const categories = getCategories();

  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    showErrorMessage('Kategoria o tej nazwie już istnieje');
    return;
  }

  const newCategory = {
    id: `cat_${Date.now()}`,
    name: escapeHTML(name.trim()),
    icon: getCategoryIcon(name)
  };

  const updated = [...categories, newCategory];

  try {
    await saveCategories(updated);
    input.value = '';

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('CATEGORY_ADD', {
      categoryName: name,
      budgetUser: displayName
    });

    showSuccessMessage('Kategoria dodana');
  } catch (error) {
    console.error('Błąd dodawania kategorii:', error);
    showErrorMessage('Nie udało się dodać kategorii');
  }
}

export function editCategory(categoryId, currentName) {
  showEditCategoryModal(categoryId, currentName);
}

export async function deleteCategory(categoryId, categoryName) {
  const expenses = getExpenses();
  const count = expenses.filter(e => e.category === categoryName).length;

  if (count > 0) {
    const confirmed = await showPasswordModal(
      'Usuwanie kategorii',
      `Kategoria "${categoryName}" zawiera ${count} wydatków. Wszystkie te wydatki zostaną TRWALE usunięte. Aby potwierdzić, podaj hasło głównego konta.`
    );

    if (!confirmed) return;

    const updatedExpenses = expenses.filter(e => e.category !== categoryName);
    await saveExpenses(updatedExpenses);
  } else {
    const confirmed = await showConfirmModal(
      'Usuwanie kategorii',
      'Czy na pewno chcesz usunąć tę kategorię?',
      { type: 'warning', confirmText: 'Usuń', cancelText: 'Anuluj' }
    );
    if (!confirmed) return;
  }

  const categories = getCategories();
  const updated = categories.filter(c => c.id !== categoryId);

  try {
    await saveCategories(updated);

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('CATEGORY_DELETE', {
      categoryName,
      affectedExpenses: count,
      budgetUser: displayName
    });

    showSuccessMessage('Kategoria usunięta');
  } catch (error) {
    console.error('Błąd usuwania kategorii:', error);
    showErrorMessage('Nie udało się usunąć kategorii');
  }
}

export function startMergeCategory(categoryId) {
  mergingCategoryId = categoryId;
  if (renderCategoriesFn) renderCategoriesFn();
}

export function cancelMergeCategory() {
  mergingCategoryId = null;
  if (renderCategoriesFn) renderCategoriesFn();
}

export async function selectMergeTarget(targetCategoryId) {
  if (!mergingCategoryId) return;

  const categories = getCategories();
  const sourceCategory = categories.find(c => c.id === mergingCategoryId);
  const targetCategory = categories.find(c => c.id === targetCategoryId);

  if (!sourceCategory || !targetCategory) {
    showErrorMessage('Nie znaleziono kategorii');
    return;
  }

  const expenses = getExpenses();
  const count = expenses.filter(e => e.category === sourceCategory.name).length;

  const confirmed = await showConfirmModal(
    'Scalanie kategorii',
    `Czy na pewno chcesz scalić kategorię "${sourceCategory.name}" z kategorią "${targetCategory.name}"?\n\nWszystkie ${count} wydatki zostaną przeniesione i oznaczone jako "przeniesione z ${sourceCategory.name}".`,
    { type: 'warning', confirmText: 'Scal', cancelText: 'Anuluj' }
  );

  if (!confirmed) {
    mergingCategoryId = null;
    if (renderCategoriesFn) renderCategoriesFn();
    return;
  }

  try {
    const updatedExpenses = expenses.map(exp => {
      if (exp.category === sourceCategory.name) {
        return {
          ...exp,
          category: targetCategory.name,
          mergedFrom: sourceCategory.name
        };
      }
      return exp;
    });

    await saveExpenses(updatedExpenses);

    const user = getCurrentUser();
    const displayName = await getDisplayName(user.uid);

    await log('CATEGORY_MERGE', {
      sourceCategory: sourceCategory.name,
      targetCategory: targetCategory.name,
      movedExpenses: count,
      budgetUser: displayName
    });

    mergingCategoryId = null;
    if (renderExpensesFn) renderExpensesFn();
    if (renderCategoriesFn) renderCategoriesFn();
    showSuccessMessage(`Scalono ${count} wydatków z kategorii "${sourceCategory.name}" do "${targetCategory.name}"`);
  } catch (error) {
    console.error('Błąd scalania kategorii:', error);
    showErrorMessage('Nie udało się scalić kategorii');
    mergingCategoryId = null;
    if (renderCategoriesFn) renderCategoriesFn();
  }
}
