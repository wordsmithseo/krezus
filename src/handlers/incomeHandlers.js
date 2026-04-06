// src/handlers/incomeHandlers.js
import {
  getIncomes,
  saveIncomes,
  loadIncomes
} from '../modules/dataManager.js';
import {
  calculateAvailableFunds,
  updateDailyEnvelope,
  clearLimitsCache,
  calculateSpendingPeriods
} from '../modules/budgetCalculator.js';
import { showEditIncomeModal, showPasswordModal } from '../components/modals.js';
import { showConfirmModal } from '../components/confirmModal.js';
import { showErrorMessage, showSuccessMessage } from '../utils/errorHandler.js';
import { validateAmount } from '../utils/validators.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { log } from '../modules/logger.js';

let editingIncomeId = null;
let getBudgetUserNameFn = null;
let getBudgetUsersCacheFn = null;
let renderAfterChangeFn = null;
let refreshPeriodSelectorsFn = null;
let setupIncomeTypeToggleFn = null;

export function setIncomeHandlerDeps({ getBudgetUserName, getBudgetUsersCache, renderAfterChange, refreshPeriodSelectors, setupIncomeTypeToggle }) {
  getBudgetUserNameFn = getBudgetUserName;
  getBudgetUsersCacheFn = getBudgetUsersCache;
  renderAfterChangeFn = renderAfterChange;
  refreshPeriodSelectorsFn = refreshPeriodSelectors;
  setupIncomeTypeToggleFn = setupIncomeTypeToggle;
}

export async function addIncome(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (submitBtn && submitBtn.disabled) return;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Zapisywanie...';
  }

  const wasEditing = editingIncomeId;

  const amount = parseFloat(form.incomeAmount.value);
  const type = form.incomeType.value;
  const userId = form.incomeUser.value;
  const source = form.incomeSource.value.trim();

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

  let date, time;

  if (type === 'normal') {
    date = getWarsawDateString();
    time = getCurrentTimeString();
  } else {
    date = form.incomeDate.value;
    time = form.incomeTime.value || '';
  }

  const income = {
    id: editingIncomeId || `inc_${Date.now()}`,
    amount,
    date,
    type,
    time,
    userId,
    source: escapeHTML(source),
    timestamp: editingIncomeId ? getIncomes().find(i => i.id === editingIncomeId)?.timestamp : getCurrentTimeString()
  };

  const incomes = getIncomes();
  const updated = editingIncomeId
    ? incomes.map(i => i.id === editingIncomeId ? income : i)
    : [...incomes, income];

  try {
    await saveIncomes(updated);
    clearLimitsCache();
    if (refreshPeriodSelectorsFn) refreshPeriodSelectorsFn();

    if (type === 'normal' && date <= getWarsawDateString()) {
      await updateDailyEnvelope();
    }

    const budgetUserName = getBudgetUserNameFn(userId);

    await log(wasEditing ? 'INCOME_EDIT' : 'INCOME_ADD', {
      amount,
      source,
      type,
      budgetUser: budgetUserName
    });

    form.reset();
    form.incomeDate.value = getWarsawDateString();
    form.incomeType.value = 'normal';
    editingIncomeId = null;
    document.getElementById('incomeFormTitle').textContent = '💰 Dodaj przychód';
    document.getElementById('sourceSuggestions').innerHTML = '';

    if (setupIncomeTypeToggleFn) setupIncomeTypeToggleFn();

    if (renderAfterChangeFn) renderAfterChangeFn('income');
    showSuccessMessage(wasEditing ? 'Przychód zaktualizowany' : 'Przychód dodany');
  } catch (error) {
    console.error('Błąd zapisywania przychodu:', error);
    showErrorMessage('Nie udało się zapisać przychodu');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || (wasEditing ? 'Zapisz zmiany' : 'Dodaj przychód');
    }
  }
}

export function editIncome(incomeId) {
  const income = getIncomes().find(i => i.id === incomeId);
  if (!income) return;

  showEditIncomeModal(income, getBudgetUsersCacheFn(), async (updatedIncome) => {
    const incomes = getIncomes();
    const updated = incomes.map(i => i.id === incomeId ? updatedIncome : i);

    try {
      await saveIncomes(updated);
      clearLimitsCache();
      if (refreshPeriodSelectorsFn) refreshPeriodSelectorsFn();

      if (updatedIncome.type === 'normal' && updatedIncome.date <= getWarsawDateString()) {
        await updateDailyEnvelope();
      }

      const budgetUserName = getBudgetUserNameFn(updatedIncome.userId);

      await log('INCOME_EDIT', {
        amount: updatedIncome.amount,
        source: updatedIncome.source,
        type: updatedIncome.type,
        budgetUser: budgetUserName
      });

      if (renderAfterChangeFn) renderAfterChangeFn('income');
      showSuccessMessage('Przychód zaktualizowany');
    } catch (error) {
      console.error('Błąd aktualizacji przychodu:', error);
      showErrorMessage('Nie udało się zaktualizować przychodu');
    }
  });
}

