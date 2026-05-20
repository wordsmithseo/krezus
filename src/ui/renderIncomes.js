// src/ui/renderIncomes.js
import { getIncomes } from '../modules/dataManager.js';
import { PAGINATION } from '../utils/constants.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { getSourceIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { icon } from '../utils/icons.js';
import { userChipHTML } from './chips.js';
import { Fmt } from '../utils/fmt.js';

let currentIncomePage = 1;
let currentIncomeFilter = 'all'; // 'all' | 'normal' | 'planned'
let currentIncomeSearch = '';
let getBudgetUserNameFn = null;

export function setIncomeDeps({ getBudgetUserName }) {
  getBudgetUserNameFn = getBudgetUserName;
}

export function resetIncomePage() {
  currentIncomePage = 1;
}

export function setIncomeFilter(filter) {
  currentIncomeFilter = filter;
  currentIncomePage = 1;
  renderSources();
}

export function setIncomeSearch(query) {
  currentIncomeSearch = query.toLowerCase();
  currentIncomePage = 1;
  renderSources();
}

function getFilteredIncomes() {
  const sorted = [...getIncomes()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'planned' ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
  return sorted.filter(inc => {
    // 'normal' includes corrections (type !== 'planned')
    if (currentIncomeFilter === 'normal' && inc.type === 'planned') return false;
    if (currentIncomeFilter === 'planned' && inc.type !== 'planned') return false;
    if (currentIncomeSearch) {
      const q = currentIncomeSearch;
      return (inc.source || '').toLowerCase().includes(q) ||
             (inc.description || '').toLowerCase().includes(q);
    }
    return true;
  });
}

export function renderSources() {
  const allIncomes = getIncomes();
  const filtered = getFilteredIncomes();
  const total = filtered.length;

  const startIdx = (currentIncomePage - 1) * PAGINATION.INCOMES_PER_PAGE;
  const paginatedIncomes = filtered.slice(startIdx, startIdx + PAGINATION.INCOMES_PER_PAGE);

  const tbody = document.getElementById('sourcesTableBody');
  const tfoot = document.getElementById('sourcesTfoot');
  const countEl = document.getElementById('incomesTableCount');

  // Sync segmented control active state
  document.querySelectorAll('#incomeFilterSeg button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentIncomeFilter);
  });

  if (total === 0) {
    const msg = allIncomes.length === 0
      ? 'Brak przychodów do wyświetlenia'
      : 'Brak wyników dla wybranych filtrów';
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${msg}</td></tr>`;
    if (tfoot) tfoot.innerHTML = '';
    if (countEl) countEl.textContent = '';
    renderIncomesPagination(0);
    updatePaginationVisibility(0);
    return;
  }

  const iconEdit  = icon('Edit',  { size: 13, strokeWidth: 1.5 });
  const iconTrash = icon('Trash', { size: 13, strokeWidth: 1.5 });
  const iconCheck = icon('Check', { size: 13, strokeWidth: 2 });

  const html = paginatedIncomes.map(inc => {
    const isCorrection = inc.source === 'KOREKTA';
    const rowClass = inc.type === 'planned' ? 'planned' : (isCorrection ? 'correction' : 'realised');
    const sourceIcon = !isCorrection && inc.source ? getSourceIcon(inc.source) : '';
    const sourceHtml = isCorrection
      ? `<span style="font-weight:600">⚙️ KOREKTA</span>${inc.correctionReason ? `<br><span class="text-mute text-sm">${escapeHTML(inc.correctionReason)}</span>` : ''}`
      : escapeHTML(sourceIcon ? `${sourceIcon} ${inc.source || 'Brak'}` : (inc.source || 'Brak'));

    return `
    <tr class="${rowClass}">
      <td>
        <div style="font-weight:500">${formatDateLabel(inc.date)}</div>
        <div class="text-mute text-sm">${inc.time || ''}</div>
      </td>
      <td>${sourceHtml}</td>
      <td>${inc.userId && getBudgetUserNameFn ? userChipHTML({ id: inc.userId, name: getBudgetUserNameFn(inc.userId) }) : '<span class="text-mute">—</span>'}</td>
      <td>${isCorrection
        ? '<span class="tag accent dot">Korekta</span>'
        : inc.type === 'planned'
          ? '<span class="tag info dot">Planowany</span>'
          : '<span class="tag success dot">Zrealizowany</span>'}</td>
      <td class="amount" style="color:var(--success);font-weight:500">${inc.amount >= 0 ? '+' : ''}${Fmt.zl(Math.abs(inc.amount))}</td>
      <td class="actions">
        ${!isCorrection ? `
          ${inc.type === 'planned' ? `<button class="btn sm" style="color:var(--success);border-color:color-mix(in srgb,var(--success) 30%,var(--line))" data-action="realise-income" data-id="${inc.id}" title="Zrealizuj">${iconCheck} Zrealizuj</button>` : ''}
          <div class="row-actions">
            <button class="btn ghost icon-only sm" data-action="edit-income" data-id="${inc.id}" title="Edytuj">${iconEdit}</button>
            <button class="btn ghost icon-only sm" data-action="delete-income" data-id="${inc.id}" title="Usuń">${iconTrash}</button>
          </div>
        ` : ''}
      </td>
    </tr>
  `}).join('');

  tbody.innerHTML = html;

  // tfoot — suma widoczna (wszystkie przefiltrowane)
  if (tfoot) {
    const sum = filtered.reduce((acc, i) => acc + i.amount, 0);
    const sign = sum >= 0 ? '+' : '';
    tfoot.innerHTML = `<tr>
      <td colspan="4" class="text-mute text-sm" style="padding:10px 16px">Suma widoczna</td>
      <td class="amount" style="font-weight:600;color:var(--success)">${sign}${Fmt.zl(Math.abs(sum))}</td>
      <td></td>
    </tr>`;
  }

  // Licznik "Wyświetlam X z Y"
  if (countEl) {
    const shown = paginatedIncomes.length;
    countEl.textContent = total === allIncomes.length
      ? `Wyświetlam ${shown} z ${total}`
      : `Wyświetlam ${shown} z ${total} (filtrowano z ${allIncomes.length})`;
  }

  renderIncomesPagination(total);
  updatePaginationVisibility(total);
}

function renderIncomesPagination(total) {
  const totalPages = Math.ceil(total / PAGINATION.INCOMES_PER_PAGE);
  const container = document.getElementById('incomesPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const chevLeft  = icon('ChevronLeft',  { size: 14, strokeWidth: 1.5 });
  const chevRight = icon('ChevronRight', { size: 14, strokeWidth: 1.5 });

  let html = '';
  html += `<button class="pagination-btn" ${currentIncomePage === 1 ? 'disabled' : ''} data-action="change-income-page" data-page="${currentIncomePage - 1}">${chevLeft}</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentIncomePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentIncomePage ? 'active' : ''}" data-action="change-income-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentIncomePage === totalPages ? 'disabled' : ''} data-action="change-income-page" data-page="${currentIncomePage + 1}">${chevRight}</button>`;
  container.innerHTML = html;
}

export function changeIncomePage(page) {
  const totalPages = Math.ceil(getFilteredIncomes().length / PAGINATION.INCOMES_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentIncomePage = page;
  renderSources();

  const tableBody = document.getElementById('sourcesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updatePaginationVisibility(totalItems) {
  const container = document.getElementById('incomesPagination');
  if (!container) return;
  container.style.display = totalItems > PAGINATION.INCOMES_PER_PAGE ? 'flex' : 'none';
}
