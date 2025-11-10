// src/utils/uiHelpers.js
import { PAGINATION } from './constants.js';
import { sanitizeHTML, escapeHTML } from './sanitizer.js';

/**
 * Bezpiecznie pobiera nazwę użytkownika budżetu
 */
export function getBudgetUserName(userId, budgetUsersCache) {
  const user = budgetUsersCache.find(u => u.id === userId);
  return user ? escapeHTML(user.name) : 'Nieznany';
}

/**
 * Aktualizuje widoczność paginacji
 */
export function updatePaginationVisibility(tableId, totalItems) {
  const paginationContainer = document.querySelector(`#${tableId} + .pagination-container`);
  if (!paginationContainer) return;

  const itemsPerPage = tableId.includes('expense') ? PAGINATION.EXPENSES_PER_PAGE : PAGINATION.INCOMES_PER_PAGE;

  if (totalItems <= itemsPerPage) {
    paginationContainer.style.display = 'none';
  } else {
    paginationContainer.style.display = 'flex';
  }
}

/**
 * Aktualizuje nazwę wyświetlaną w UI
 */
export function updateDisplayNameInUI(displayName) {
  const safeName = escapeHTML(displayName);

  const usernameSpan = document.getElementById('username');
  if (usernameSpan) usernameSpan.textContent = safeName;

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) profileBtn.textContent = `👤 ${safeName}`;

  document.querySelectorAll('[data-username]').forEach(el => {
    el.textContent = safeName;
  });
}

/**
 * Ukrywa loader aplikacji
 */
export function hideLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
}

/**
 * Renderuje przyciski paginacji
 */
export function renderPaginationButtons(currentPage, totalPages, onPageChange, maxButtons = PAGINATION.MAX_PAGE_BUTTONS) {
  let html = '';
  html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">◀</button>`;

  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">▶</button>`;

  return html;
}

/**
 * Dodaje event listenery do przycisków paginacji
 */
export function attachPaginationListeners(container, onPageChange) {
  if (!container) return;

  const buttons = container.querySelectorAll('.pagination-btn[data-page]');
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      const page = parseInt(e.target.dataset.page);
      if (!isNaN(page)) {
        onPageChange(page);
      }
    });
  });
}

/**
 * Pokazuje sekcję aplikacji
 */
export function showSection(sectionId, onSectionChange) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.querySelector(`[data-section="${sectionId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Zamknij menu mobilne jeśli otwarte
  if (window.innerWidth <= 768) {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.querySelector('.nav-hamburger');
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      if (hamburger) hamburger.classList.remove('active');
    }
  }

  // Wywołaj callback jeśli istnieje
  if (onSectionChange) {
    onSectionChange(sectionId);
  }
}
