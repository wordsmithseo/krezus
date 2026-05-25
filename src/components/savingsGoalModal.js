// src/components/savingsGoalModal.js
import { getSavings, saveGoal, updateGoalAmount } from '../modules/dataManager.js';
import { calculateAvailableFunds } from '../modules/budgetCalculator.js';
import { getCurrentUser } from '../modules/auth.js';
import { getWarsawDateString } from '../utils/dateHelpers.js';
import { showSuccessMessage, showErrorMessage } from '../utils/errorHandler.js';
import { Fmt } from '../utils/fmt.js';
import { renderSavingsSection } from '../ui/renderSavings.js';

const GOAL_MODAL_ID   = 'savingsGoalEditModal';
const DEPOSIT_MODAL_ID = 'savingsGoalDepositModal';

const GOAL_ICONS = ['🎯','✈️','🚗','🏠','📱','💊','🎓','🐕','👶','💍','💪','🌴','🎮','🛡️','🚀','💼','🏖️','🎸','🏋️','🌿'];
const GOAL_COLORS = [
  'var(--accent)',
  'var(--success)',
  'var(--info)',
  'var(--warning)',
  'var(--danger)',
  'var(--ink-2)',
];

const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
</svg>`;

// ─── Goal create/edit modal ───────────────────────────────────────────────────

function createGoalModal() {
  const el = document.createElement('div');
  el.id = GOAL_MODAL_ID;
  el.className = 'modal';
  el.innerHTML = `
    <div class="modal-content" style="max-width:460px">
      <div class="modal-header">
        <h3 id="goalModalTitle">Nowy cel</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('${GOAL_MODAL_ID}')">${CLOSE_SVG}</button>
      </div>
      <form id="savingsGoalForm">
        <div class="modal-body">
          <div class="form-grid">
            <div class="field full">
              <label>Ikona</label>
              <div id="goalIconPicker" style="display:flex;flex-wrap:wrap;gap:4px"></div>
              <input type="hidden" id="goalIconValue">
            </div>
            <div class="field full">
              <label>Kolor</label>
              <div id="goalColorPicker" style="display:flex;gap:8px;flex-wrap:wrap;padding:4px 0"></div>
              <input type="hidden" id="goalColorValue">
            </div>
            <div class="field full">
              <label>Nazwa celu <span style="color:var(--danger)">*</span></label>
              <input type="text" id="goalName" class="input" placeholder="np. Wakacje, Nowe auto, Fundusz awaryjny" maxlength="50">
              <div id="goalNameError" style="display:none;font-size:11px;color:var(--danger);margin-top:2px"></div>
            </div>
            <div class="field">
              <label>Kwota docelowa (zł) <span style="color:var(--danger)">*</span></label>
              <input type="text" id="goalTarget" class="input num" placeholder="np. 5000" inputmode="decimal">
              <div id="goalTargetError" style="display:none;font-size:11px;color:var(--danger);margin-top:2px"></div>
            </div>
            <div class="field">
              <label>Termin (opcjonalnie)</label>
              <input type="date" id="goalDeadline" class="input">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="window.closeModal('${GOAL_MODAL_ID}')">Anuluj</button>
          <button type="submit" id="goalSubmitBtn" class="btn accent">Zapisz cel</button>
        </div>
      </form>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) window.closeModal(GOAL_MODAL_ID); });
  document.body.appendChild(el);
  return el;
}

function getGoalModal() {
  return document.getElementById(GOAL_MODAL_ID) || createGoalModal();
}

function renderIconPicker(selected) {
  return GOAL_ICONS.map(em => {
    const active = em === selected ? 'background:var(--surface-sunken);box-shadow:0 0 0 2px var(--accent)' : 'background:var(--surface-2)';
    return `<button type="button" data-icon="${em}"
      style="padding:5px;font-size:18px;border:none;border-radius:8px;cursor:pointer;width:38px;height:38px;${active}"
      onclick="this.closest('#savingsGoalForm').querySelector('#goalIconValue').value='${em}';[...this.closest('#goalIconPicker').querySelectorAll('button')].forEach(b=>{b.style.background='var(--surface-2)';b.style.boxShadow='none'});this.style.background='var(--surface-sunken)';this.style.boxShadow='0 0 0 2px var(--accent)'"
    >${em}</button>`;
  }).join('');
}

function renderColorPicker(selected) {
  return GOAL_COLORS.map(c => {
    const ring = c === selected
      ? `box-shadow:0 0 0 2px var(--surface), 0 0 0 4px ${c}`
      : 'box-shadow:none';
    return `<button type="button" data-color="${c}"
      style="width:24px;height:24px;border-radius:50%;background:${c};border:none;cursor:pointer;${ring}"
      onclick="this.closest('#savingsGoalForm').querySelector('#goalColorValue').value='${c}';[...this.closest('#goalColorPicker').querySelectorAll('button')].forEach(b=>b.style.boxShadow='none');this.style.boxShadow='0 0 0 2px var(--surface), 0 0 0 4px ${c}'"
    ></button>`;
  }).join('');
}

