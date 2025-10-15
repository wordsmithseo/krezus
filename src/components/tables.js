// src/components/tables.js
// Ten plik jest opcjonalny - renderowanie tabel jest już w app.js
// Możesz go pominąć lub użyć jako template do refaktoryzacji w przyszłości

/**
 * Utwórz wiersz tabeli
 */
export function createTableRow(cells = []) {
  const row = document.createElement('tr');
  
  cells.forEach(cellContent => {
    const td = document.createElement('td');
    if (typeof cellContent === 'string') {
      td.innerHTML = cellContent;
    } else {
      td.appendChild(cellContent);
    }
    row.appendChild(td);
  });
  
  return row;
}

/**
 * Utwórz przycisk akcji w tabeli
 */
export function createActionButton(config) {
  const {
    icon,
    ariaLabel,
    className = '',
    onClick,
    style = {}
  } = config;
  
  const button = document.createElement('button');
  button.className = className;
  button.textContent = icon;
  button.setAttribute('aria-label', ariaLabel);
  
  Object.assign(button.style, {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    ...style
  });
  
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  return button;
}

/**
 * Wyczyść tbody tabeli
 */
export function clearTableBody(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = '';
  }
}

/**
 * Sortuj tabelę po kolumnie
 */
export function sortTable(tableId, columnIndex, ascending = true) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  rows.sort((a, b) => {
    const aVal = a.children[columnIndex]?.textContent || '';
    const bVal = b.children[columnIndex]?.textContent || '';
    
    const comparison = aVal.localeCompare(bVal, 'pl-PL', { numeric: true });
    return ascending ? comparison : -comparison;
  });
  
  rows.forEach(row => tbody.appendChild(row));
}

/**
 * Filtruj wiersze tabeli
 */
export function filterTable(tableId, filterFn) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const show = filterFn(row);
    row.style.display = show ? '' : 'none';
  });
}

// Export dla backward compatibility
export default {
  createTableRow,
  createActionButton,
  clearTableBody,
  sortTable,
  filterTable
};