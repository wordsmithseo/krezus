export function validateAmount(amount) {
  const num = parseFloat(amount);

  // Walidacja Number.isFinite - zapobiega NaN, Infinity, -Infinity
  if (!Number.isFinite(num)) {
    return false;
  }

  if (num <= 0) {
    return false;
  }

  if (num > 1000000) {
    return false;
  }

  return true;
}

export function validateDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return false;
  }
  
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return false;
  }
  
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  
  if (date < tenYearsAgo) {
    return false;
  }
  
  const fiveYearsAhead = new Date();
  fiveYearsAhead.setFullYear(fiveYearsAhead.getFullYear() + 5);
  
  if (date > fiveYearsAhead) {
    return false;
  }
  
  return true;
}

export function validateQuantity(quantity) {
  const num = parseFloat(quantity);

  // Walidacja Number.isFinite - zapobiega NaN, Infinity, -Infinity
  if (!Number.isFinite(num)) {
    return false;
  }

  if (num < 1) {
    return false;
  }

  if (num > 10000) {
    return false;
  }

  return true;
}

export function validateCategoryName(categoryName) {
  if (!categoryName || categoryName.trim() === '') {
    return false;
  }
  
  const trimmed = categoryName.trim();
  
  if (trimmed.length < 2) {
    return false;
  }
  
  if (trimmed.length > 50) {
    return false;
  }
  
  return true;
}

export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  return true;
}

export function validatePassword(password) {
  if (!password || password.trim() === '') {
    return false;
  }
  
  if (password.length < 6) {
    return false;
  }
  
  if (password.length > 100) {
    return false;
  }
  
  return true;
}

export function validateDisplayName(displayName) {
  if (!displayName || displayName.trim() === '') {
    return false;
  }
  
  const trimmed = displayName.trim();
  
  if (trimmed.length < 2) {
    return false;
  }
  
  if (trimmed.length > 50) {
    return false;
  }
  
  return true;
}

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