export function showSavingsGoalModal(goal = null) {
  const modal = getGoalModal();
  const isEdit = !!goal;
  const defaultIcon  = goal?.icon  ?? '🎯';
  const defaultColor = GOAL_COLORS.includes(goal?.color) ? goal.color : GOAL_COLORS[0];

  document.getElementById('goalModalTitle').textContent = isEdit ? 'Edytuj cel' : 'Nowy cel';
  document.getElementById('goalIconPicker').innerHTML   = renderIconPicker(defaultIcon);
  document.getElementById('goalColorPicker').innerHTML  = renderColorPicker(defaultColor);
  document.getElementById('goalIconValue').value  = defaultIcon;
  document.getElementById('goalColorValue').value = defaultColor;
  document.getElementById('goalName').value    = goal?.name ?? '';
  document.getElementById('goalTarget').value  = goal?.target ? String(goal.target).replace('.', ',') : '';
  document.getElementById('goalDeadline').value = goal?.deadline ?? '';
  document.getElementById('goalNameError').style.display = 'none';
  document.getElementById('goalTargetError').style.display = 'none';

  modal.classList.add('active');
  requestAnimationFrame(() => document.getElementById('goalName').focus());

  const form = document.getElementById('savingsGoalForm');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.addEventListener('submit', e => handleGoalSubmit(e, goal?.id ?? null));
}

