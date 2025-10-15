// src/app.js - część 4/4 - Formularze i operacje CRUD
// Dodaj te funkcje do głównego pliku app.js

/**
 * Konfiguracja wszystkich formularzy
 */
function setupForms() {
  setupExpenseForm();
  setupEndDatesForm();
  setupSavingGoalForm();
  setupSourcesSection();
  setupUserButtons();
  setupCategoryInput();
  setupComparisonFilters();
}

/**
 * Konfiguracja formularza wydatków
 */
function setupExpenseForm() {
  const form = document.getElementById('expenseForm');
  if (!form) return;
  
  // Ustaw domyślną datę na dziś
  const dateInput = document.getElementById('expenseDate');
  if (dateInput) {
    dateInput.value = getWarsawDateString();
  }
  
  // Dodaj walidatory
  attachValidator(document.getElementById('expenseAmount'), validateAmount);
  attachValidator(document.getElementById('expenseQuantity'), validateQuantity);
  attachValidator(document.getElementById('expenseCategory'), validateCategoryName);
  
  // Obsługa zmiany typu transakcji
  const typeSelect = document.getElementById('expenseType');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'normal') {
        if (dateInput) {
          dateInput.value = getWarsawDateString();
          dateInput.type = 'hidden';
        }
        const label = document.querySelector('label[for="expenseDate"]');
        if (label) label.style.display = 'none';
      } else {
        if (dateInput) {
          dateInput.type = 'date';
        }
        const label = document.querySelector('label[for="expenseDate"]');
        if (label) label.style.display = 'block';
      }
    });
  }
  
  // Obsługa wysyłki formularza
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('expenseDate').value;
    const time = getCurrentTimeString();
    const categoryName = document.getElementById('expenseCategory').value.trim();
    const user = document.getElementById('expenseUser').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const quantity = parseFloat(document.getElementById('expenseQuantity').value);
    const desc = document.getElementById('expenseDesc').value.trim();
    const typeVal = document.getElementById('expenseType').value;
    const planned = typeVal === 'planned';
    
    // Walidacja
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      showErrorMessage(amountValidation.error);
      return;
    }
    
    const dateValidation = validateDate(date);
    if (!dateValidation.valid) {
      showErrorMessage(dateValidation.error);
      return;
    }
    
    const quantityValidation = validateQuantity(quantity);
    if (!quantityValidation.valid) {
      showErrorMessage(quantityValidation.error);
      return;
    }
    
    const categoryValidation = validateCategoryName(categoryName);
    if (!categoryValidation.valid) {
      showErrorMessage(categoryValidation.error);
      return;
    }
    
    try {
      showLoader(true);
      
      // Znajdź lub utwórz kategorię
      let categories = getCategories();
      let cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      if (!cat) {
        cat = { id: Date.now().toString(), name: categoryName };
        categories.push(cat);
        await saveCategories(categories);
      }
      
      // Dodaj wydatek
      const expenses = getExpenses();
      expenses.push({
        id: Date.now().toString(),
        date,
        time,
        categoryId: cat.id,
        amount,
        quantity: quantity || 1,
        description: desc,
        user: getDisplayName() || user,
        planned
      });
      
      await saveExpenses(expenses);
      
      // Wyczyść formularz
      form.reset();
      dateInput.value = getWarsawDateString();
      document.getElementById('expenseQuantity').value = '1';
      
      currentExpensePage = 1;
      renderAll();
      showSuccessFeedback();
      
    } catch (error) {
      logError(error, 'setupExpenseForm');
      showErrorMessage('Nie udało się dodać wydatku');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja formularza dat końcowych
 */
function setupEndDatesForm() {
  const form = document.getElementById('endDatesForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      showErrorMessage('Ta funkcja jest dostępna tylko w trybie admina');
      return;
    }
    
    const date1 = document.getElementById('budgetEndDate1').value;
    const date2 = document.getElementById('budgetEndDate2').value;
    
    if (!date1 && !date2) {
      showErrorMessage('Proszę ustawić co najmniej jedną datę końcową');
      return;
    }
    
    try {
      showLoader(true);
      await saveEndDates(date1, date2);
      
      if (DAILY_ENVELOPE.ENABLED) {
        await updateDailyEnvelope();
      }
      
      renderSummary();
      showSuccessMessage('Daty końcowe zostały zaktualizowane');
    } catch (error) {
      logError(error, 'setupEndDatesForm');
      showErrorMessage('Nie udało się zaktualizować dat końcowych');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja formularza celu oszczędności
 */
function setupSavingGoalForm() {
  const form = document.getElementById('savingGoalForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      showErrorMessage('Ustawienie celu oszczędności dostępne tylko w trybie admina');
      return;
    }
    
    const goalVal = parseFloat(document.getElementById('savingGoal').value);
    
    const validation = validateAmount(goalVal);
    if (!validation.valid) {
      showErrorMessage(validation.error);
      return;
    }
    
    try {
      showLoader(true);
      await saveSavingGoal(goalVal);
      
      if (DAILY_ENVELOPE.ENABLED) {
        await updateDailyEnvelope();
      }
      
      renderSummary();
      showSuccessMessage('Cel oszczędności został zaktualizowany');
    } catch (error) {
      logError(error, 'setupSavingGoalForm');
      showErrorMessage('Nie udało się zaktualizować celu oszczędności');
    } finally {
      showLoader(false);
    }
  });
}

/**
 * Konfiguracja sekcji źródeł finansów
 */
function setupSourcesSection() {
  const addBtn = document.getElementById('showAddFundsForm');
  const editBtn = document.getElementById('editFundsButton');
  const addContainer = document.getElementById('addFundsContainer');
  const editContainer = document.getElementById('editFundsContainer');
  
  // Pokaż formularz dodawania środków
  if (addBtn && !addBtn.hasAttribute('data-setup')) {
    addBtn.setAttribute('data-setup', 'true');
    addBtn.addEventListener('click', () => {
      if (addContainer) addContainer.style.display = 'block';
      if (editContainer) editContainer.style.display = 'none';
    });
  }
  
  // Pokaż formularz edycji stanu
  if (editBtn && !editBtn.hasAttribute('data-setup')) {
    editBtn.setAttribute('data-setup', 'true');
    editBtn.addEventListener('click', () => {
      if (editContainer) {
        const remaining = computeSourcesRemaining();
        let totalAvailable = 0;
        remaining.forEach(item => {
          totalAvailable += item.left;
        });
        if (totalAvailable < 0) totalAvailable = 0;
        
        const inputField = document.getElementById('editFundsAmount');
        if (inputField) inputField.value = totalAvailable.toFixed(2);
        
        editContainer.style.display = 'block';
      }
      if (addContainer) addContainer.style.display = 'none';
    });
  }
  
  // Obsługa typu transakcji (pokazuj/ukryj datę dla planowanych)
  const typeSelect = document.getElementById('addFundsType');
  const dateContainer = document.getElementById('addFundsDateContainer');
  
  if (typeSelect && !typeSelect.hasAttribute('data-setup')) {
    typeSelect.setAttribute('data-setup', 'true');
    typeSelect.addEventListener('change', () => {
      if (dateContainer) {
        dateContainer.style.display = typeSelect.value === 'planned' ? 'block' : 'none';
      }
    });
  }
  
  // Anuluj dodawanie środków
  const cancelAddBtn = document.getElementById('cancelAddFunds');
  if (cancelAddBtn && !cancelAddBtn.hasAttribute('data-setup')) {
    cancelAddBtn.setAttribute('data-setup', 'true');
    cancelAddBtn.addEventListener('click', () => {
      if (addContainer) addContainer.style.display = 'none';
    });
  }
  
  // Zatwierdź dodawanie środków
  const confirmAddBtn = document.getElementById('confirmAddFunds');
  if (confirmAddBtn && !confirmAddBtn.hasAttribute('data-setup')) {
    confirmAddBtn.setAttribute('data-setup', 'true');
    confirmAddBtn.addEventListener('click', async () => {
      if (!isAdmin) {
        showErrorMessage('Ta funkcja jest dostępna tylko w trybie admina');
        return;
      }
      
      const amountInput = document.getElementById('addFundsAmount');
      const userSelect = document.getElementById('addFundsUser');
      const descInput = document.getElementById('addFundsDesc');
      const typeSel = document.getElementById('addFundsType');
      const dateInput = document.getElementById('addFundsDate');
      
      const amount = parseFloat(amountInput ? amountInput.value : '');
      const user = userSelect ? userSelect.value : 'Martyna';
      const desc = descInput ? descInput.value.trim() : '';
      const typeVal = typeSel ? typeSel.value : 'normal';
      const planned = typeVal === 'planned';
      
      let dateStr;
      if (planned) {
        dateStr = dateInput && dateInput.value ? dateInput.value : '';
        if (!dateStr) {
          showErrorMessage('Podaj datę planowanego wpływu');
          return;
        }
      } else {
        dateStr = getWarsawDateString();
      }
      
      const validation = validateAmount(amount);
      if (!validation.valid) {
        showErrorMessage(validation.error);
        return;
      }
      
      try {
        showLoader(true);
        
        const timeStr = getCurrentTimeString();
        const incomes = getIncomes();
        
        incomes.push({
          id: Date.now().toString(),
          date: dateStr,
          time: timeStr,
          amount: amount,
          description: desc || 'Dodanie środków',
          user: getDisplayName() || user,
          planned: planned
        });
        
        await saveIncomes(incomes);
        
        if (DAILY_ENVELOPE.ENABLED) {
          await updateDailyEnvelope();
        }
        
        // Wyczyść formularz
        if (amountInput) amountInput.value = '';
        if (descInput) descInput.value = '';
        if (userSelect) userSelect.value = 'Martyna';
        if (typeSel) typeSel.value = 'normal';
        if (dateInput) dateInput.value = '';
        if (dateContainer) dateContainer.style.display = 'none';
        if (addContainer) addContainer.style.display = 'none';
        
        renderAll();
        showSuccessFeedback();
        
      } catch (error) {
        logError(error, 'confirmAddFunds');
        showErrorMessage('Nie udało się dodać środków');
      } finally {
        showLoader(false);
      }
    });
  }
  
  // Anuluj edycję stanu
  const cancelEditBtn = document.getElementById('cancelEditFunds');
  if (cancelEditBtn && !cancelEditBtn.hasAttribute('data-setup')) {
    cancelEditBtn.setAttribute('data-setup', 'true');
    cancelEditBtn.addEventListener('click', () => {
      if (editContainer) editContainer.style.display = 'none';
    });
  }
  
  // Zatwierdź edycję stanu (korekta)
  const confirmEditBtn = document.getElementById('confirmEditFunds');
  if (confirmEditBtn && !confirmEditBtn.hasAttribute('data-setup')) {
    confirmEditBtn.setAttribute('data-setup', 'true');
    confirmEditBtn.addEventListener('click', async () => {
      if (!isAdmin) {
        showErrorMessage('Ta funkcja jest dostępna tylko w trybie admina');
        return;
      }
      
      const inputField = document.getElementById('editFundsAmount');
      const newVal = inputField ? parseFloat(inputField.value) : NaN;
      
      const remaining = computeSourcesRemaining();
      let currentVal = 0;
      remaining.forEach(item => {
        currentVal += item.left;
      });
      if (currentVal < 0) currentVal = 0;
      
      const validation = validateAmount(newVal);
      if (!validation.valid) {
        showErrorMessage(validation.error);
        return;
      }
      
      const delta = newVal - currentVal;
      
      if (Math.abs(delta) < 0.001) {
        if (editContainer) editContainer.style.display = 'none';
        return;
      }
      
      try {
        showLoader(true);
        
        const dateStr = getWarsawDateString();
        const timeStr = getCurrentTimeString();
        const incomes = getIncomes();
        
        incomes.push({
          id: Date.now().toString(),
          date: dateStr,
          time: timeStr,
          amount: delta,
          description: 'KOREKTA',
          user: 'Admin',
          planned: false
        });
        
        await saveIncomes(incomes);
        
        if (editContainer) editContainer.style.display = 'none';
        
        renderAll();
        showSuccessFeedback();
        
      } catch (error) {
        logError(error, 'confirmEditFunds');
        showErrorMessage('Nie udało się zaktualizować stanu');
      } finally {
        showLoader(false);
      }
    });
  }
}

/**
 * Konfiguracja przycisków użytkownika
 */
function setupUserButtons() {
  // Przycisk edycji profilu
  const editProfileBtn = document.getElementById('editProfileBtn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      showProfileModal();
    });
  }
  
  // Przycisk wylogowania
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await logoutUser();
        showSuccessMessage('Wylogowano pomyślnie');
      } catch (error) {
        logError(error, 'logoutBtn');
        showErrorMessage('Nie udało się wylogować');
      }
    });
  }
}

