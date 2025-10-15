// src/utils/validators.js

/**
 * Waliduj kwotę
 * @param {number|string} amount - Kwota do walidacji
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateAmount(amount) {
  const num = parseFloat(amount);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Kwota musi być liczbą' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Kwota nie może być ujemna' };
  }
  
  if (num > 1000000) {
    return { valid: false, error: 'Kwota jest za duża (max 1,000,000)' };
  }
  
  // Sprawdź maksymalnie 2 miejsca po przecinku
  const parts = amount.toString().split('.');
  if (parts.length > 1 && parts[1].length > 2) {
    return { valid: false, error: 'Kwota może mieć maksymalnie 2 miejsca po przecinku' };
  }
  
  return { valid: true };
}

/**
 * Waliduj datę
 * @param {string} dateStr - Data do walidacji (YYYY-MM-DD)
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return { valid: false, error: 'Data jest wymagana' };
  }
  
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Nieprawidłowy format daty' };
  }
  
  // Sprawdź czy data nie jest zbyt daleko w przeszłości (więcej niż 10 lat)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  
  if (date < tenYearsAgo) {
    return { valid: false, error: 'Data nie może być starsza niż 10 lat' };
  }
  
  // Sprawdź czy data nie jest zbyt daleko w przyszłości (więcej niż 5 lat)
  const fiveYearsAhead = new Date();
  fiveYearsAhead.setFullYear(fiveYearsAhead.getFullYear() + 5);
  
  if (date > fiveYearsAhead) {
    return { valid: false, error: 'Data nie może być późniejsza niż 5 lat' };
  }
  
  return { valid: true };
}

/**
 * Waliduj ilość
 * @param {number|string} quantity - Ilość do walidacji
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateQuantity(quantity) {
  const num = parseFloat(quantity);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Ilość musi być liczbą' };
  }
  
  if (num < 1) {
    return { valid: false, error: 'Ilość musi być większa od 0' };
  }
  
  if (num > 10000) {
    return { valid: false, error: 'Ilość jest za duża (max 10,000)' };
  }
  
  return { valid: true };
}

/**
 * Waliduj nazwę kategorii
 * @param {string} categoryName - Nazwa kategorii
 * @returns {Object} - {valid: boolean, error?: string, value?: string}
 */
export function validateCategoryName(categoryName) {
  if (!categoryName || categoryName.trim() === '') {
    return { valid: false, error: 'Nazwa kategorii jest wymagana' };
  }
  
  const trimmed = categoryName.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nazwa kategorii musi mieć co najmniej 2 znaki' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Nazwa kategorii może mieć maksymalnie 50 znaków' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Waliduj email
 * @param {string} email - Adres email
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email jest wymagany' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Nieprawidłowy format email' };
  }
  
  return { valid: true };
}

/**
 * Waliduj hasło
 * @param {string} password - Hasło
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validatePassword(password) {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'Hasło jest wymagane' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Hasło musi mieć co najmniej 6 znaków' };
  }
  
  if (password.length > 100) {
    return { valid: false, error: 'Hasło jest za długie (max 100 znaków)' };
  }
  
  return { valid: true };
}

/**
 * Waliduj nazwę użytkownika
 * @param {string} displayName - Nazwa użytkownika
 * @returns {Object} - {valid: boolean, error?: string, value?: string}
 */
export function validateDisplayName(displayName) {
  if (!displayName || displayName.trim() === '') {
    return { valid: false, error: 'Nazwa użytkownika jest wymagana' };
  }
  
  const trimmed = displayName.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nazwa musi mieć co najmniej 2 znaki' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Nazwa może mieć maksymalnie 50 znaków' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Dodaj walidację do pola input
 * @param {HTMLInputElement} input - Element input
 * @param {Function} validator - Funkcja walidująca
 */
export function attachValidator(input, validator) {
  if (!input) return;
  
  const showError = (message) => {
    input.setCustomValidity(message);
    input.reportValidity();
  };
  
  const clearError = () => {
    input.setCustomValidity('');
  };
  
  input.addEventListener('blur', () => {
    const result = validator(input.value);
    if (!result.valid) {
      showError(result.error);
    } else {
      clearError();
    }
  });
  
  input.addEventListener('input', () => {
    clearError();
  });
}

/**
 * Waliduj cały formularz
 * @param {HTMLFormElement} form - Element formularza
 * @param {Object} validators - Mapa walidatorów {fieldName: validatorFunction}
 * @returns {Object} - {valid: boolean, errors: Object}
 */
export function validateForm(form, validators) {
  const errors = {};
  let isValid = true;
  
  for (const [fieldName, validator] of Object.entries(validators)) {
    const input = form.elements[fieldName];
    if (!input) continue;
    
    const result = validator(input.value);
    if (!result.valid) {
      errors[fieldName] = result.error;
      isValid = false;
      input.setCustomValidity(result.error);
    } else {
      input.setCustomValidity('');
    }
  }
  
  return { valid: isValid, errors };
}