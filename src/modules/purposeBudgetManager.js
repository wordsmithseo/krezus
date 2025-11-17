// src/modules/purposeBudgetManager.js - Zarządzanie budżetami celowymi

import {
  getPurposeBudgets,
  savePurposeBudgets,
  getExpenses
} from './dataManager.js';
import { calculateAvailableFunds } from './budgetCalculator.js';
import { log } from './logger.js';
import { escapeHTML } from '../utils/sanitizer.js';

/**
 * Utwórz nowy budżet celowy
 */
export async function createPurposeBudget(name, amount) {
  const budgets = getPurposeBudgets();

  // Sprawdź czy budżet o takiej nazwie już istnieje
  const existing = budgets.find(b => b.name === name);
  if (existing) {
    throw new Error(`Budżet o nazwie "${name}" już istnieje`);
  }

  // Sprawdź dostępne środki
  const validation = validateBudgetAmount(amount);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Znajdź budżet "Ogólny" i zmniejsz jego kwotę
  const generalBudget = budgets.find(b => b.name === 'Ogólny');
  if (generalBudget) {
    generalBudget.amount -= parseFloat(amount);
  }

  const newBudget = {
    id: `pb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: escapeHTML(name.trim()),
    amount: parseFloat(amount),
    timestamp: new Date().toISOString()
  };

  budgets.push(newBudget);
  await savePurposeBudgets(budgets);

  // Zaloguj operację
  await log('PURPOSE_BUDGET_ADD', {
    budgetName: name,
    amount: parseFloat(amount),
    budgetId: newBudget.id
  });

  console.log('✅ Utworzono budżet celowy:', newBudget);
  console.log(`💰 Zmniejszono budżet "Ogólny" o ${amount} zł`);
  return newBudget;
}

/**
 * Zaktualizuj budżet celowy
 */
export async function updatePurposeBudget(budgetId, name, amount) {
  const budgets = getPurposeBudgets();
  const budgetIndex = budgets.findIndex(b => b.id === budgetId);

  if (budgetIndex === -1) {
    throw new Error('Budżet celowy nie został znaleziony');
  }

  const budget = budgets[budgetIndex];

  // Sprawdź czy nowa nazwa nie koliduje z innym budżetem
  if (name !== budget.name) {
    const existing = budgets.find(b => b.name === name && b.id !== budgetId);
    if (existing) {
      throw new Error(`Budżet o nazwie "${name}" już istnieje`);
    }
  }

  // Jeśli zmienia się kwota, sprawdź dostępność środków i zaktualizuj budżet "Ogólny"
  if (amount !== budget.amount) {
    const amountDiff = parseFloat(amount) - budget.amount;
    if (amountDiff > 0) {
      // Sprawdź dostępność środków, wykluczając edytowany budżet
      const validation = validateBudgetAmount(amountDiff, budgetId);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
    }

    // Zaktualizuj budżet "Ogólny"
    const generalBudget = budgets.find(b => b.name === 'Ogólny');
    if (generalBudget) {
      // Jeśli zwiększamy kwotę budżetu, zmniejsz "Ogólny"
      // Jeśli zmniejszamy kwotę budżetu, zwiększ "Ogólny"
      generalBudget.amount -= amountDiff;
      console.log(`💰 Zaktualizowano budżet "Ogólny" o ${-amountDiff} zł`);
    }
  }

  const oldName = budget.name;
  const oldAmount = budget.amount;

  budget.name = escapeHTML(name.trim());
  budget.amount = parseFloat(amount);

  await savePurposeBudgets(budgets);

  // Zaloguj operację
  await log('PURPOSE_BUDGET_EDIT', {
    budgetId: budgetId,
    oldName: oldName,
    newName: name,
    oldAmount: oldAmount,
    newAmount: parseFloat(amount)
  });

  console.log('✅ Zaktualizowano budżet celowy:', budget);
  return budget;
}

/**
 * Usuń budżet celowy
 */
export async function deletePurposeBudget(budgetId) {
  const budgets = getPurposeBudgets();
  const budget = budgets.find(b => b.id === budgetId);

  if (!budget) {
    throw new Error('Budżet celowy nie został znaleziony');
  }

  // Znajdź budżet "Ogólny"
  const generalBudget = budgets.find(b => b.name === 'Ogólny');
  if (!generalBudget) {
    throw new Error('Nie znaleziono budżetu "Ogólny"');
  }

  // Przenieś wszystkie wydatki z usuwanego budżetu do "Ogólny"
  const { saveExpenses } = await import('./dataManager.js');
  const expenses = getExpenses();
  const updatedExpenses = expenses.map(exp => {
    if (exp.purposeBudgetId === budgetId) {
      return { ...exp, purposeBudgetId: generalBudget.id };
    }
    return exp;
  });

  // Oblicz ile zostało niewydanych środków w usuwanym budżecie
  const spent = calculateBudgetSpent(budgetId);
  const remaining = budget.amount - spent;

  // Przenieś niewydane środki do budżetu "Ogólny"
  generalBudget.amount += remaining;

  // Usuń budżet z listy
  const filteredBudgets = budgets.filter(b => b.id !== budgetId);

  // Zapisz zmiany
  await saveExpenses(updatedExpenses);
  await savePurposeBudgets(filteredBudgets);

  // Zaloguj operację
  await log('PURPOSE_BUDGET_DELETE', {
    budgetName: budget.name,
    budgetAmount: budget.amount,
    spentAmount: spent,
    remainingAmount: remaining,
    budgetId: budgetId
  });

  console.log('✅ Usunięto budżet celowy:', budget.name);
  console.log(`💰 Przeniesiono ${remaining.toFixed(2)} zł do budżetu "Ogólny"`);
  return budget;
}

/**
 * Waliduj czy jest dostępna kwota na nowy/zwiększony budżet
 * @param {number} amount - Kwota do sprawdzenia
 * @param {string} excludeBudgetId - ID budżetu do wykluczenia z obliczeń (np. przy edycji)
 */
export function validateBudgetAmount(amount, excludeBudgetId = null) {
  const { available } = calculateAvailableFunds();
  const budgets = getPurposeBudgets();

  // Suma budżetów celowych (bez budżetu "Ogólny" i opcjonalnie bez edytowanego budżetu)
  const totalBudgeted = budgets
    .filter(b => b.name !== 'Ogólny' && b.id !== excludeBudgetId)
    .reduce((sum, b) => sum + b.amount, 0);

  // Dostępne środki na budżety celowe
  const availableForBudgets = available - totalBudgeted;

  if (amount > availableForBudgets) {
    return {
      valid: false,
      message: `Niewystarczające środki. Dostępne: ${availableForBudgets.toFixed(2)} zł, potrzebne: ${amount.toFixed(2)} zł`
    };
  }

  return { valid: true };
}

/**
 * Oblicz wydane środki z budżetu
 */
export function calculateBudgetSpent(budgetId, excludeExpenseId = null) {
  const expenses = getExpenses();

  // Sumuj tylko zrealizowane wydatki (type: 'normal')
  const budgetExpenses = expenses.filter(
    e => e.purposeBudgetId === budgetId && e.type === 'normal' && e.id !== excludeExpenseId
  );

  return budgetExpenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Sprawdź czy budżet ma wystarczające środki na wydatek
 */
export function canSpendFromBudget(budgetId, amount, excludeExpenseId = null) {
  const budgets = getPurposeBudgets();
  const budget = budgets.find(b => b.id === budgetId);

  if (!budget) {
    return {
      canSpend: false,
      message: 'Budżet celowy nie został znaleziony'
    };
  }

  const spent = calculateBudgetSpent(budgetId, excludeExpenseId);
  const remaining = budget.amount - spent;

  if (amount > remaining) {
    return {
      canSpend: false,
      message: `Niewystarczające środki w budżecie "${budget.name}". Dostępne: ${remaining.toFixed(2)} zł, potrzebne: ${amount.toFixed(2)} zł`,
      remaining,
      budget
    };
  }

  return {
    canSpend: true,
    remaining,
    budget
  };
}

/**
 * Synchronizuj kwotę budżetu "Ogólny" z dostępnymi środkami
 */
export async function syncGeneralBudget() {
  const budgets = getPurposeBudgets();
  const generalBudget = budgets.find(b => b.name === 'Ogólny');

  if (!generalBudget) return;

  // Oblicz ile powinien mieć "Ogólny"
  const { available } = calculateAvailableFunds();
  const otherBudgets = budgets.filter(b => b.name !== 'Ogólny');
  const totalOtherBudgets = otherBudgets.reduce((sum, b) => sum + b.amount, 0);

  const correctAmount = Math.max(0, available - totalOtherBudgets);

  if (Math.abs(generalBudget.amount - correctAmount) > 0.01) { // Tolerancja na błędy zaokrągleń
    console.log(`🔄 Synchronizacja budżetu "Ogólny": ${generalBudget.amount.toFixed(2)} zł -> ${correctAmount.toFixed(2)} zł`);
    generalBudget.amount = correctAmount;
    await savePurposeBudgets(budgets);
  }
}

/**
 * Pobierz lub utwórz domyślny budżet "Ogólny"
 */
export async function ensureDefaultBudget() {
  const budgets = getPurposeBudgets();

  // Sprawdź czy istnieje budżet "Ogólny"
  let defaultBudget = budgets.find(b => b.name === 'Ogólny');

  if (!defaultBudget) {
    console.log('🔄 Tworzenie domyślnego budżetu "Ogólny"...');

    // Utwórz budżet "Ogólny" z całymi dostępnymi środkami
    const { available } = calculateAvailableFunds();

    defaultBudget = {
      id: 'pb_default_general',
      name: 'Ogólny',
      amount: Math.max(0, available), // Nie może być ujemne
      timestamp: new Date().toISOString()
    };

    budgets.push(defaultBudget);
    await savePurposeBudgets(budgets);

    console.log('✅ Utworzono domyślny budżet "Ogólny":', defaultBudget);
  } else {
    // Synchronizuj kwotę budżetu "Ogólny"
    await syncGeneralBudget();
  }

  return defaultBudget;
}

/**
 * Pobierz statystyki wszystkich budżetów
 */
export function getBudgetStatistics() {
  const budgets = getPurposeBudgets();

  return budgets.map(budget => {
    // Zabezpieczenie przed undefined/null
    const amount = parseFloat(budget.amount) || 0;
    const spent = calculateBudgetSpent(budget.id) || 0;
    const remaining = amount - spent;
    const percentage = amount > 0 ? (spent / amount) * 100 : 0;

    console.log(`📊 Statystyki budżetu "${budget.name}":`, {
      id: budget.id,
      amount,
      spent,
      remaining,
      percentage: percentage.toFixed(1)
    });

    return {
      ...budget,
      amount,
      spent,
      remaining,
      percentage: Math.min(percentage, 100) // Cap at 100%
    };
  });
}

/**
 * Waliduj czy suma budżetów celowych nie przekracza dostępnych środków
 * Jeśli przekracza, zlikwiduj wszystkie budżety celowe
 * @returns {Object} { isValid, message, liquidated }
 */
export async function validateBudgetAllocation() {
  const budgets = getPurposeBudgets();
  const purposeBudgets = budgets.filter(b => b.name !== 'Ogólny');

  // Jeśli nie ma budżetów celowych, wszystko jest OK
  if (purposeBudgets.length === 0) {
    return { isValid: true, liquidated: false };
  }

  const { available } = calculateAvailableFunds();
  const totalPurposeBudgets = purposeBudgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  console.log(`🔍 Walidacja budżetów: dostępne=${available.toFixed(2)} zł, zadeklarowane=${totalPurposeBudgets.toFixed(2)} zł`);

  // Jeśli suma budżetów przekracza dostępne środki, zlikwiduj wszystkie budżety celowe
  if (totalPurposeBudgets > available) {
    console.warn('⚠️ Dostępne środki spadły poniżej poziomu zadeklarowanych budżetów!');

    // Znajdź budżet "Ogólny"
    const generalBudget = budgets.find(b => b.name === 'Ogólny');

    // Przenieś wszystkie wydatki z budżetów celowych do "Ogólny"
    const { saveExpenses } = await import('./dataManager.js');
    const expenses = getExpenses();
    const updatedExpenses = expenses.map(exp => {
      const isFromPurposeBudget = purposeBudgets.some(pb => pb.id === exp.purposeBudgetId);
      if (isFromPurposeBudget && generalBudget) {
        return { ...exp, purposeBudgetId: generalBudget.id };
      }
      return exp;
    });

    // Usuń wszystkie budżety celowe (zostaw tylko "Ogólny")
    const remainingBudgets = budgets.filter(b => b.name === 'Ogólny');

    // Zapisz zmiany
    await saveExpenses(updatedExpenses);
    await savePurposeBudgets(remainingBudgets);

    // Zaloguj operację
    await log('PURPOSE_BUDGETS_LIQUIDATED', {
      reason: 'Dostępne środki spadły poniżej zadeklarowanych budżetów',
      available: available,
      totalPurposeBudgets: totalPurposeBudgets,
      liquidatedBudgets: purposeBudgets.map(b => ({ id: b.id, name: b.name, amount: b.amount }))
    });

    console.log('🗑️ Zlikwidowano wszystkie budżety celowe');

    // Synchronizuj budżet "Ogólny"
    await syncGeneralBudget();

    return {
      isValid: false,
      liquidated: true,
      message: `⚠️ UWAGA: Dostępne środki (${available.toFixed(2)} zł) spadły poniżej poziomu zadeklarowanych budżetów celowych (${totalPurposeBudgets.toFixed(2)} zł). Wszystkie budżety celowe zostały zlikwidowane. Konieczne jest ponowne zadeklarowanie budżetów celowych.`
    };
  }

  return { isValid: true, liquidated: false };
}