/**
 * Konfiguracja pola kategorii
 */
function setupCategoryInput() {
  const expCatInput = document.getElementById('expenseCategory');
  if (expCatInput) {
    expCatInput.addEventListener('input', () => {
      updateDescriptionSuggestions();
    });
  }
}

/**
 * Konfiguracja filtrów porównań
 */
function setupComparisonFilters() {
  const userSel = document.getElementById('comparisonUser');
  const periodSel = document.getElementById('comparisonPeriod');
  const monthSel = document.getElementById('categoryMonthSelect');
  
  if (userSel) {
    userSel.addEventListener('change', () => {
      renderComparisons();
    });
  }
  
  if (periodSel) {
    periodSel.addEventListener('change', () => {
      renderComparisons();
    });
  }
  
  if (monthSel) {
    monthSel.addEventListener('change', () => {
      renderCategoryChart();
    });
  }
}

/**
 * Edytuj kategorię
 */
async function editCategory(catId) {
  if (!isAdmin) return;
  
  const categories = getCategories();
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;
  
  const newName = prompt('Podaj nową nazwę kategorii:', cat.name);
  if (newName === null) return;
  
  const validation = validateCategoryName(newName);
  if (!validation.valid) {
    showErrorMessage(validation.error);
    return;
  }
  
  try {
    showLoader(true);
    cat.name = validation.value;
    await saveCategories(categories);
    renderCategories();
    renderExpenseHistory();
    showSuccessMessage('Kategoria została zaktualizowana');
  } catch (error) {
    logError(error, 'editCategory');
    showErrorMessage('Nie udało się zaktualizować kategorii');
  } finally {
    showLoader(false);
  }
}

