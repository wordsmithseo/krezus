/**
 * Inicjalizacja sidebara — podmienia stare SVG ikon na Lucide,
 * zarządza stanem active/aria-current i obsługuje mobile drawer.
 */

import { iconEl, ICONS } from '@utils/icons.js';

/* Mapowanie data-section → nazwa ikony z ICONS */
const SECTION_ICONS = {
  summarySection:     'Dashboard',
  envelopeSection:    'Envelope',
  expensesSection:    'ArrowDown',
  sourcesSection:     'ArrowUp',
  categoriesSection:  'Tag',
  simulationSection:  'Crystal',
  analyticsSection:   'Chart',
  savingsGoalsSection:'Target',
  settingsSection:    'Settings',
};

/**
 * Podmienia stare Bootstrap SVG w .nav-icon na ikony Lucide
 * i wstrzykuje ikony do topbar buttonów (data-icon).
 * Wywołaj raz po DOMContentLoaded.
 */
export function initNavIcons() {
  // Nav items — ikony z mapowania sekcji
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    const iconName = SECTION_ICONS[btn.dataset.section];
    if (!iconName) return;
    const oldIcon = btn.querySelector('.nav-icon');
    const newIcon = iconEl(iconName, { size: 16, strokeWidth: 1.5 });
    newIcon.classList.add('nav-icon');
    if (oldIcon) oldIcon.replaceWith(newIcon);
    else btn.prepend(newIcon);
  });

  // Topbar i inne elementy z data-icon
  injectIcons();
}

/**
 * Wstrzykuje ikony Lucide do elementów z atrybutem data-icon.
 * Obsługuje nav items (initNavIcons) i topbar buttons.
 * @param {Element} root - korzeń przeszukiwania (domyślnie document)
 */
export function injectIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    const fn   = ICONS[name];
    if (!fn) return;
    const size = el.classList.contains('icon-only') ? 16 : 14;
    const svg  = iconEl(fn, { size, strokeWidth: 1.5 });
    el.prepend(svg);
    el.removeAttribute('data-icon');
  });
}

/**
 * Ustawia aktywny nav item — aktualizuje klasy i aria-current.
 * @param {string} sectionId - np. "summarySection"
 */
export function setActiveNavItem(sectionId) {
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    const isActive = btn.dataset.section === sectionId;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
}

/* ===== MOBILE DRAWER ===== */

let _escHandler = null;

/**
 * Otwiera lub zamyka mobile drawer.
 * @param {boolean} open
 */
export function setMobileDrawer(open) {
  const sidebar  = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  sidebar.dataset.open  = open ? 'true' : 'false';
  if (backdrop) backdrop.dataset.open = open ? 'true' : 'false';
  document.body.dataset.drawerOpen = open ? 'true' : '';

  if (open) {
    _escHandler = (e) => { if (e.key === 'Escape') setMobileDrawer(false); };
    document.addEventListener('keydown', _escHandler);
  } else if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
}

/**
 * Inicjalizuje logikę mobile drawer (backdrop click, zamykanie po nav-item).
 * Wywołaj raz po DOMContentLoaded.
 * @param {Function} onNavItem - callback wywoływany po kliknięciu nav item (opcjonalny)
 */
export function initMobileDrawer(onNavItem) {
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => setMobileDrawer(false));
  }
}
