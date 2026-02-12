// src/ui/renderExpenses.js
import { getExpenses } from '../modules/dataManager.js';
import { PAGINATION } from '../utils/constants.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { getCategoryIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';

let currentExpensePage = 1;
let getBudgetUserNameFn = null;

export function setExpenseDeps({ getBudgetUserName }) {
  getBudgetUserNameFn = getBudgetUserName;
}

export function resetExpensePage() {
  currentExpensePage = 1;
}

export function renderExpenses() {
  const expenses = getExpenses();
  const totalExpenses = expenses.length;

  const sorted = [...expenses].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'planned' ? -1 : 1;
    }
    return b.date.localeCompare(a.date);
  });

  const startIdx = (currentExpensePage - 1) * PAGINATION.EXPENSES_PER_PAGE;
  const endIdx = startIdx + PAGINATION.EXPENSES_PER_PAGE;
  const paginatedExpenses = sorted.slice(startIdx, endIdx);

  const tbody = document.getElementById('expensesTableBody');

  if (totalExpenses === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Brak wydatków do wyświetlenia</td></tr>';
    updatePaginationVisibility('expensesTableBody', totalExpenses);
    return;
  }

  const html = paginatedExpenses.map(exp => {
    const mergedInfo = exp.mergedFrom ? `<br><small style="color: #666; font-style: italic;">🔀 przeniesione z "${exp.mergedFrom}"</small>` : '';
    const categoryIcon = exp.category ? getCategoryIcon(exp.category) : '📌';

    return `
      <tr class="${exp.type === 'planned' ? 'planned' : 'realised'}">
        <td>${formatDateLabel(exp.date)}</td>
        <td>${exp.time || '-'}</td>
        <td>${exp.amount.toFixed(2)} zł</td>
        <td>${exp.userId && getBudgetUserNameFn ? getBudgetUserNameFn(exp.userId) : '-'}</td>
        <td>${categoryIcon} ${exp.category || 'Brak'}${mergedInfo}</td>
        <td>${exp.description || '-'}</td>
        <td>
          <span class="status-badge ${exp.type === 'normal' ? 'status-normal' : 'status-planned'}">
            ${exp.type === 'normal' ? '✓ Zwykły' : '⏳ Planowany'}
          </span>
        </td>
        <td class="actions">
          ${exp.type === 'planned' ? `<button class="btn-icon" data-action="realise-expense" data-id="${exp.id}" title="Zrealizuj teraz">✅</button>` : ''}
          <button class="btn-icon" data-action="edit-expense" data-id="${exp.id}" title="Edytuj">✏️</button>
          <button class="btn-icon" data-action="delete-expense" data-id="${exp.id}" title="Usuń">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
  renderExpensesPagination(totalExpenses);
  updatePaginationVisibility('expensesTableBody', totalExpenses);
}

function renderExpensesPagination(total) {
  const totalPages = Math.ceil(total / PAGINATION.EXPENSES_PER_PAGE);
  const container = document.getElementById('expensesPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button class="pagination-btn" ${currentExpensePage === 1 ? 'disabled' : ''} data-action="change-expense-page" data-page="${currentExpensePage - 1}">◀</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentExpensePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentExpensePage ? 'active' : ''}" data-action="change-expense-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentExpensePage === totalPages ? 'disabled' : ''} data-action="change-expense-page" data-page="${currentExpensePage + 1}">▶</button>`;
  container.innerHTML = html;
}

export function changeExpensePage(page) {
  const total = getExpenses().length;
  const totalPages = Math.ceil(total / PAGINATION.EXPENSES_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentExpensePage = page;
  renderExpenses();

  const tableBody = document.getElementById('expensesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updatePaginationVisibility(tableId, totalItems) {
  const paginationContainer = document.querySelector(`#${tableId} + .pagination-container`);
  if (!paginationContainer) return;

  const itemsPerPage = PAGINATION.EXPENSES_PER_PAGE;

  if (totalItems <= itemsPerPage) {
    paginationContainer.style.display = 'none';
  } else {
    paginationContainer.style.display = 'flex';
  }
}