/**
 * Usuń kategorię
 */
async function deleteCategory(catId) {
  if (!isAdmin) return;
  
  if (!confirm('Czy na pewno chcesz usunąć tę kategorię oraz wszystkie powiązane wydatki?')) {
    return;
  }
  
  try {
    showLoader(true);
    
    let categories = getCategories();
    let expenses = getExpenses();
    
    categories = categories.filter(c => c.id !== catId);
    expenses = expenses.filter(e => e.categoryId !== catId);
    
    await saveCategories(categories);
    await saveExpenses(expenses);
    
    renderAll();
    showSuccessFeedback();
    
  } catch (error) {
    logError(error, 'deleteCategory');
    showErrorMessage('Nie udało się usunąć kategorii');
  } finally {
    showLoader(false);
  }
}

/**
 * Edytuj wydatek
 */
function editExpense(expId) {
  if (!isAdmin) return;
  
  const expenses = getExpenses();
  const expense = expenses.find(e => e.id === expId);
  if (!expense) return;
  
  const categories = getCategories();
  const cat = categories.find(c => c.id === expense.categoryId);
  
  document.getElementById('expenseDate').value = expense.date;
  document.getElementById('expenseCategory').value = cat ? cat.name : '';
  document.getElementById('expenseAmount').value = expense.amount;
  document.getElementById('expenseDesc').value = expense.description || '';
  document.getElementById('expenseUser').value = expense.user || 'Martyna';
  document.getElementById('expenseQuantity').value = expense.quantity || 1;
  
  const typeSelect = document.getElementById('expenseType');
  if (typeSelect) {
    typeSelect.value = expense.planned ? 'planned' : 'normal';
    
    // Pokaż/ukryj pole daty
    const dateInput = document.getElementById('expenseDate');
    const dateLabel = document.querySelector('label[for="expenseDate"]');
    
    if (typeSelect.value === 'normal') {
      if (dateInput) dateInput.type = 'hidden';
      if (dateLabel) dateLabel.style.display = 'none';
    } else {
      if (dateInput) dateInput.type = 'date';
      if (dateLabel) dateLabel.style.display = 'block';
    }
  }
  
  updateDescriptionSuggestions();
  
  // Zmień przycisk na "Zapisz"
  const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = '💾 Zapisz wydatek';
    submitBtn.setAttribute('data-editing', expId);
  }
  
  // Dodaj handler do zapisania edycji
  const form = document.getElementById('expenseForm');
  const editHandler = async (e) => {
    e.preventDefault();
    
    const editingId = submitBtn.getAttribute('data-editing');
    if (!editingId) return;
    
    const date = document.getElementById('expenseDate').value;
    const time = getCurrentTimeString();
    const categoryName = document.getElementById('expenseCategory').value.trim();
    const user = document.getElementById('expenseUser').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const quantity = parseFloat(document.getElementById('expenseQuantity').value);
    const desc = document.getElementById('expenseDesc').value.trim();
    const typeVal = document.getElementById('expenseType').value;
    const planned = typeVal === 'planned';
    
    // Walidacja
    const categoryValidation = validateCategoryName(categoryName);
    if (!categoryValidation.valid) {
      showErrorMessage(categoryValidation.error);
      return;
    }
    
    try {
      showLoader(true);
      
      // Znajdź lub utwórz kategorię
      let categories = getCategories();
      let cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      if (!cat) {
        cat = { id: Date.now().toString(), name: categoryName };
        categories.push(cat);
        await saveCategories(categories);
      }
      
      // Zaktualizuj wydatek
      let expenses = getExpenses();
      const idx = expenses.findIndex(e => e.id === editingId);
      
      if (idx !== -1) {
        expenses[idx] = {
          ...expenses[idx],
          date,
          time,
          categoryId: cat.id,
          amount,
          quantity: quantity || 1,
          description: desc,
          user: getDisplayName() || user,
          planned
        };
        
        await saveExpenses(expenses);
      }
      
      // Resetuj formularz
      form.reset();
      document.getElementById('expenseDate').value = getWarsawDateString();
      document.getElementById('expenseQuantity').value = '1';
      submitBtn.textContent = '➖ Dodaj wydatek';
      submitBtn.removeAttribute('data-editing');
      
      // Usuń handler edycji
      form.removeEventListener('submit', editHandler);
      
      currentExpensePage = 1;
      renderAll();
      showSuccessFeedback();
      
    } catch (error) {
      logError(error, 'editExpense');
      showErrorMessage('Nie udało się zaktualizować wydatku');
    } finally {
      showLoader(false);
    }
  };
  
  // Zastąp normalny handler handlerem edycji
  form.removeEventListener('submit', editHandler);
  form.addEventListener('submit', editHandler, { once: true });
}

