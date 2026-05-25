// src/components/limitModal.js
import { escapeHTML } from '../utils/sanitizer.js';
import { Fmt } from '../utils/fmt.js';
import { getSourceIcon } from '../utils/iconMapper.js';
import { userChipHTML } from '../ui/chips.js';
import { startCountdownTimers } from '../utils/countdownTimer.js';

const MODAL_ID = 'limitDetailModal';

function row(label, value, valueStyle = '') {
  return `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--line)">
      <span style="font-size:12px;color:var(--ink-3)">${label}</span>
      <span class="num" style="font-size:13px;font-weight:500;${valueStyle}">${value}</span>
    </div>`;
}

function sectionLabel(text) {
  return `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;color:var(--ink-3);margin:20px 0 10px">${text}</div>`;
}

export function showLimitDetailModal({ limit, periodTotal, available, limitUser, isFirst }) {
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'modal';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const {
    name, amount, date, time,
    realLimit, plannedLimit, calendarDays, daysLeft,
    countdownFormat, showToday, timeFormatted
  } = limit;

  const { futureIncome = 0, futureExpense = 0 } = periodTotal || {};
  const daysForCalc = Math.max(1, calendarDays ?? daysLeft ?? 1);
  const delta = plannedLimit - realLimit;
  const pct = realLimit > 0 ? Math.round((delta / realLimit) * 100) : 0;
  const realClass = realLimit < 50 ? ' danger' : '';
  const limitIcon = getSourceIcon(name || 'Planowany wpływ');

  let timeText;
  if (showToday) {
    timeText = 'Dziś';
  } else if (countdownFormat) {
    timeText = `<span class="countdown-timer" data-end-date="${escapeHTML(date)}" data-end-time="${escapeHTML(time || '')}">${escapeHTML(countdownFormat)}</span>`;
  } else {
    timeText = `za ${daysLeft}d`;
  }

  const dateStr = date ? Fmt.dateLong(date) : '';
  const netFunds = available + futureIncome - futureExpense;
  const deltaColor = delta >= 0 ? 'var(--success)' : 'var(--danger)';

  // Sekcja "skąd ta różnica" — pokazujemy ją tylko gdy jest coś ciekawego do pokazania
  const hasFuture = futureIncome > 0 || futureExpense > 0;

  const calcBreakdown = hasFuture ? `
    ${sectionLabel('Składniki limitu planowanego')}
    <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px 14px">
      ${row('Środki dostępne', `${Fmt.zl(available)} zł`)}
      ${futureIncome > 0  ? row('Inne zaplanowane wpływy', `+${Fmt.zl(futureIncome)} zł`, 'color:var(--success)') : ''}
      ${futureExpense > 0 ? row('Zaplanowane zobowiązania', `−${Fmt.zl(futureExpense)} zł`, 'color:var(--danger)') : ''}
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0 2px">
        <span style="font-size:12px;font-weight:600;color:var(--ink-2)">Łącznie</span>
        <span class="num" style="font-size:14px;font-weight:600">${Fmt.zl(netFunds)} zł</span>
      </div>
      <div style="font-size:11px;color:var(--ink-3);text-align:right">÷ ${daysForCalc} dni = <strong class="num">${Fmt.zl(plannedLimit)} zł/d</strong></div>
    </div>` : `
    ${sectionLabel('Składniki limitu')}
    <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px 14px">
      ${row('Środki dostępne', `${Fmt.zl(available)} zł`)}
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0 2px">
        <span style="font-size:12px;color:var(--ink-3)">÷ ${daysForCalc} dni</span>
        <span class="num" style="font-size:14px;font-weight:600">${Fmt.zl(realLimit)} zł/d</span>
      </div>
    </div>`;

  modal.innerHTML = `
    <div class="modal-content" style="max-width:420px">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          <span style="font-size:20px;flex-shrink:0">${limitIcon}</span>
          <h3 style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(name || 'Planowany wpływ')}</h3>
          ${isFirst ? '<span class="tag accent dot pulse" style="flex-shrink:0">Następny</span>' : ''}
        </div>
      </div>
      <div class="modal-body">

        <!-- Hero: kwota + data -->
        <div style="background:var(--surface-2);border-radius:10px;padding:20px;text-align:center;margin-bottom:4px">
          <div class="num" style="font-size:34px;font-weight:700;letter-spacing:-.03em;color:var(--success)">+${Fmt.zl(amount)} zł</div>
          <div style="margin-top:8px;font-size:14px;color:var(--ink-1)">${dateStr}</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:3px">${timeText}</div>
          ${limitUser ? `<div style="margin-top:12px;display:flex;justify-content:center">${userChipHTML(limitUser)}</div>` : ''}
        </div>

        ${sectionLabel('Limit dzienny')}

        <!-- Dwa kafelki metric -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="metric${realClass}">
            <span class="metric-label">Realny</span>
            <span class="metric-value num">${Fmt.zl(realLimit)} <span style="font-size:11px;font-weight:400;color:var(--ink-3)">zł/d</span></span>
            <span style="font-size:11px;color:var(--ink-3)">bez wpływu</span>
          </div>
          <div class="metric accent">
            <span class="metric-label">Planowany</span>
            <span class="metric-value num">${Fmt.zl(plannedLimit)} <span style="font-size:11px;font-weight:400;color:var(--ink-3)">zł/d</span></span>
            <span style="font-size:11px;color:var(--ink-3)">z wpływem</span>
          </div>
        </div>

        <!-- Delta -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 2px 0;font-size:12px;color:var(--ink-3)">
          <span>Zmiana po wpływie</span>
          <span>
            <strong class="num" style="color:${deltaColor}">${delta >= 0 ? '+' : '−'}${Fmt.zl(Math.abs(delta))} zł/d</strong>
            ${pct !== 0 ? `<span style="margin-left:4px">(${pct >= 0 ? '+' : ''}${pct}%)</span>` : ''}
          </span>
        </div>

        ${calcBreakdown}

      </div>
      <div class="modal-footer">
        <button type="button" class="btn accent" onclick="window.closeModal('${MODAL_ID}')">Zamknij</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  startCountdownTimers();
}
