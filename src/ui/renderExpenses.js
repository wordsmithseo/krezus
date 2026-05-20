// src/ui/renderExpenses.js
import { getExpenses } from '../modules/dataManager.js';
import { PAGINATION } from '../utils/constants.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { getCategoryIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { icon } from '../utils/icons.js';
import { userChipHTML } from './chips.js';

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
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Brak wydatków do wyświetlenia</td></tr>';
    updatePaginationVisibility('expensesTableBody', totalExpenses);
    return;
  }

  const iconEdit  = icon('Edit',  { size: 13, strokeWidth: 1.5 });
  const iconTrash = icon('Trash', { size: 13, strokeWidth: 1.5 });
  const iconCheck = icon('Check', { size: 13, strokeWidth: 2 });

  const html = paginatedExpenses.map(exp => {
    const categoryIcon = exp.category ? getCategoryIcon(exp.category) : '';
    const catHtml = exp.category
      ? `<span class="cat-badge sm"><span class="cat-emoji">${categoryIcon}</span>${escapeHTML(exp.category)}</span>`
      : '<span class="text-mute text-sm">—</span>';

    return `
      <tr class="${exp.type === 'planned' ? 'planned' : 'realised'}">
        <td>
          <div style="font-weight:500">${formatDateLabel(exp.date)}</div>
          <div class="text-mute text-sm">${exp.time || ''}</div>
        </td>
        <td>${catHtml}</td>
        <td>${escapeHTML(exp.description || '—')}</td>
        <td>${exp.userId && getBudgetUserNameFn ? userChipHTML({ id: exp.userId, name: getBudgetUserNameFn(exp.userId) }) : '<span class="text-mute">—</span>'}</td>
        <td>${exp.type === 'planned'
          ? '<span class="tag info dot">Planowany</span>'
          : '<span class="tag success dot">Zrealizowany</span>'}</td>
        <td class="amount" style="color:var(--danger);font-weight:500">−${exp.amount.toFixed(2)}</td>
        <td class="actions">
          ${exp.type === 'planned' ? `<button class="btn sm" style="color:var(--success);border-color:color-mix(in srgb,var(--success) 30%,var(--line))" data-action="realise-expense" data-id="${exp.id}" title="Zrealizuj">${iconCheck} Zrealizuj</button>` : ''}
          <div class="row-actions">
            <button class="btn ghost icon-only sm" data-action="edit-expense" data-id="${exp.id}" title="Edytuj">${iconEdit}</button>
            <button class="btn ghost icon-only sm" data-action="delete-expense" data-id="${exp.id}" title="Usuń">${iconTrash}</button>
          </div>
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

  const chevLeft  = icon('ChevronLeft',  { size: 14, strokeWidth: 1.5 });
  const chevRight = icon('ChevronRight', { size: 14, strokeWidth: 1.5 });

  let html = '';
  html += `<button class="pagination-btn" ${currentExpensePage === 1 ? 'disabled' : ''} data-action="change-expense-page" data-page="${currentExpensePage - 1}">${chevLeft}</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentExpensePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentExpensePage ? 'active' : ''}" data-action="change-expense-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentExpensePage === totalPages ? 'disabled' : ''} data-action="change-expense-page" data-page="${currentExpensePage + 1}">${chevRight}</button>`;
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
