// src/utils/theme.js
const STORAGE_KEY = 'krezus_theme';
let selectorReady = false;

export function getThemePreference() {
  return localStorage.getItem(STORAGE_KEY) || 'auto';
}

export function applyTheme(preference) {
  const html = document.documentElement;
  if (preference === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (preference === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
}

export function setTheme(preference) {
  localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
  syncThemeButtons(preference);
}

export function initTheme() {
  applyTheme(getThemePreference());
}

export function initThemeSelector() {
  const pref = getThemePreference();
  syncThemeButtons(pref);
  if (selectorReady) return;
  selectorReady = true;
  document.querySelectorAll('[data-theme-value]').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeValue));
  });
}

function syncThemeButtons(active) {
  document.querySelectorAll('[data-theme-value]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeValue === active);
  });
}
