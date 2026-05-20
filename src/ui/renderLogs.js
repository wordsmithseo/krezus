// src/ui/renderLogs.js
import { getLogs, calculateLogsSize, clearAllLogs, formatLogEntry } from '../modules/logger.js';
import { PAGINATION } from '../utils/constants.js';
import { showPasswordModal } from '../components/modals.js';
import { showSuccessMessage, showErrorMessage } from '../utils/errorHandler.js';
import { icon } from '../utils/icons.js';

const LOGS_PER_PAGE = 20;
let currentLogPage = 1;

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

    const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);
    const startIdx = (currentLogPage - 1) * LOGS_PER_PAGE;
    const endIdx = startIdx + LOGS_PER_PAGE;
    const paginatedLogs = logs.slice(startIdx, endIdx);

    const html = paginatedLogs.map((logEntry, index) => {
      const formatted = formatLogEntry(logEntry);
      const logNumber = startIdx + index + 1;
      return `
        <div class="log-entry">
          <div class="log-header">
            <span class="log-number">#${logNumber}</span>
            <span class="log-action">${formatted.label}</span>
            <span class="log-timestamp">${formatted.timestamp}</span>
          </div>
          ${formatted.userName ? `
            <div class="log-user">
              <strong>Użytkownik:</strong> ${formatted.userName}
            </div>
          ` : ''}
          ${formatted.details && Object.keys(formatted.details).length > 0 ? `
            <div class="log-details">
              ${Object.entries(formatted.details).map(([key, value]) =>
                `<span class="log-detail-item"><strong>${key}:</strong> ${value}</span>`
              ).join(' • ')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    logsList.innerHTML = html;

    if (totalPages > 1) {
      renderLogsPagination(totalPages);
    } else {
      const paginationContainer = logsList.nextElementSibling;
      if (paginationContainer && paginationContainer.classList.contains('pagination-container')) {
        paginationContainer.innerHTML = '';
      } else {
        const newPagination = document.createElement('div');
        newPagination.className = 'pagination-container';
        logsList.parentNode.insertBefore(newPagination, logsList.nextSibling);
      }
    }
  } catch (error) {
    console.error('❌ Błąd renderowania logów:', error);
    document.getElementById('logsList').innerHTML = '<p class="empty-state">Błąd ładowania logów</p>';
  }
}

function renderLogsPagination(totalPages) {
  const logsList = document.getElementById('logsList');
  let paginationContainer = logsList.nextElementSibling;

  if (!paginationContainer || !paginationContainer.classList.contains('pagination-container')) {
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    logsList.parentNode.insertBefore(paginationContainer, logsList.nextSibling);
  }

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const chevLeft  = icon('ChevronLeft',  { size: 14, strokeWidth: 1.5 });
  const chevRight = icon('ChevronRight', { size: 14, strokeWidth: 1.5 });

  let html = '';
  html += `<button class="pagination-btn" ${currentLogPage === 1 ? 'disabled' : ''} data-action="change-log-page" data-page="${currentLogPage - 1}">${chevLeft}</button>`;

  const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
  let startPage = Math.max(1, currentLogPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentLogPage ? 'active' : ''}" data-action="change-log-page" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pagination-btn" ${currentLogPage === totalPages ? 'disabled' : ''} data-action="change-log-page" data-page="${currentLogPage + 1}">${chevRight}</button>`;

  paginationContainer.innerHTML = html;
}

export async function changeLogPage(page) {
  const logs = await getLogs();
  const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentLogPage = page;
  await renderLogs();

  const logsList = document.getElementById('logsList');
  if (logsList) logsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export async function clearLogs() {
  const confirmed = await showPasswordModal(
    'Czyszczenie logów',
    'Czy na pewno chcesz wyczyścić wszystkie logi? Ta operacja jest nieodwracalna. Aby potwierdzić, podaj hasło głównego konta.'
  );

  if (!confirmed) return;

  try {
    await clearAllLogs('System');
    currentLogPage = 1;
    await renderLogs();
    showSuccessMessage('Logi wyczyszczone');
  } catch (error) {
    console.error('❌ Błąd czyszczenia logów:', error);
    showErrorMessage('Nie udało się wyczyścić logów');
  }
}

export function resetAndRenderLogs() {
  currentLogPage = 1;
  renderLogs();
}
