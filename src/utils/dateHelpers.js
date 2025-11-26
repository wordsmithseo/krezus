const dateCache = new Map();

export function parseDateStr(dateStr) {
  if (!dateStr) return new Date(NaN);
  
  if (dateCache.has(dateStr)) {
    return new Date(dateCache.get(dateStr));
  }
  
  let date;
  
  if (dateStr.includes('-')) {
    date = new Date(dateStr);
  }
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
  
  if (!isNaN(date.getTime())) {
    dateCache.set(dateStr, date.getTime());
  }
  
  return date;
}

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

export function getWarsawDateString(date) {
  const d = date || new Date();
  const localeStr = d.toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' });
  return localeStr.slice(0, 10);
}

export function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Zwraca aktualną datę+czas w strefie Warsaw
 */
export function getWarsawDateTime() {
  const now = new Date();
  const warsawStr = now.toLocaleString('sv-SE', {
    timeZone: 'Europe/Warsaw',
    hour12: false
  });
  return new Date(warsawStr);
}

/**
 * Zwraca aktualny czas HH:MM w strefie Warsaw
 */
export function getWarsawTimeString() {
  const now = getWarsawDateTime();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Sprawdza czy transakcja planowana powinna być już zrealizowana
 * Bierze pod uwagę zarówno datę jak i godzinę (jeśli podana)
 */
export function shouldBeRealisedNow(transaction) {
  if (!transaction || transaction.type !== 'planned') {
    return false;
  }

  const now = getWarsawDateTime();

  // Jeśli transakcja ma podany czas, porównaj datę+czas
  if (transaction.time && transaction.time.trim() !== '') {
    const transactionDateTime = parseDateTime(transaction.date, transaction.time);
    if (isNaN(transactionDateTime)) {
      // Jeśli parsowanie się nie powiodło, użyj samej daty
      const today = getWarsawDateString();
      return transaction.date <= today;
    }
    return transactionDateTime <= now;
  }

  // Jeśli nie ma czasu, porównaj tylko daty
  const today = getWarsawDateString();
  return transaction.date <= today;
}

export function getDaysLeftFor(endDateStr) {
  if (!endDateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(endDateStr);
  endDate.setHours(0, 0, 0, 0);
  
  const diff = Math.floor((endDate - today) / (24 * 60 * 60 * 1000)) + 1;
  return diff > 0 ? diff : 0;
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return 'brak';
  
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL');
  } catch {
    return dateStr;
  }
}

export function getFirstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function getLastDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

export function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const diff = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

export function isRealised(record) {
  if (!record.planned) return true;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recordDate = new Date(record.date);
  recordDate.setHours(0, 0, 0, 0);
  
  return recordDate.getTime() <= today.getTime();
}

export function clearDateCache() {
  dateCache.clear();
}

/**
 * Oblicza dokładny czas pozostały do danej daty (BEZ dnia końcowego)
 * Zwraca obiekt z dniami, godzinami, minutami, sekundami oraz dwiema miarami dni:
 * - totalDays: zmiennoprzecinkowa liczba dni (dokładny czas, dla wyświetlania)
 * - calendarDays: pełne dni kalendarzowe (dla obliczeń limitów)
 * - showToday: true gdy należy wyświetlić "Dziś" (data dzisiaj i brak czasu)
 *
 * @param {string} endDateStr - Data końcowa w formacie YYYY-MM-DD
 * @param {string} endTimeStr - Opcjonalny czas końcowy w formacie HH:MM (jeśli nie podany, używa 00:00)
 * @returns {Object} { days, hours, minutes, seconds, totalDays, calendarDays, formatted, countdownFormat, showToday }
 */
export function calculateRemainingTime(endDateStr, endTimeStr = null) {
  if (!endDateStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0, calendarDays: 0, formatted: '0 dni', countdownFormat: null, showToday: false };
  }

  const now = getWarsawDateTime();

  // Parsuj datę końcową
  let endDate;
  if (endTimeStr && endTimeStr.trim() !== '') {
    endDate = parseDateTime(endDateStr, endTimeStr);
  } else {
    // Jeśli nie ma czasu, ustaw na 00:00 (początek dnia)
    endDate = parseDateStr(endDateStr);
    if (endDate && !isNaN(endDate.getTime())) {
      endDate.setHours(0, 0, 0, 0);
    }
  }

  if (!endDate || isNaN(endDate.getTime())) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0, calendarDays: 0, formatted: '0 dni', countdownFormat: null, showToday: false };
  }

  // Oblicz różnicę w milisekundach
  const diffMs = endDate - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0, calendarDays: 0, formatted: '0 dni', countdownFormat: null, showToday: false };
  }

  // Oblicz składowe
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = diffMs / (1000 * 60 * 60 * 24); // Zmiennoprzecinkowa liczba dni (dokładny czas)

  const days = Math.floor(totalDays);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  // Oblicz pełne dni kalendarzowe (od początku dzisiaj do początku dnia końcowego)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfEndDate = new Date(endDate);
  startOfEndDate.setHours(0, 0, 0, 0);

  const calendarDays = Math.floor((startOfEndDate - startOfToday) / (1000 * 60 * 60 * 24));

  // Sformatuj tekst
  let formatted;
  let countdownFormat;
  let showToday = false;

  if (calendarDays >= 1) {
    formatted = `${calendarDays} ${calendarDays === 1 ? 'dzień' : 'dni'}`;
    countdownFormat = null; // Nie używamy countdown gdy >= 1 dzień
  } else if (!endTimeStr || endTimeStr.trim() === '') {
    // NOWE: Jeśli nie podano czasu i data to dzisiaj, pokaż "Dziś"
    formatted = 'Dziś';
    countdownFormat = null;
    showToday = true;
  } else {
    // Gdy zostało < 1 dzień i podano czas, używamy formatu HH:MM:SS
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    countdownFormat = `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    formatted = countdownFormat; // Używamy countdown jako domyślnego formatu
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalDays,
    calendarDays,  // NOWE: pełne dni kalendarzowe dla obliczeń limitów
    formatted,
    countdownFormat,  // NOWE: format HH:MM:SS dla countdown timera (null gdy >= 1 dzień lub brak czasu)
    showToday  // NOWE: true gdy należy pokazać "Dziś" zamiast timera
  };
}