/**
 * Usuń wydatek
 */
async function deleteExpense(expId) {
  if (!isAdmin) return;
  
  if (!confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
    return;
  }
  
  try {
    showLoader(true);
    
    let expenses = getExpenses();
    expenses = expenses.filter(e => e.id !== expId);
    
    await saveExpenses(expenses);
    
    currentExpensePage = 1;
    renderAll();
    
  } catch (error) {
    logError(error, 'deleteExpense');
    showErrorMessage('Nie udało się usunąć wydatku');
  } finally {
    showLoader(false);
  }
}

/**
 * Przełącz status źródła finansów (planowane -> zrealizowane)
 */
async function toggleIncomeStatus(incomeId) {
  if (!isAdmin) return;
  
  const incomes = getIncomes();
  const inc = incomes.find(item => item.id === incomeId);
  if (!inc) return;
  
  if (inc.planned) {
    inc.wasPlanned = true;
    inc.planned = false;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    inc.date = dateStr;
    inc.time = timeStr;
    
    try {
      showLoader(true);
      
      await saveIncomes(incomes);
      
      if (DAILY_ENVELOPE.ENABLED) {
        await updateDailyEnvelope();
      }
      
      renderAll();
      showSuccessFeedback();
      
    } catch (error) {
      logError(error, 'toggleIncomeStatus');
      showErrorMessage('Nie udało się zaktualizować statusu');
    } finally {
      showLoader(false);
    }
  }
}

// To jest koniec app.js - wszystkie funkcje są już zdefiniowane!