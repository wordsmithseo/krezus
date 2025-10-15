// src/components/forms.js
// Ten plik jest opcjonalny - wszystkie formularze są już obsłużone w app.js
// Możesz go pominąć lub użyć jako template do refaktoryzacji w przyszłości

/**
 * Helper do tworzenia pól formularza
 */
export function createFormField(config) {
  const {
    type = 'text',
    id,
    label,
    placeholder = '',
    required = false,
    min,
    max,
    step,
    value = '',
    ariaLabel
  } = config;
  
  const container = document.createElement('div');
  container.className = 'form-group';
  
  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;
  container.appendChild(labelEl);
  
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.placeholder = placeholder;
  input.value = value;
  
  if (required) input.required = true;
  if (min !== undefined) input.min = min;
  if (max !== undefined) input.max = max;
  if (step !== undefined) input.step = step;
  if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
  
  container.appendChild(input);
  
  return { container, input };
}

/**
 * Helper do tworzenia select
 */
export function createSelect(config) {
  const {
    id,
    label,
    options = [],
    value = '',
    ariaLabel
  } = config;
  
  const container = document.createElement('div');
  container.className = 'form-group';
  
  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;
  container.appendChild(labelEl);
  
  const select = document.createElement('select');
  select.id = id;
  if (ariaLabel) select.setAttribute('aria-label', ariaLabel);
  
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === value) option.selected = true;
    select.appendChild(option);
  });
  
  container.appendChild(select);
  
  return { container, select };
}

/**
 * Helper do czyszczenia formularza
 */
export function clearForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();
  }
}

/**
 * Helper do blokowania/odblokowywania formularza
 */
export function setFormDisabled(formId, disabled) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  const elements = form.querySelectorAll('input, select, button, textarea');
  elements.forEach(el => {
    el.disabled = disabled;
  });
}

// Export dla backward compatibility
export default {
  createFormField,
  createSelect,
  clearForm,
  setFormDisabled
};