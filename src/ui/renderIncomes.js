// src/ui/renderIncomes.js
import { getIncomes } from '../modules/dataManager.js';
import { PAGINATION } from '../utils/constants.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { getSourceIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';

let currentIncomePage = 1;
let getBudgetUserNameFn = null;

export function setIncomeDeps({ getBudgetUserName }) {
  getBudgetUserNameFn = getBudgetUserName;
}

export function resetIncomePage() {
  currentIncomePage = 1;
}

export function renderSources() {
  const incomes = getIncomes();
  const totalIncomes = incomes.length;

  const sorted = [...incomes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'planned' ? -1 : 1;
    }
    return b.date.localeCompare(a.date);
  });

  const startIdx = (currentIncomePage - 1) * PAGINATION.INCOMES_PER_PAGE;
  const endIdx = startIdx + PAGINATION.INCOMES_PER_PAGE;
  const paginatedIncomes = sorted.slice(startIdx, endIdx);

  const tbody = document.getElementById('sourcesTableBody');

  if (totalIncomes === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Brak przychodów do wyświetlenia</td></tr>';
    updatePaginationVisibility('sourcesTableBody', totalIncomes);
    return;
  }

  const html = paginatedIncomes.map(inc => {
    const isCorrection = inc.source === 'KOREKTA';
    const rowClass = inc.type === 'planned' ? 'planned' : (isCorrection ? 'correction' : 'realised');
    const sourceIcon = !isCorrection && inc.source ? getSourceIcon(inc.source) : '';

    return `
    <tr class="${rowClass}">
      <td>${formatDateLabel(inc.date)}</td>
      <td>${inc.time || '-'}</td>
      <td>${inc.amount >= 0 ? '+' : ''}${inc.amount.toFixed(2)} zł</td>
      <td>${inc.userId && getBudgetUserNameFn ? getBudgetUserNameFn(inc.userId) : '-'}</td>
      <td>${isCorrection ? `<strong>⚙️ KOREKTA</strong><br><small>${inc.correctionReason || ''}</small>` : (sourceIcon ? `${sourceIcon} ${inc.source || 'Brak'}` : (inc.source || 'Brak'))}</td>
      <td>
        <span class="status-badge ${inc.type === 'normal' ? 'status-normal' : 'status-planned'}">
          ${inc.type === 'normal' ? '✓ Zwykły' : '⏳ Planowany'}
        </span>
      </td>
      <td class="actions">
         ${!isCorrection && inc.type === 'planned' ? `
           <button class="btn-icon" data-action="realise-income" data-id="${inc.id}" title="Zrealizuj teraz">✅</button>
           <button class="btn-icon" data-action="edit-income" data-id="${inc.id}" title="Edytuj">✏️</button>
           <button class="btn-icon" data-action="delete-income" data-id="${inc.id}" title="Usuń">🗑️</button>
         ` : '<span class="no-actions">-</span>'}
      </td>
    </tr>
  `}).join('');

  tbody.innerHTML = html;
  renderIncomesPagination(totalIncomes);
  updatePaginationVisibility('sourcesTableBody', totalIncomes);
}

function renderIncomesPagination(total) {
  const totalPages = Math.ceil(total / PAGINATION.INCOMES_PER_PAGE);
  const container = document.getElementById('incomesPagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button class="pagination-btn" ${currentIncomePage === 1 ? 'disabled' : ''} data-action="change-income-page" data-page="${currentIncomePage - 1}">◀</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentIncomePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentIncomePage ? 'active' : ''}" data-action="change-income-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentIncomePage === totalPages ? 'disabled' : ''} data-action="change-income-page" data-page="${currentIncomePage + 1}">▶</button>`;
  container.innerHTML = html;
}

export function changeIncomePage(page) {
  const total = getIncomes().length;
  const totalPages = Math.ceil(total / PAGINATION.INCOMES_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentIncomePage = page;
  renderSources();

  const tableBody = document.getElementById('sourcesTableBody');
  if (tableBody) {
    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updatePaginationVisibility(tableId, totalItems) {
  const paginationContainer = document.querySelector(`#${tableId} + .pagination-container`);
  if (!paginationContainer) return;

  const itemsPerPage = PAGINATION.INCOMES_PER_PAGE;

  if (totalItems <= itemsPerPage) {
    paginationContainer.style.display = 'none';
  } else {
    paginationContainer.style.display = 'flex';
  }
}
