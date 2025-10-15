// src/components/summary.js
// Ten plik jest opcjonalny - renderowanie podsumowania jest już w app.js
// Możesz go pominąć lub użyć jako template do refaktoryzacji w przyszłości

/**
 * Utwórz kartę podsumowania
 */
export function createSummaryCard(config) {
  const { label, value, icon = '' } = config;
  
  const div = document.createElement('div');
  div.className = 'summary-item';
  
  div.innerHTML = `
    <span class="label">${icon} ${label}</span>
    <span class="value">${value}</span>
  `;
  
  return div;
}

/**
 * Utwórz grupę kart podsumowania
 */
export function createSummaryGroup(config) {
  const { title, items = [] } = config;
  
  const groupDiv = document.createElement('div');
  groupDiv.className = 'summary-group';
  
  const h3 = document.createElement('h3');
  h3.textContent = title;
  groupDiv.appendChild(h3);
  
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'summary-items';
  
  items.forEach(item => {
    const card = createSummaryCard(item);
    itemsDiv.appendChild(card);
  });
  
  groupDiv.appendChild(itemsDiv);
  
  return groupDiv;
}

/**
 * Formatuj kwotę do wyświetlenia
 */
export function formatCurrency(amount, currency = 'PLN') {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Utwórz progress bar
 */
export function createProgressBar(config) {
  const { current, max, color = '#27ae60' } = config;
  
  const container = document.createElement('div');
  container.className = 'progress-bar';
  
  const fill = document.createElement('div');
  fill.className = 'progress-bar-fill';
  fill.style.backgroundColor = color;
  
  const percentage = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  fill.style.width = `${percentage}%`;
  
  container.appendChild(fill);
  
  return container;
}

// Export dla backward compatibility
export default {
  createSummaryCard,
  createSummaryGroup,
  formatCurrency,
  createProgressBar
};