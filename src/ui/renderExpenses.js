// src/ui/renderExpenses.js
import { getExpenses, getCategories } from '../modules/dataManager.js';
import { PAGINATION } from '../utils/constants.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { icon } from '../utils/icons.js';
import { userChipHTML, catBadgeHTML } from './chips.js';
import { Fmt } from '../utils/fmt.js';
import { CAT_COLORS } from './renderCategories.js';

let currentExpensePage = 1;
let currentExpenseFilter = 'normal'; // 'normal' | 'planned'
let currentExpenseSearch = '';
let getBudgetUserNameFn = null;

let advancedFilters = { dateFrom: '', dateTo: '', amountMin: '', amountMax: '', categories: [], users: [] };
let filterPanelOpen = false;
let getExpCategoriesFn = null;
let getExpUsersCacheFn = null;

export function setExpenseDeps({ getBudgetUserName }) {
  getBudgetUserNameFn = getBudgetUserName;
}

export function setExpenseAdvancedDeps({ getCategories: getCatFn, getBudgetUsersCache }) {
  getExpCategoriesFn = getCatFn;
  getExpUsersCacheFn = getBudgetUsersCache;
}

export function toggleExpenseFilterPanel() {
  filterPanelOpen = !filterPanelOpen;
  if (filterPanelOpen) _renderExpenseFilterPanel();
  else _closeExpenseFilterPanel();
}

export function applyExpenseFilters() {
  const panel = document.getElementById('expenseFilterPanel');
  if (!panel) return;
  advancedFilters = {
    dateFrom: document.getElementById('expDateFrom')?.value || '',
    dateTo:   document.getElementById('expDateTo')?.value   || '',
    amountMin: document.getElementById('expAmountMin')?.value || '',
    amountMax: document.getElementById('expAmountMax')?.value || '',
    categories: [...panel.querySelectorAll('#expCatList .active')].map(b => b.dataset.catName),
    users:      [...panel.querySelectorAll('#expUserList .active')].map(b => b.dataset.userId),
  };
  filterPanelOpen = false;
  _closeExpenseFilterPanel();
  currentExpensePage = 1;
  renderExpenses();
}

export function resetExpenseFilters() {
  advancedFilters = { dateFrom: '', dateTo: '', amountMin: '', amountMax: '', categories: [], users: [] };
  filterPanelOpen = false;
  _closeExpenseFilterPanel();
  currentExpensePage = 1;
  renderExpenses();
}

function _hasActiveExpenseFilters() {
  const f = advancedFilters;
  return f.dateFrom || f.dateTo || f.amountMin !== '' || f.amountMax !== '' || f.categories.length > 0 || f.users.length > 0;
}

function _closeExpenseFilterPanel() {
  const panel = document.getElementById('expenseFilterPanel');
  if (panel) panel.style.display = 'none';
  _syncExpenseFilterBtn();
}

function _syncExpenseFilterBtn() {
  const active = _hasActiveExpenseFilters();
  const btn = document.querySelector('[data-action="toggle-expense-filters"]');
  if (btn) {
    btn.style.color = active ? 'var(--accent)' : '';
    btn.style.borderColor = active ? 'var(--accent)' : '';
    const txt = btn.querySelector('.filter-label');
    if (txt) txt.textContent = 'Filtry';
  }
  const clearBtn = document.getElementById('expenseClearFilters');
  if (clearBtn) {
    clearBtn.style.display = active ? 'inline-flex' : 'none';
    const lbl = document.getElementById('expenseClearLabel');
    if (lbl) lbl.textContent = `Wyczyść (${_countActiveExpenseFilters()})`;
  }
}

function _countActiveExpenseFilters() {
  const f = advancedFilters;
  let n = 0;
  if (f.dateFrom || f.dateTo) n++;
  if (f.amountMin !== '' || f.amountMax !== '') n++;
  if (f.categories.length > 0) n++;
  if (f.users.length > 0) n++;
  return n;
}

