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