// src/utils/sanitizer.js
import DOMPurify from 'dompurify';

/**
 * Sanityzuje HTML przed wstawieniem do DOM
 * Zapobiega atakom XSS
 */
export function sanitizeHTML(html) {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'small', 'br', 'span', 'div', 'p', 'ul', 'li', 'button'],
    ALLOWED_ATTR: ['class', 'style', 'data-value', 'data-budget-id', 'data-budget-name', 'onclick', 'onmouseover', 'onmouseout'],
    ALLOW_DATA_ATTR: true
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
