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
let currentIncomeFilter = 'normal'; // 'normal' | 'planned'
let currentIncomeSearch = '';
let getBudgetUserNameFn = null;

let advancedIncomeFilters = { dateFrom: '', dateTo: '', amountMin: '', amountMax: '', users: [] };
let incomeFilterPanelOpen = false;
let getIncUsersCacheFn = null;

export function setIncomeDeps({ getBudgetUserName }) {
  getBudgetUserNameFn = getBudgetUserName;
}

export function setIncomeAdvancedDeps({ getBudgetUsersCache }) {
  getIncUsersCacheFn = getBudgetUsersCache;
}

export function toggleIncomeFilterPanel() {
  incomeFilterPanelOpen = !incomeFilterPanelOpen;
  if (incomeFilterPanelOpen) _renderIncomeFilterPanel();
  else _closeIncomeFilterPanel();
}

export function applyIncomeFilters() {
  const panel = document.getElementById('incomeFilterPanel');
  if (!panel) return;
  advancedIncomeFilters = {
    dateFrom:  document.getElementById('incDateFrom')?.value  || '',
    dateTo:    document.getElementById('incDateTo')?.value    || '',
    amountMin: document.getElementById('incAmountMin')?.value || '',
    amountMax: document.getElementById('incAmountMax')?.value || '',
    users:     [...panel.querySelectorAll('#incUserList .active')].map(b => b.dataset.userId),
  };
  incomeFilterPanelOpen = false;
  _closeIncomeFilterPanel();
  currentIncomePage = 1;
  renderSources();
}

export function resetIncomeFilters() {
  advancedIncomeFilters = { dateFrom: '', dateTo: '', amountMin: '', amountMax: '', users: [] };
  incomeFilterPanelOpen = false;
  _closeIncomeFilterPanel();
  currentIncomePage = 1;
  renderSources();
}

function _hasActiveIncomeFilters() {
  const f = advancedIncomeFilters;
  return f.dateFrom || f.dateTo || f.amountMin !== '' || f.amountMax !== '' || f.users.length > 0;
}

function _closeIncomeFilterPanel() {
  const panel = document.getElementById('incomeFilterPanel');
  if (panel) panel.style.display = 'none';
  _syncIncomeFilterBtn();
}

function _syncIncomeFilterBtn() {
  const active = _hasActiveIncomeFilters();
  const btn = document.querySelector('[data-action="toggle-income-filters"]');
  if (btn) {
    btn.style.color = active ? 'var(--accent)' : '';
    btn.style.borderColor = active ? 'var(--accent)' : '';
    const txt = btn.querySelector('.filter-label');
    if (txt) txt.textContent = 'Filtry';
  }
  const clearBtn = document.getElementById('incomeClearFilters');
  if (clearBtn) {
    clearBtn.style.display = active ? 'inline-flex' : 'none';
    const lbl = document.getElementById('incomeClearLabel');
    if (lbl) lbl.textContent = `Wyczyść (${_countActiveIncomeFilters()})`;
  }
}

function _countActiveIncomeFilters() {
  const f = advancedIncomeFilters;
  let n = 0;
  if (f.dateFrom || f.dateTo) n++;
  if (f.amountMin !== '' || f.amountMax !== '') n++;
  if (f.users.length > 0) n++;
  return n;
}

function _renderIncomeFilterPanel() {
  const panel = document.getElementById('incomeFilterPanel');
  if (!panel) return;

  const users = getIncUsersCacheFn ? getIncUsersCacheFn() : [];
  const f = advancedIncomeFilters;

  const LABEL = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);margin-bottom:7px';
  const INPUT = 'flex:1;font-size:12px;padding:5px 9px;min-width:0';
  const SEP   = 'color:var(--ink-3);font-size:13px;flex-shrink:0;padding:0 2px';

  panel.innerHTML = `
    <div style="padding:14px 20px;background:var(--surface-2);border-bottom:1px solid var(--line);animation:slideUp 150ms ease both">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:14px">
        <div>
          <div style="${LABEL}">Okres</div>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="date" id="incDateFrom" class="input" style="${INPUT}">
            <span style="${SEP}">—</span>
            <input type="date" id="incDateTo" class="input" style="${INPUT}">
          </div>
        </div>
        <div>
          <div style="${LABEL}">Kwota (zł)</div>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" id="incAmountMin" class="input" style="${INPUT}" min="0" placeholder="0">
            <span style="${SEP}">—</span>
            <input type="number" id="incAmountMax" class="input" style="${INPUT}" min="0" placeholder="∞">
          </div>
        </div>
      </div>
      <div id="incUserSection" style="display:none;margin-bottom:14px">
        <div style="${LABEL}">Użytkownik</div>
        <div id="incUserList" style="display:flex;flex-wrap:wrap;gap:5px"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--line)">
        <button class="btn sm ghost" data-action="reset-income-filters" style="color:var(--ink-3)">Resetuj</button>
        <button class="btn sm btn-accent" data-action="apply-income-filters">Zastosuj filtry</button>
      </div>
    </div>
  `;

  document.getElementById('incDateFrom').value  = f.dateFrom;
  document.getElementById('incDateTo').value    = f.dateTo;
  document.getElementById('incAmountMin').value = f.amountMin;
  document.getElementById('incAmountMax').value = f.amountMax;

  if (users.length > 1) {
    document.getElementById('incUserSection').style.display = 'block';
    const list = document.getElementById('incUserList');
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
  _syncIncomeFilterBtn();
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
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return (b.time || '').localeCompare(a.time || '');
  });
  const isCorrection = inc => inc.source === 'KOREKTA';
  const f = advancedIncomeFilters;
  return sorted.filter(inc => {
    if (currentIncomeFilter === 'all' && inc.type === 'planned') return false;
    if (currentIncomeFilter === 'normal' && (inc.type === 'planned' || isCorrection(inc))) return false;
    if (currentIncomeFilter === 'planned' && inc.type !== 'planned') return false;
    if (currentIncomeFilter === 'corrections' && !isCorrection(inc)) return false;
    if (currentIncomeSearch) {
      const q = currentIncomeSearch;
      if (!(inc.source || '').toLowerCase().includes(q) &&
          !(inc.description || '').toLowerCase().includes(q)) return false;
    }
    if (f.dateFrom && inc.date < f.dateFrom) return false;
    if (f.dateTo   && inc.date > f.dateTo)   return false;
    if (f.amountMin !== '' && Math.abs(inc.amount) < parseFloat(f.amountMin)) return false;
    if (f.amountMax !== '' && Math.abs(inc.amount) > parseFloat(f.amountMax)) return false;
    if (f.users.length > 0 && !f.users.includes(inc.userId || '')) return false;
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

  _syncIncomeFilterBtn();

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

  const iconEdit  = icon('Edit',  { size: 14, strokeWidth: 1.5 });
  const iconTrash = icon('Trash', { size: 14, strokeWidth: 1.5 });
  const iconCheck = icon('Check', { size: 14, strokeWidth: 2 });

  const html = paginatedIncomes.map(inc => {
    const isCorrection = inc.source === 'KOREKTA';
    const rowClass = inc.type === 'planned' ? 'planned' : (isCorrection ? 'correction' : 'realised');
    const sourceIcon = !isCorrection && inc.source ? getSourceIcon(inc.source) : '';
    const sourceHtml = isCorrection
      ? `<span style="font-weight:600">KOREKTA</span>${inc.correctionReason ? `<br><span class="text-mute text-sm">${escapeHTML(inc.correctionReason)}</span>` : ''}`
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
        ? '<span class="tag info dot">Korekta</span>'
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
