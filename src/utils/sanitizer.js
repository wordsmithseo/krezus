// src/utils/sanitizer.js
import DOMPurify from 'dompurify';

/**
 * Sanityzuje HTML przed wstawieniem do DOM
 * Zapobiega atakom XSS
 */
export function sanitizeHTML(html) {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'small', 'br', 'span', 'div', 'p', 'ul', 'ol', 'li', 'button', 'hr', 'label',
      'svg', 'path', 'line', 'polyline', 'polygon', 'circle', 'rect', 'g', 'defs', 'use',
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'data-value', 'data-budget-id', 'data-budget-name', 'data-action',
      'data-id', 'data-name', 'data-category-id', 'data-expense-id', 'data-income-id',
      'data-page', 'data-end-date', 'data-end-time', 'data-cat-id', 'data-tip',
      'xmlns', 'viewBox', 'preserveAspectRatio', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
      'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'd', 'points',
      'transform', 'aria-hidden', 'aria-label', 'aria-pressed', 'role', 'tabindex',
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Escape'uje tekst dla bezpiecznego użycia w atrybutach HTML
 */
export function escapeHTML(text) {
  if (!text) return '';

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Bezpieczne ustawienie innerHTML
 */
export function setInnerHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHTML(html);
}

/**
 * Bezpieczne dodanie HTML jako dziecko
 */
export function appendSanitizedHTML(parent, html) {
  if (!parent) return;

  const temp = document.createElement('div');
  temp.innerHTML = sanitizeHTML(html);

  while (temp.firstChild) {
    parent.appendChild(temp.firstChild);
  }
}
