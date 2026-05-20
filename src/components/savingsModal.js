// src/components/savingsModal.js
import { getSavings, updateSavings } from '../modules/dataManager.js';
import { getCurrentUser, getDisplayName } from '../modules/auth.js';
import { getWarsawDateString } from '../utils/dateHelpers.js';
import { showSuccessMessage, showErrorMessage } from '../utils/errorHandler.js';
import { log } from '../modules/logger.js';
import { Fmt } from '../utils/fmt.js';
import { icon } from '../utils/icons.js';
import { renderSavingsSection } from '../ui/renderSavings.js';

const MODAL_ID = 'savingsModal';
const FORM_ID  = 'savingsModalForm';

function getModal() {
  return document.getElementById(MODAL_ID) || createModal();
}

function createModal() {
  const el = document.createElement('div');
  el.id = MODAL_ID;
  el.className = 'modal';
  el.innerHTML = `
    <div class="modal-content" style="max-width:520px">
      <div class="modal-header">
        <h3>Zmień kwotę oszczędności</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('${MODAL_ID}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form id="${FORM_ID}">
        <div class="modal-body">
          <div id="savingsCurrentBanner" style="padding:14px;background:var(--success-soft);border-radius:10px;margin-bottom:16px">
            <div style="font-size:11px;color:var(--ink-3);margin-bottom:2px">Obecnie odłożone</div>
            <div class="num" style="font-size:24px;font-weight:500;color:var(--success)">
              <span id="savingsCurrentDisplay">0,00</span>
              <span style="font-size:14px;opacity:0.7;margin-left:4px">zł</span>
            </div>
          </div>

          <div class="form-grid">
            <div class="field full">
              <label>Nowa kwota oszczędności (zł)</label>
              <input type="text" id="savingsNewAmount" class="input num lg"
                placeholder="0,00" autocomplete="off" inputmode="decimal"/>
              <div class="hint">Wprowadź docelową, łączną kwotę oszczędności. System wyliczy różnicę i zapisze ją w historii.</div>
              <div id="savingsAmountError" style="display:none;font-size:11px;color:var(--danger);margin-top:2px"></div>
            </div>
            <div class="field full">
              <label>Notatka (opcjonalnie)</label>
              <input type="text" id="savingsNote" class="input"
                placeholder="np. Comiesięczna wpłata, zwrot z urzędu, wydatek awaryjny"/>
            </div>
            <div class="field">
              <label>Data</label>
              <input type="date" id="savingsDate" class="input"/>
            </div>
            <div class="field">
              <label>Użytkownik</label>
              <select id="savingsUser" class="select"></select>
            </div>
          </div>

          <div style="padding:12px;background:var(--surface-2);border-radius:8px;font-size:12px;color:var(--ink-2);display:flex;gap:8px;margin-top:4px">
            <span style="flex-shrink:0;color:var(--ink-3);margin-top:1px">${icon('Info', { size: 14 })}</span>
            <div>Zmiana kwoty oszczędności to <strong>deklaracja księgowa</strong>, nie transakcja na koncie. Wpływa wyłącznie na wyliczenia limitów dziennych i koperty dnia.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="window.closeModal('${MODAL_ID}')">Anuluj</button>
          <button type="submit" id="savingsSubmitBtn" class="btn accent">
            ${icon('Check', { size: 13 })} Zapisz zmianę
          </button>
        </div>
      </form>
    </div>`;

  el.addEventListener('click', (e) => { if (e.target === el) window.closeModal(MODAL_ID); });
  document.body.appendChild(el);
  return el;
}

export function showSavingsModal(budgetUsers = []) {
  const modal = getModal();
  const { current } = getSavings();

  document.getElementById('savingsCurrentDisplay').textContent = Fmt.zl(current);

  const amountInput = document.getElementById('savingsNewAmount');
  amountInput.value = '';
  amountInput.placeholder = Fmt.zl(current);

  document.getElementById('savingsNote').value = '';
  document.getElementById('savingsDate').value = getWarsawDateString();
  document.getElementById('savingsAmountError').style.display = 'none';

  const userSel = document.getElementById('savingsUser');
  const currentUser = getCurrentUser();
  userSel.innerHTML = budgetUsers.map(u =>
    `<option value="${u.id}" ${u.id === currentUser?.uid ? 'selected' : ''}>${u.name}${u.isOwner ? ' (Właściciel)' : ''}</option>`
  ).join('') || `<option value="${currentUser?.uid ?? ''}">${currentUser?.displayName ?? 'Użytkownik'}</option>`;

  modal.classList.add('active');
  requestAnimationFrame(() => amountInput.focus());

  const form = document.getElementById(FORM_ID);
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  const rawAmount = document.getElementById('savingsNewAmount').value.trim().replace(',', '.');
  const newAmount = Number(rawAmount);
  const errorEl   = document.getElementById('savingsAmountError');

  const { current } = getSavings();

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  errorEl.style.display = 'none';

  if (rawAmount === '' || isNaN(newAmount)) {
    showError('Podaj kwotę (np. 3200 lub 3200,50)');
    return;
  }
  if (newAmount < 0) {
    showError('Kwota nie może być ujemna');
    return;
  }
  if (Math.abs(newAmount - current) < 0.005) {
    showError('Nowa kwota jest taka sama jak obecna');
    return;
  }

  const note     = document.getElementById('savingsNote').value.trim();
  const date     = document.getElementById('savingsDate').value || getWarsawDateString();
  const byUserId = document.getElementById('savingsUser').value;

  const submitBtn = document.getElementById('savingsSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Zapisywanie…';

  try {
    await updateSavings({ newAmount, note, date, byUserId });

    const user = getCurrentUser();
    const displayName = user ? await getDisplayName(user.uid) : 'System';
    const diff = newAmount - current;
    const diffSign = diff >= 0 ? '+' : '−';
    await log('SAVINGS_UPDATE', {
      fromAmount: current,
      toAmount: newAmount,
      diff,
      budgetUser: displayName,
      message: `Zmiana kwoty oszczędności: ${Fmt.zl(current)} → ${Fmt.zl(newAmount)} zł (${diffSign}${Fmt.zl(Math.abs(diff))}) — ${displayName}`
    });

    window.closeModal(MODAL_ID);
    renderSavingsSection();
    showSuccessMessage(`Kwota oszczędności zaktualizowana: ${Fmt.zl(newAmount)} zł`);
  } catch (err) {
    console.error('❌ Błąd zapisu oszczędności:', err);
    showErrorMessage('Nie udało się zapisać kwoty oszczędności');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icon('Check', { size: 13 })} Zapisz zmianę`;
  }
}
