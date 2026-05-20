// src/ui/renderLogs.js
import { getLogs, calculateLogsSize, clearAllLogs, formatLogEntry } from '../modules/logger.js';
import { showPasswordModal } from '../components/modals.js';
import { showSuccessMessage, showErrorMessage } from '../utils/errorHandler.js';
import { Fmt } from '../utils/fmt.js';
import { escapeHTML } from '../utils/sanitizer.js';

const ACTION_COLORS = {
  EXPENSE_ADD: 'var(--danger)', EXPENSE_EDIT: 'var(--danger)', EXPENSE_DELETE: 'var(--danger)',
  EXPENSE_REALISE: 'var(--danger)',
  INCOME_ADD: 'var(--success)', INCOME_EDIT: 'var(--success)', INCOME_DELETE: 'var(--success)',
  INCOME_REALISE: 'var(--success)', CORRECTION_ADD: 'var(--success)',
  CATEGORY_ADD: 'var(--accent)', CATEGORY_EDIT: 'var(--accent)', CATEGORY_DELETE: 'var(--accent)',
  CATEGORY_MERGE: 'var(--accent)',
};

const ACTION_SHORT = {
  EXPENSE_ADD: 'EXPENSE', EXPENSE_EDIT: 'EXPENSE', EXPENSE_DELETE: 'EXPENSE', EXPENSE_REALISE: 'EXPENSE',
  INCOME_ADD: 'INCOME', INCOME_EDIT: 'INCOME', INCOME_DELETE: 'INCOME',
  INCOME_REALISE: 'INCOME', CORRECTION_ADD: 'INCOME',
  CATEGORY_ADD: 'CATEGORY', CATEGORY_EDIT: 'CATEGORY', CATEGORY_DELETE: 'CATEGORY', CATEGORY_MERGE: 'CATEGORY',
  USER_LOGIN: 'AUTH', USER_LOGOUT: 'AUTH', USER_REGISTER: 'AUTH',
  PROFILE_UPDATE: 'USER', BUDGET_USER_ADD: 'USER', BUDGET_USER_EDIT: 'USER', BUDGET_USER_DELETE: 'USER',
  LOGS_CLEARED: 'SYSTEM', SETTINGS_UPDATE: 'SYSTEM', AUTO_REALISE: 'SYSTEM',
};

function stripEmoji(str) {
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/gu, '').trim();
}

function formatDetails(action, details) {
  if (!details) return '';
  const d = details;
  const zlStr = n => n != null ? `${Fmt.zl(n)} zł` : '';
  switch (action) {
    case 'EXPENSE_ADD':
    case 'EXPENSE_EDIT': {
      const parts = [d.description, d.category ? `(${d.category})` : '', zlStr(d.amount)].filter(Boolean);
      return parts.join(' · ');
    }
    case 'EXPENSE_DELETE':
    case 'EXPENSE_REALISE': {
      const parts = [d.description, zlStr(d.amount)].filter(Boolean);
      return parts.join(' · ');
    }
    case 'INCOME_ADD':
    case 'INCOME_EDIT': {
      const parts = [d.source, zlStr(d.amount)].filter(Boolean);
      return parts.join(' · ');
    }
    case 'INCOME_DELETE':
    case 'INCOME_REALISE':
    case 'CORRECTION_ADD': {
      const parts = [d.source || d.correctionReason, zlStr(d.amount)].filter(Boolean);
      return parts.join(' · ');
    }
    case 'CATEGORY_ADD':
    case 'CATEGORY_EDIT':
    case 'CATEGORY_DELETE':
      return d.name || '';
    case 'CATEGORY_MERGE':
      return d.fromName && d.toName ? `${d.fromName} → ${d.toName}` : (d.name || '');
    case 'SETTINGS_UPDATE':
      return d.field ? `${d.field}` : '';
    default:
      return '';
  }
}

export async function renderLogs() {
  try {
    const logs = await getLogs();
    const logsSize = calculateLogsSize(logs);

    document.getElementById('logsSize').textContent = `${logsSize} KB`;
    document.getElementById('logsCount').textContent = logs.length;

    const logsList = document.getElementById('logsList');

    if (logs.length === 0) {
      logsList.innerHTML = '<p class="empty-state">Brak wpisów w logach</p>';
      return;
    }

    const lines = logs.map(logEntry => {
      const formatted = formatLogEntry(logEntry);
      const timeStr = (logEntry.time || '00:00:00').slice(0, 8);
      const action = logEntry.action || '';
      const shortAction = ACTION_SHORT[action] || action;
      const color = ACTION_COLORS[action] || 'var(--ink-3)';
      const label = stripEmoji(formatted.label);
      const details = formatDetails(action, logEntry.details);
      const fullMsg = details ? `${label}: ${escapeHTML(details)}` : label;
      const user = formatted.userName && formatted.userName !== 'System' ? ` <span style="color:var(--ink-3)">— ${escapeHTML(formatted.userName)}</span>` : '';
      return `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="color:var(--ink-3)">${timeStr}</span> · <span style="color:${color};font-weight:600">${shortAction}</span> · ${fullMsg}${user}</div>`;
    }).join('');

    logsList.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;line-height:1.7;max-height:200px;overflow-y:auto;background:var(--surface-sunken);border-radius:var(--radius-sm);padding:10px 12px">${lines}</div>`;

    const paginationContainer = logsList.nextElementSibling;
    if (paginationContainer && paginationContainer.classList.contains('pagination-container')) {
      paginationContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('❌ Błąd renderowania logów:', error);
    document.getElementById('logsList').innerHTML = '<p class="empty-state">Błąd ładowania logów</p>';
  }
}

export async function changeLogPage() {}

export async function clearLogs() {
  const confirmed = await showPasswordModal(
    'Czyszczenie logów',
    'Czy na pewno chcesz wyczyścić wszystkie logi? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );

  if (!confirmed) return;

  try {
    await clearAllLogs('System');
    await renderLogs();
    showSuccessMessage('Logi wyczyszczone');
  } catch (error) {
    console.error('❌ Błąd czyszczenia logów:', error);
    showErrorMessage('Nie udało się wyczyścić logów');
  }
}

export function resetAndRenderLogs() {
  renderLogs();
}
