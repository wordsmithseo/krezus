// src/utils/dateHelpers.js

/**
 * Cache dla sparsowanych dat (optymalizacja)
 */
const dateCache = new Map();

/**
 * Parsuj string daty do obiektu Date
 * @param {string} dateStr - String daty (YYYY-MM-DD lub MM/DD/YYYY)
 * @returns {Date} - Obiekt Date
 */
export function parseDateStr(dateStr) {
  if (!dateStr) return new Date(NaN);
  
  // Sprawdź cache
  if (dateCache.has(dateStr)) {
    return new Date(dateCache.get(dateStr));
  }
  
  let date;
  
  // Format ISO (YYYY-MM-DD)
  if (dateStr.includes('-')) {
    date = new Date(dateStr);
  }
  // Format US (MM/DD/YYYY)
  else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } else {
      date = new Date(dateStr);
    }
  }
  else {
    date = new Date(dateStr);
  }
  
  // Zapisz w cache
  if (!isNaN(date.getTime())) {
    dateCache.set(dateStr, date.getTime());
  }
  
  return date;
}

/**
 * Parsuj datę i czas do obiektu Date
 * @param {string} dateStr - String daty
 * @param {string} timeStr - String czasu (HH:MM)
 * @returns {Date} - Obiekt Date z czasem
 */
export function parseDateTime(dateStr, timeStr) {
  const dateObj = parseDateStr(dateStr);
  if (isNaN(dateObj)) return new Date(NaN);
  
  let hours = 0;
  let minutes = 0;
  
  if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;
  }
  
  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj;
}

/**
 * Pobierz aktualną datę w formacie YYYY-MM-DD dla strefy czasowej Warsaw
 * @returns {string} - Data w formacie YYYY-MM-DD
 */
export function getWarsawDateString() {
  const now = new Date();
  const localeStr = now.toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' });
  return localeStr.slice(0, 10);
}

/**
 * Pobierz aktualny czas w formacie HH:MM
 * @returns {string} - Czas w formacie HH:MM
 */
export function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Oblicz liczbę dni pozostałych do końca okresu
 * @param {string} endDateStr - Data końcowa (YYYY-MM-DD)
 * @returns {number} - Liczba dni pozostałych (włącznie z dzisiejszym)
 */
export function getDaysLeftFor(endDateStr) {
  if (!endDateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(endDateStr);
  endDate.setHours(0, 0, 0, 0);
  
  const diff = Math.floor((endDate - today) / (24 * 60 * 60 * 1000)) + 1;
  return diff > 0 ? diff : 0;
}

/**
 * Formatuj datę do czytelnego formatu (DD.MM.YYYY)
 * @param {string} dateStr - String daty
 * @returns {string} - Sformatowana data
 */
export function formatDateLabel(dateStr) {
  if (!dateStr) return 'brak';
  
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL');
  } catch {
    return dateStr;
  }
}

/**
 * Pobierz pierwszy dzień bieżącego miesiąca
 * @returns {Date} - Pierwszy dzień miesiąca
 */
export function getFirstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Pobierz ostatni dzień bieżącego miesiąca
 * @returns {Date} - Ostatni dzień miesiąca
 */
export function getLastDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/**
 * Pobierz początek tygodnia ISO (poniedziałek)
 * @param {Date} date - Data odniesienia
 * @returns {Date} - Początek tygodnia
 */
export function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const diff = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

/**
 * Sprawdź czy rekord jest zrealizowany (nie jest planowany lub data minęła)
 * @param {Object} record - Rekord z flagą planned i datą
 * @returns {boolean} - Czy rekord jest zrealizowany
 */
export function isRealised(record) {
  if (!record.planned) return true;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recordDate = new Date(record.date);
  recordDate.setHours(0, 0, 0, 0);
  
  return recordDate.getTime() <= today.getTime();
}

/**
 * Wyczyść cache dat (np. przy zmianie dnia)
 */
export function clearDateCache() {
  dateCache.clear();
}