async function handleGoalSubmit(e, goalId) {
  e.preventDefault();
  const name  = document.getElementById('goalName').value.trim();
  const rawTarget  = document.getElementById('goalTarget').value.trim().replace(',', '.');
  const icon  = document.getElementById('goalIconValue').value  || '🎯';
  const color = document.getElementById('goalColorValue').value || GOAL_COLORS[0];
  const deadline = document.getElementById('goalDeadline').value || null;
  const errEl = document.getElementById('goalNameError');
  const targetErrEl = document.getElementById('goalTargetError');

  errEl.style.display = 'none';
  targetErrEl.style.display = 'none';

  if (!name) {
    errEl.textContent = 'Nazwa celu jest wymagana';
    errEl.style.display = 'block';
    return;
  }

  const target = rawTarget ? Number(rawTarget) : 0;
  if (!rawTarget || isNaN(target) || target <= 0) {
    targetErrEl.textContent = 'Kwota docelowa jest wymagana i musi być większa od zera';
    targetErrEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('goalSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Zapisywanie…';

  try {
    await saveGoal({ id: goalId, name, target, icon, color, deadline });
    window.closeModal(GOAL_MODAL_ID);
    renderSavingsSection();
    showSuccessMessage(goalId ? 'Cel zaktualizowany' : 'Cel dodany');
  } catch {
    showErrorMessage('Nie udało się zapisać celu');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Zapisz cel';
  }
}

// ─── Goal deposit/withdraw modal ─────────────────────────────────────────────

function createDepositModal() {
  const el = document.createElement('div');
  el.id = DEPOSIT_MODAL_ID;
  el.className = 'modal';
  el.innerHTML = `
    <div class="modal-content" style="max-width:420px">
      <div class="modal-header">
        <h3 id="depositModalTitle">Wpłata</h3>
        <button class="btn ghost icon-only" onclick="window.closeModal('${DEPOSIT_MODAL_ID}')">${CLOSE_SVG}</button>
      </div>
      <form id="goalDepositForm">
        <div class="modal-body">
          <div id="depositCurrentBanner" style="padding:14px;background:var(--success-soft);border-radius:10px;margin-bottom:16px">
            <div style="font-size:11px;color:var(--ink-3);margin-bottom:2px">Aktualna kwota celu</div>
            <div class="num" style="font-size:22px;font-weight:500;color:var(--success)">
              <span id="depositCurrentDisplay">0,00</span>
              <span style="font-size:13px;opacity:0.7;margin-left:4px">zł</span>
            </div>
          </div>
          <div class="seg" id="depositModeSeg" style="margin-bottom:16px">
            <button type="button" class="active" data-mode="add">+ Wpłać</button>
            <button type="button" data-mode="sub">− Wypłać</button>
          </div>
          <div class="form-grid">
            <div class="field full">
              <label id="depositAmountLabel">Kwota do wpłacenia (zł)</label>
              <input type="text" id="depositAmount" class="input num lg" placeholder="np. 500" inputmode="decimal" autocomplete="off">
              <div id="depositAmountError" style="display:none;font-size:11px;color:var(--danger);margin-top:2px"></div>
              <div id="depositAvailableHint" style="font-size:11px;margin-top:4px"></div>
            </div>
            <div class="field full">
              <label>Notatka (opcjonalnie)</label>
              <input type="text" id="depositNote" class="input" placeholder="np. Miesięczna wpłata">
            </div>
            <div class="field">
              <label>Data</label>
              <input type="date" id="depositDate" class="input">
            </div>
            <div class="field">
              <label>Użytkownik</label>
              <select id="depositUser" class="select"></select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="window.closeModal('${DEPOSIT_MODAL_ID}')">Anuluj</button>
          <button type="submit" id="depositSubmitBtn" class="btn accent">Zapisz</button>
        </div>
      </form>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) window.closeModal(DEPOSIT_MODAL_ID); });
  document.body.appendChild(el);
  return el;
}

function getDepositModal() {
  return document.getElementById(DEPOSIT_MODAL_ID) || createDepositModal();
}

function updateDepositModeUI(mode) {
  const label = document.getElementById('depositAmountLabel');
  label.textContent = mode === 'add' ? 'Kwota do wpłacenia (zł)' : 'Kwota do wypłacenia (zł)';
}

export function showGoalDepositModal(goal, budgetUsers = [], defaultMode = 'add') {
  const modal = getDepositModal();

  document.getElementById('depositModalTitle').textContent = `${goal.icon} ${goal.name}`;
  document.getElementById('depositCurrentDisplay').textContent = Fmt.zl(goal.current);
  document.getElementById('depositDate').value = getWarsawDateString();
  document.getElementById('depositNote').value = '';
  document.getElementById('depositAmountError').style.display = 'none';

  const currentUser = getCurrentUser();
  const userSel = document.getElementById('depositUser');
  userSel.innerHTML = budgetUsers.map(u =>
    `<option value="${u.id}" ${u.id === currentUser?.uid ? 'selected' : ''}>${u.name}${u.isOwner ? ' (Właściciel)' : ''}</option>`
  ).join('') || `<option value="${currentUser?.uid ?? ''}">${currentUser?.displayName ?? 'Użytkownik'}</option>`;

  modal.classList.add('active');

  const form = document.getElementById('goalDepositForm');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.addEventListener('submit', e => handleDepositSubmit(e, goal.id));

  const seg = document.getElementById('depositModeSeg');
  seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === defaultMode));
  updateDepositModeUI(defaultMode);
  seg.addEventListener('click', e => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateDepositModeUI(btn.dataset.mode);
  });

  // Pokaż dostępne środki jako wskazówkę przy wpłacie
  const { available } = calculateAvailableFunds();
  const hintEl = document.getElementById('depositAvailableHint');
  if (hintEl) {
    if (available >= 0) {
      hintEl.textContent = `Dostępne środki: ${Fmt.zl(available)} zł`;
      hintEl.style.color = 'var(--ink-3)';
    } else {
      hintEl.textContent = `Uwaga: deficyt środków (${Fmt.zl(Math.abs(available))} zł)`;
      hintEl.style.color = 'var(--danger)';
    }
  }

  const amountInput = document.getElementById('depositAmount');
  amountInput.value = '';
  requestAnimationFrame(() => amountInput.focus());
}

async function handleDepositSubmit(e, goalId) {
  e.preventDefault();
  const raw    = document.getElementById('depositAmount').value.trim().replace(',', '.');
  const inputVal = Number(raw);
  const errEl  = document.getElementById('depositAmountError');
  const mode   = document.querySelector('#depositModeSeg button.active')?.dataset.mode ?? 'add';

  const goals = getSavings().goals;
  const goal  = goals.find(g => g.id === goalId);
  if (!goal) return;

  errEl.style.display = 'none';
  if (!raw || isNaN(inputVal) || inputVal <= 0) {
    errEl.textContent = 'Podaj kwotę większą od zera';
    errEl.style.display = 'block';
    return;
  }

  const newAmount = mode === 'add' ? goal.current + inputVal : goal.current - inputVal;
  if (newAmount < 0) {
    errEl.textContent = 'Kwota po wypłacie byłaby ujemna';
    errEl.style.display = 'block';
    return;
  }

  if (mode === 'add') {
    const { available } = calculateAvailableFunds();
    if (inputVal > available) {
      const dostepne = available > 0 ? `${Fmt.zl(available)} zł` : 'brak (deficyt środków)';
      errEl.textContent = `Niewystarczające środki — dostępne: ${dostepne}`;
      errEl.style.display = 'block';
      return;
    }
  }

  const note     = document.getElementById('depositNote').value.trim();
  const date     = document.getElementById('depositDate').value || getWarsawDateString();
  const byUserId = document.getElementById('depositUser').value;

  const btn = document.getElementById('depositSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Zapisywanie…';

  try {
    await updateGoalAmount({ goalId, newAmount, note, date, byUserId });
    window.closeModal(DEPOSIT_MODAL_ID);
    renderSavingsSection();
    const sign = mode === 'add' ? '+' : '−';
    showSuccessMessage(`${sign}${Fmt.zl(inputVal)} zł — cel "${goal.name}" zaktualizowany`);
  } catch {
    showErrorMessage('Nie udało się zapisać');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Zapisz';
  }
}
