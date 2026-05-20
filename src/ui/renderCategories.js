// src/ui/renderCategories.js
import { getCategories, getExpenses } from '../modules/dataManager.js';
import { getCategoryIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { icon } from '../utils/icons.js';
import { getMergingCategoryId } from '../handlers/categoryHandlers.js';
import { PAGINATION } from '../utils/constants.js';
import { Fmt } from '../utils/fmt.js';

export const CAT_COLORS = [
  'oklch(0.6 0.12 155)', 'oklch(0.62 0.14 230)', 'oklch(0.58 0.15 25)',
  'oklch(0.66 0.13 60)', 'oklch(0.6 0.15 280)', 'oklch(0.62 0.12 185)',
  'oklch(0.64 0.13 340)', 'oklch(0.60 0.14 80)',  'oklch(0.63 0.11 200)',
];

let currentCategoryPage = 1;

export function renderCategories() {
  const categories = getCategories();
  const expenses = getExpenses();
  const container = document.getElementById('categoriesList');

  if (categories.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Brak kategorii. Dodaj pierwszą!</p></div>';
    return;
  }

  const monthStart = (() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })();
  const categoryStats = categories.map((cat, idx) => {
    const items = expenses.filter(e => e.category === cat.name && e.type === 'normal' && e.date >= monthStart);
    const totalAmount = items.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { ...cat, count: items.length, totalAmount, color: CAT_COLORS[idx % CAT_COLORS.length] };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  const totalAll = categoryStats.reduce((s, c) => s + c.totalAmount, 0);

  const mergingId = getMergingCategoryId();

  const iconTrash    = icon('Trash',         { size: 13, strokeWidth: 1.5 });
  const iconEdit     = icon('Edit',          { size: 13, strokeWidth: 1.5 });
  const iconSparkles = icon('Sparkles',      { size: 13, strokeWidth: 1.5 });
  const iconMore     = icon('MoreHorizontal', { size: 15, strokeWidth: 1.5 });
  const iconX        = icon('X',             { size: 13, strokeWidth: 2 });

  let headerHtml = '';
  if (mergingId) {
    const mergingCat = categoryStats.find(c => c.id === mergingId);
    if (mergingCat) {
      headerHtml = `
        <div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line));margin-bottom:4px">
          <div class="row">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-sunken);display:grid;place-items:center;font-size:18px">${getCategoryIcon(mergingCat.name)}</div>
            <div style="flex:1">
              <div style="font-weight:600">Scalanie: <span style="color:var(--accent)">${escapeHTML(mergingCat.name)}</span></div>
              <div class="text-mute text-sm">Wybierz kategorię docelową poniżej.</div>
            </div>
            <button class="btn sm ghost" data-action="cancel-merge-category">${iconX} Anuluj</button>
          </div>
        </div>
      `;
    }
  }

  const cardsHtml = categoryStats.map(cat => {
    const isMergingThis = mergingId === cat.id;
    const isMergeCandidate = mergingId && !isMergingThis;
    const isEmpty = cat.totalAmount === 0;
    const pct = totalAll > 0 ? (cat.totalAmount / totalAll * 100) : 0;
    const catIcon = cat.icon || getCategoryIcon(cat.name);
    const mergeOverlayStyle = isMergingThis
      ? 'outline:2px solid var(--accent);opacity:0.6;'
      : isMergeCandidate ? 'outline:1px dashed var(--accent);cursor:pointer;position:relative;' : '';
    const emptyStyle = isEmpty && !isMergingThis ? 'opacity:0.5;' : '';

    return `<div class="card" style="padding:18px;${mergeOverlayStyle}${emptyStyle}"
      ${isMergeCandidate ? `data-action="select-merge-target" data-id="${cat.id}"` : ''}>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="limit-tile-icon" style="background:color-mix(in srgb,${cat.color} 14%,transparent);color:${cat.color};font-size:18px">${catIcon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(cat.name)}</div>
          <div class="text-mute text-sm">${cat.count} transakcji · 30 dni</div>
        </div>
        ${!mergingId ? `
          <div style="position:relative">
            <button class="btn ghost icon-only sm" data-action="toggle-cat-menu" data-id="${cat.id}" title="Opcje">${iconMore}</button>
            <div class="cat-menu-dropdown" id="cat-menu-${cat.id}" style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:100;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);min-width:160px;padding:4px">
              <button class="cat-menu-item" data-action="edit-category" data-id="${cat.id}" data-name="${escapeHTML(cat.name)}">${iconEdit} Edytuj</button>
              <button class="cat-menu-item" data-action="start-merge-category" data-id="${cat.id}">${iconSparkles} Scal z inną…</button>
              <button class="cat-menu-item danger" data-action="delete-category" data-id="${cat.id}" data-name="${escapeHTML(cat.name)}">${iconTrash} Usuń</button>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="num" style="font-size:20px;font-weight:500">${Fmt.zl(cat.totalAmount)} <span class="text-mute text-sm">zł</span></div>
      ${!isEmpty ? `<div class="progress" style="margin-top:8px"><div style="width:${pct.toFixed(1)}%;height:100%;background:${cat.color};border-radius:inherit;transition:width 400ms ease"></div></div>
      <div class="text-mute text-sm" style="margin-top:6px">${pct.toFixed(1).replace('.', ',')}% wszystkich wydatków</div>` : ''}
      ${isMergeCandidate ? `<div style="position:absolute;inset:0;background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:inherit;display:grid;place-items:center;pointer-events:none"><span class="tag accent">Scal tutaj →</span></div>` : ''}
    </div>`;
  }).join('');

  container.innerHTML = headerHtml + `<div class="categories-grid">${cardsHtml}</div>`;

  const paginationContainer = container.nextElementSibling;
  if (paginationContainer && paginationContainer.classList.contains('pagination-container')) {
    paginationContainer.innerHTML = '';
  }
}

function renderCategoriesPagination(totalPages) {
  const categoriesList = document.getElementById('categoriesList');
  let paginationContainer = categoriesList.nextElementSibling;

  if (!paginationContainer || !paginationContainer.classList.contains('pagination-container')) {
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    categoriesList.parentNode.insertBefore(paginationContainer, categoriesList.nextSibling);
  }

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const chevLeft  = icon('ChevronLeft',  { size: 14, strokeWidth: 1.5 });
  const chevRight = icon('ChevronRight', { size: 14, strokeWidth: 1.5 });

  let html = '';
  html += `<button class="pagination-btn" ${currentCategoryPage === 1 ? 'disabled' : ''} data-action="change-category-page" data-page="${currentCategoryPage - 1}">${chevLeft}</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentCategoryPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentCategoryPage ? 'active' : ''}" data-action="change-category-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentCategoryPage === totalPages ? 'disabled' : ''} data-action="change-category-page" data-page="${currentCategoryPage + 1}">${chevRight}</button>`;

  paginationContainer.innerHTML = html;
}

export function changeCategoryPage(page) {
  const total = getCategories().length;
  const totalPages = Math.ceil(total / PAGINATION.CATEGORIES_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentCategoryPage = page;
  renderCategories();
}
