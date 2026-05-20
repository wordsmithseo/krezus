// src/ui/renderExpenses.js
import { getExpenses, getCategories } from '../modules/dataManager.js';
import { PAGINATION } from '../utils/constants.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { icon } from '../utils/icons.js';
import { userChipHTML, catBadgeHTML } from './chips.js';
import { Fmt } from '../utils/fmt.js';

let currentExpensePage = 1;
let currentExpenseFilter = 'all'; // 'all' | 'normal' | 'planned'
let currentExpenseSearch = '';
let getBudgetUserNameFn = null;

export function setExpenseDeps({ getBudgetUserName }) {
  getBudgetUserNameFn = getBudgetUserName;
}

export function resetExpensePage() {
  currentExpensePage = 1;
}

export function setExpenseFilter(filter) {
  currentExpenseFilter = filter;
  currentExpensePage = 1;
  renderExpenses();
}

export function setExpenseSearch(query) {
  currentExpenseSearch = query.toLowerCase();
  currentExpensePage = 1;
  renderExpenses();
}

function getFilteredExpenses() {
  const sorted = [...getExpenses()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'planned' ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
  return sorted.filter(exp => {
    if (currentExpenseFilter === 'normal' && exp.type !== 'normal') return false;
    if (currentExpenseFilter === 'planned' && exp.type !== 'planned') return false;
    if (currentExpenseSearch) {
      const q = currentExpenseSearch;
      return (exp.description || '').toLowerCase().includes(q) ||
             (exp.category || '').toLowerCase().includes(q);
    }
    return true;
  });
}

export function renderExpenses() {
  const allExpenses = getExpenses();
  const filtered = getFilteredExpenses();
  const total = filtered.length;

  const startIdx = (currentExpensePage - 1) * PAGINATION.EXPENSES_PER_PAGE;
  const paginatedExpenses = filtered.slice(startIdx, startIdx + PAGINATION.EXPENSES_PER_PAGE);

  const tbody = document.getElementById('expensesTableBody');
  const tfoot = document.getElementById('expensesTfoot');
  const countEl = document.getElementById('expensesTableCount');

  // Sync segmented control active state
  document.querySelectorAll('#expenseFilterSeg button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentExpenseFilter);
  });

  if (total === 0) {
    const msg = allExpenses.length === 0
      ? 'Brak wydatków do wyświetlenia'
      : 'Brak wyników dla wybranych filtrów';
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${msg}</td></tr>`;
    if (tfoot) tfoot.innerHTML = '';
    if (countEl) countEl.textContent = '';
    renderExpensesPagination(0);
    updatePaginationVisibility(0);
    return;
  }

  const iconEdit  = icon('Edit',  { size: 13, strokeWidth: 1.5 });
  const iconTrash = icon('Trash', { size: 13, strokeWidth: 1.5 });
  const iconCheck = icon('Check', { size: 13, strokeWidth: 2 });

  const categories = getCategories();
  const catByName = name => categories.find(c => c.name === name) || null;

  const html = paginatedExpenses.map(exp => {
    const cat = exp.category ? catByName(exp.category) : null;
    const catHtml = cat
      ? catBadgeHTML(cat, true)
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
        <td class="amount" style="color:var(--danger);font-weight:500">−${Fmt.zl(exp.amount)}</td>
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

  // tfoot — suma widoczna (wszystkie przefiltrowane, nie tylko strona)
  if (tfoot) {
    const sum = filtered.reduce((acc, e) => acc + e.amount, 0);
    tfoot.innerHTML = `<tr>
      <td colspan="5" class="text-mute text-sm" style="padding:10px 16px">Suma widoczna</td>
      <td class="amount" style="font-weight:600;color:var(--danger)">−${Fmt.zl(sum)}</td>
      <td></td>
    </tr>`;
  }

  // Licznik "Wyświetlam X z Y"
  if (countEl) {
    const shown = paginatedExpenses.length;
    countEl.textContent = total === allExpenses.length
      ? `Wyświetlam ${shown} z ${total}`
      : `Wyświetlam ${shown} z ${total} (filtrowano z ${allExpenses.length})`;
  }

  renderExpensesPagination(total);
  updatePaginationVisibility(total);
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
  const totalPages = Math.ceil(getFilteredExpenses().length / PAGINATION.EXPENSES_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentExpensePage = page;
  renderExpenses();

  const tableBody = document.getElementById('expensesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updatePaginationVisibility(totalItems) {
  const container = document.getElementById('expensesPagination');
  if (!container) return;
  container.style.display = totalItems > PAGINATION.EXPENSES_PER_PAGE ? 'flex' : 'none';
}