export async function deleteIncome(incomeId) {
  const confirmed = await showPasswordModal(
    'Usuwanie przychodu',
    'Czy na pewno chcesz usunąć ten przychód? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );

  if (!confirmed) return;

  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);
  const updated = incomes.filter(i => i.id !== incomeId);

  try {
    await saveIncomes(updated);
    clearLimitsCache();
    if (refreshPeriodSelectorsFn) refreshPeriodSelectorsFn();

    await loadIncomes();

    clearLimitsCache();
    await updateDailyEnvelope();

    const budgetUserName = income?.userId ? getBudgetUserNameFn(income.userId) : 'Nieznany';

    await log('INCOME_DELETE', {
      amount: income?.amount,
      source: income?.source,
      budgetUser: budgetUserName
    });

    if (refreshPeriodSelectorsFn) refreshPeriodSelectorsFn();
    if (renderAfterChangeFn) renderAfterChangeFn('income');
    showSuccessMessage('Przychód usunięty');
  } catch (error) {
    console.error('Błąd usuwania przychodu:', error);
    showErrorMessage('Nie udało się usunąć przychodu');
  }
}

export async function realiseIncome(incomeId) {
  const incomes = getIncomes();
  const income = incomes.find(i => i.id === incomeId);

  if (!income || income.type !== 'planned') return;

  income.type = 'normal';
  income.date = getWarsawDateString();
  income.time = getCurrentTimeString();
  income.wasPlanned = true;

  try {
    await saveIncomes(incomes);
    clearLimitsCache();
    if (refreshPeriodSelectorsFn) refreshPeriodSelectorsFn();
    await updateDailyEnvelope();

    const budgetUserName = getBudgetUserNameFn(income.userId);
    await log('INCOME_REALISE', {
      amount: income.amount,
      source: income.source,
      budgetUser: budgetUserName
    });

    if (renderAfterChangeFn) renderAfterChangeFn('income');
    showSuccessMessage('Przychód zrealizowany');
  } catch (error) {
    console.error('Błąd realizacji przychodu:', error);
    showErrorMessage('Nie udało się zrealizować przychodu');
  }
}

export async function addCorrection(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (submitBtn && submitBtn.disabled) return;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Zapisywanie...';
  }

  const newTotalAmount = parseFloat(form.correctionAmount.value);
  const reason = form.correctionReason.value.trim();

  if (!Number.isFinite(newTotalAmount)) {
    showErrorMessage('Podaj prawidłową kwotę całkowitych środków');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
    return;
  }

  if (!reason) {
    showErrorMessage('Podaj powód korekty');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
    return;
  }

  const { available } = calculateAvailableFunds();
  const difference = newTotalAmount - available;

  const correctionType = difference >= 0 ? 'PLUS' : 'MINUS';

  const correction = {
    id: `corr_${Date.now()}`,
    amount: difference,
    date: getWarsawDateString(),
    time: getCurrentTimeString(),
    type: 'normal',
    userId: 'system',
    source: 'KOREKTA',
    correctionReason: reason,
    correctionType: correctionType,
    previousAmount: available,
    newAmount: newTotalAmount,
    timestamp: getCurrentTimeString()
  };

  const incomes = getIncomes();
  const updated = [...incomes, correction];

  try {
    await saveIncomes(updated);
    clearLimitsCache();
    if (refreshPeriodSelectorsFn) refreshPeriodSelectorsFn();
    await updateDailyEnvelope();

    await log('CORRECTION_ADD', {
      difference: difference,
      correctionType: correctionType,
      previousAmount: available,
      newAmount: newTotalAmount,
      reason: reason,
      budgetUser: 'System'
    });

    form.reset();
    if (renderAfterChangeFn) renderAfterChangeFn('income');
    showSuccessMessage(`Korekta wprowadzona: ${correctionType} ${Math.abs(difference).toFixed(2)} zł`);
  } catch (error) {
    console.error('Błąd wprowadzania korekty:', error);
    showErrorMessage('Nie udało się wprowadzić korekty');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || 'Wprowadź korektę';
    }
  }
}