function _renderExpenseFilterPanel() {
  const panel = document.getElementById('expenseFilterPanel');
  if (!panel) return;

  const cats  = getExpCategoriesFn ? getExpCategoriesFn() : [];
  const users = getExpUsersCacheFn ? getExpUsersCacheFn() : [];
  const f = advancedFilters;

  const LABEL = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);margin-bottom:7px';
  const INPUT = 'flex:1;font-size:12px;padding:5px 9px;min-width:0';
  const SEP   = 'color:var(--ink-3);font-size:13px;flex-shrink:0;padding:0 2px';

  panel.innerHTML = `
    <div style="padding:14px 20px;background:var(--surface-2);border-bottom:1px solid var(--line);animation:slideUp 150ms ease both">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:14px">
        <div>
          <div style="${LABEL}">Okres</div>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="date" id="expDateFrom" class="input" style="${INPUT}">
            <span style="${SEP}">—</span>
            <input type="date" id="expDateTo" class="input" style="${INPUT}">
          </div>
        </div>
        <div>
          <div style="${LABEL}">Kwota (zł)</div>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" id="expAmountMin" class="input" style="${INPUT}" min="0" placeholder="0">
            <span style="${SEP}">—</span>
            <input type="number" id="expAmountMax" class="input" style="${INPUT}" min="0" placeholder="∞">
          </div>
        </div>
      </div>
      <div id="expCatSection" style="display:none;margin-bottom:14px">
        <div style="${LABEL}">Kategorie</div>
        <div id="expCatList" style="display:flex;flex-wrap:wrap;gap:5px;max-height:88px;overflow-y:auto"></div>
      </div>
      <div id="expUserSection" style="display:none;margin-bottom:14px">
        <div style="${LABEL}">Użytkownik</div>
        <div id="expUserList" style="display:flex;flex-wrap:wrap;gap:5px"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--line)">
        <button class="btn sm ghost" data-action="reset-expense-filters" style="color:var(--ink-3)">Resetuj</button>
        <button class="btn sm btn-accent" data-action="apply-expense-filters">Zastosuj filtry</button>
      </div>
    </div>
  `;

  document.getElementById('expDateFrom').value  = f.dateFrom;
  document.getElementById('expDateTo').value    = f.dateTo;
  document.getElementById('expAmountMin').value = f.amountMin;
  document.getElementById('expAmountMax').value = f.amountMax;

  if (cats.length > 0) {
    document.getElementById('expCatSection').style.display = 'block';
    const list = document.getElementById('expCatList');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-quick-btn' + (f.categories.includes(cat.name) ? ' active' : '');
      btn.textContent = cat.name;
      btn.dataset.catName = cat.name;
      btn.type = 'button';
      btn.addEventListener('click', () => btn.classList.toggle('active'));
      list.appendChild(btn);
    });
  }

  if (users.length > 1) {
    document.getElementById('expUserSection').style.display = 'block';
    const list = document.getElementById('expUserList');
    users.forEach(u => {
      const btn = document.createElement('button');
      btn.className = 'category-quick-btn' + (f.users.includes(u.id) ? ' active' : '');
      btn.textContent = u.name || u.id;
      btn.dataset.userId = u.id;
      btn.type = 'button';
      btn.addEventListener('click', () => btn.classList.toggle('active'));
      list.appendChild(btn);
    });
  }

  panel.style.display = 'block';
  _syncExpenseFilterBtn();
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
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return (b.time || '').localeCompare(a.time || '');
  });
  const f = advancedFilters;
  return sorted.filter(exp => {
    if (currentExpenseFilter === 'all' && exp.type === 'planned') return false;
    if (currentExpenseFilter === 'normal' && exp.type !== 'normal') return false;
    if (currentExpenseFilter === 'planned' && exp.type !== 'planned') return false;
    if (currentExpenseSearch) {
      const q = currentExpenseSearch;
      if (!(exp.description || '').toLowerCase().includes(q) &&
          !(exp.category || '').toLowerCase().includes(q)) return false;
    }
    if (f.dateFrom && exp.date < f.dateFrom) return false;
    if (f.dateTo   && exp.date > f.dateTo)   return false;
    if (f.amountMin !== '' && exp.amount < parseFloat(f.amountMin)) return false;
    if (f.amountMax !== '' && exp.amount > parseFloat(f.amountMax)) return false;
    if (f.categories.length > 0 && !f.categories.includes(exp.category || '')) return false;
    if (f.users.length > 0 && !f.users.includes(exp.userId || '')) return false;
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

  _syncExpenseFilterBtn();

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

  const iconEdit  = icon('Edit',  { size: 14, strokeWidth: 1.5 });
  const iconTrash = icon('Trash', { size: 14, strokeWidth: 1.5 });
  const iconCheck = icon('Check', { size: 14, strokeWidth: 2 });

  const categories = getCategories().map((cat, idx) => ({ ...cat, color: CAT_COLORS[idx % CAT_COLORS.length] }));
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
