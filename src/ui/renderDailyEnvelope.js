// src/ui/renderDailyEnvelope.js
import { getDailyEnvelope, getExpenses } from '../modules/dataManager.js';
import {
  calculateSpendingGauge,
  getGlobalMedian30d,
  getEnvelopeCalculationInfo,
  calculateSpendingPeriods,
  getOrCalculateLimits
} from '../modules/budgetCalculator.js';

import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { startCountdownTimers } from '../utils/countdownTimer.js';
import { getWarsawDateString, getWarsawTimeString } from '../utils/dateHelpers.js';
import { icon } from '../utils/icons.js';

function renderEnvelope14Days(total) {
  const container = document.getElementById('envelopeChart14');
  if (!container) return;

  const expenses = getExpenses();
  const chartH = 140;

  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getWarsawDateString(d);
    const value = expenses
      .filter(e => e.type === 'normal' && e.date === dateStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    days.push({ dateStr, value, day: d.getDate() });
  }

  const maxVal = Math.max(...days.map(d => d.value), total, 1);
  const thresholdTopPx = total > 0 ? Math.round((1 - total / maxVal) * chartH) : -1;
  const totalFmt = total.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const barsHtml = days.map(d => {
    const barH = d.value > 0 ? Math.max(Math.round((d.value / maxVal) * chartH), 2) : 0;
    const isOver = total > 0 && d.value > total;
    const color = isOver ? 'var(--danger)' : 'var(--accent)';
    return `<div style="flex:1;height:${barH}px;background:${color};border-radius:3px 3px 2px 2px;opacity:0.8;min-width:0"></div>`;
  }).join('');

  const dayLabels = days.map(d => `<div style="flex:1;text-align:center;font-family:var(--font-mono);font-size:10px;color:var(--ink-3)">${d.day}</div>`).join('');

  const thresholdLineHtml = thresholdTopPx >= 0
    ? `<div style="position:absolute;top:${thresholdTopPx}px;left:0;right:0;border-top:1px dashed var(--ink-3);pointer-events:none"></div>`
    : '';

  const html = `
    <div style="position:relative">
      ${thresholdLineHtml}
      <div style="display:flex;align-items:flex-end;gap:3px;height:${chartH}px">${barsHtml}</div>
    </div>
    <div style="display:flex;gap:3px;margin-top:4px">${dayLabels}</div>
    <div style="display:flex;align-items:center;gap:16px;font-size:12px;color:var(--ink-3);margin-top:14px;flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;background:var(--accent);border-radius:2px;flex-shrink:0;opacity:0.8"></span>Wydatki w normie</span>
      <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;background:var(--danger);border-radius:2px;flex-shrink:0;opacity:0.8"></span>Przekroczenie</span>
      ${total > 0 ? `<span style="display:flex;align-items:center;gap:6px"><span style="width:18px;border-top:1px dashed var(--ink-3);display:inline-block"></span>Koperta dnia (${escapeHTML(totalFmt)} zł)</span>` : ''}
    </div>
  `;
  container.innerHTML = sanitizeHTML(html);
}

function renderDayProgress(spent, total) {
  const progressEl = document.getElementById('envelopeDayProgress');
  const textEl = document.getElementById('envelopeDayText');
  if (!progressEl || !textEl) return;

  const timeStr = getWarsawTimeString();
  const [hh, mm] = timeStr.split(':').map(Number);
  const dayPct = Math.round(((hh * 60 + mm) / (24 * 60)) * 100);
  const expectedSpend = total > 0 ? total * (dayPct / 100) : 0;
  const diff = expectedSpend - spent;
  const isUnder = diff >= 0;

  const diffFmt = Math.abs(diff).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const expectedFmt = expectedSpend.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const progressColor = isUnder ? 'var(--success)' : 'var(--danger)';

  progressEl.innerHTML = sanitizeHTML(`
    ${icon('Clock', { size: 14, strokeWidth: 1.5 })}
    <div class="progress" style="flex:1"><div style="width:${dayPct}%;height:100%;background:${progressColor};border-radius:inherit;transition:width 400ms ease"></div></div>
    <span class="num text-sm">${escapeHTML(timeStr)} — ${dayPct}% dnia</span>
  `);

  const statusText = isUnder
    ? `Jesteś o <strong class="num">${escapeHTML(diffFmt)} zł</strong> pod progiem — masz zapas.`
    : `Przekroczyłeś próg o <strong class="num">${escapeHTML(diffFmt)} zł</strong>.`;

  textEl.innerHTML = sanitizeHTML(
    `O tej porze powinieneś mieć wydane około <strong class="num">${escapeHTML(expectedFmt)} zł</strong>. ${statusText}`
  );
}

function updateEnvelopeGaugeSvg(fillId, remainingId, spent, total) {
  const fill = document.getElementById(fillId);
  if (!fill) return;
  const r = parseFloat(fill.getAttribute('r')) || 86;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  fill.style.strokeDasharray = `${c * pct} ${c}`;
  fill.style.stroke = pct > 0.85 ? 'var(--danger)' : pct > 0.6 ? 'oklch(0.65 0.15 50)' : 'var(--accent)';
  const rem = document.getElementById(remainingId);
  if (rem) rem.textContent = (total - spent).toLocaleString('pl-PL', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export function renderDailyEnvelope() {
  const envelope = getDailyEnvelope();
  const { spent, total, percentage, remaining } = calculateSpendingGauge();
  const median = getGlobalMedian30d();
  const calcInfo = getEnvelopeCalculationInfo();

  const envelopeAmountEl = document.getElementById('envelopeAmount');
  const envelopeSpentEl = document.getElementById('envelopeSpent');
  const envelopeRemainingEl = document.getElementById('envelopeRemaining');
  const envelopeMedianEl = document.getElementById('envelopeMedian');
  const spendingGaugeEl = document.getElementById('spendingGauge');
  const envelopePeriodInfoEl = document.getElementById('envelopePeriodInfo');

  // Full envelope section elements
  const envelopeAmountFullEl = document.getElementById('envelopeAmountFull');
  const envelopeSpentFullEl = document.getElementById('envelopeSpentFull');
  const envelopeMedianFullEl = document.getElementById('envelopeMedianFull');
  const spendingGaugeFullEl = document.getElementById('spendingGaugeFull');
  const envelopePeriodInfoFullEl = document.getElementById('envelopePeriodInfoFull');
  const envelopeCalcInfoFullEl = document.getElementById('envelopeCalculationInfoFull');

  if (!envelope) {
    if (envelopeAmountEl) envelopeAmountEl.textContent = '0.00';
    if (envelopeSpentEl) envelopeSpentEl.textContent = '0.00';
    if (envelopeRemainingEl) envelopeRemainingEl.textContent = '0.00';
    if (envelopeMedianEl) envelopeMedianEl.textContent = '0.00';
    if (spendingGaugeEl) spendingGaugeEl.style.width = '0%';
    if (envelopeAmountFullEl) envelopeAmountFullEl.textContent = '0.00';
    if (envelopeSpentFullEl) envelopeSpentFullEl.textContent = '0.00';
    if (envelopeMedianFullEl) envelopeMedianFullEl.textContent = '0.00';
    if (spendingGaugeFullEl) spendingGaugeFullEl.style.width = '0%';
    updateEnvelopeGaugeSvg('envelopeGaugeFillEl', 'envelopeGaugeRemaining', 0, 0);
    updateEnvelopeGaugeSvg('envelopeGaugeFillFull', 'envelopeGaugeRemainingFull', 0, 0);

    if (envelopePeriodInfoEl) {
      envelopePeriodInfoEl.innerHTML = '';
    }

    const calcInfoDiv = document.getElementById('envelopeCalculationInfo');
    if (calcInfoDiv) {
      if (calcInfo) {
        calcInfoDiv.innerHTML = sanitizeHTML(`<small style="color: white; opacity: 0.95;">${calcInfo.description}</small>`);
      } else {
        calcInfoDiv.innerHTML = '<small style="color: white; opacity: 0.95;">Brak danych do wyliczenia koperty</small>';
      }
    }

    const overLimitDiv = document.getElementById('envelopeOverLimit');
    if (overLimitDiv) {
      overLimitDiv.style.display = 'none';
    }

    return;
  }

  if (envelopeAmountEl) envelopeAmountEl.textContent = total.toFixed(2);
  if (envelopeSpentEl) envelopeSpentEl.textContent = spent.toFixed(2);
  if (envelopeRemainingEl) envelopeRemainingEl.textContent = remaining.toFixed(2);
  if (envelopeMedianEl) envelopeMedianEl.textContent = median.toFixed(2);

  if (envelopeAmountFullEl) envelopeAmountFullEl.textContent = total.toFixed(2);
  if (envelopeSpentFullEl) envelopeSpentFullEl.textContent = spent.toFixed(2);
  if (envelopeMedianFullEl) envelopeMedianFullEl.textContent = median.toFixed(2);

  // Limit dzienny + dni do końca
  const limitFullEl = document.getElementById('envelopeLimitFull');
  if (limitFullEl) limitFullEl.textContent = total.toFixed(2);

  const daysLeftEl = document.getElementById('envelopeDaysLeft');
  if (daysLeftEl) {
    const daysLeft = envelope.period?.daysLeft ?? '—';
    daysLeftEl.textContent = daysLeft;
  }

  // "Dziś o tej porze" section
  renderDayProgress(spent, total);

  // 14-day chart
  renderEnvelope14Days(total);

  // Wyświetl informację o okresie i dacie przeliczenia
  if (envelopePeriodInfoEl) {
    if (envelope.period && envelope.calculatedAt) {
      const calcDate = new Date(envelope.calculatedAt);
      const formattedDate = calcDate.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      // ZMIANA: Pokazuj "Dziś", countdown timer (HH:MM:SS) lub liczbę dni
      let timeText;
      if (envelope.period.showToday) {
        // Gdy wpływ jest dziś i nie podano czasu
        timeText = 'Dziś';
      } else if (envelope.period.countdownFormat) {
        // Gdy zostało < 1 dzień i podano czas
        timeText = `<span class="countdown-timer" data-end-date="${envelope.period.date}" data-end-time="${envelope.period.time || ''}">${envelope.period.countdownFormat}</span>`;
      } else {
        // Gdy >= 1 dzień
        timeText = envelope.period.timeFormatted || `${envelope.period.daysLeft} dni`;
      }
      const periodText = `📅 Okres: ${envelope.period.name} (${timeText}) | 🕐 Wyliczono: ${formattedDate}`;
      envelopePeriodInfoEl.innerHTML = sanitizeHTML(periodText);
      if (envelopePeriodInfoFullEl) envelopePeriodInfoFullEl.innerHTML = sanitizeHTML(periodText);
    } else if (envelope.period) {
      // ZMIANA: Pokazuj "Dziś", countdown timer (HH:MM:SS) lub liczbę dni
      let timeText;
      if (envelope.period.showToday) {
        // Gdy wpływ jest dziś i nie podano czasu
        timeText = 'Dziś';
      } else if (envelope.period.countdownFormat) {
        // Gdy zostało < 1 dzień i podano czas
        timeText = `<span class="countdown-timer" data-end-date="${envelope.period.date}" data-end-time="${envelope.period.time || ''}">${envelope.period.countdownFormat}</span>`;
      } else {
        // Gdy >= 1 dzień
        timeText = envelope.period.timeFormatted || `${envelope.period.daysLeft} dni`;
      }
      const periodText = `📅 Okres: ${envelope.period.name} (${timeText})`;
      envelopePeriodInfoEl.innerHTML = sanitizeHTML(periodText);
      if (envelopePeriodInfoFullEl) envelopePeriodInfoFullEl.innerHTML = sanitizeHTML(periodText);
    } else {
      envelopePeriodInfoEl.innerHTML = '';
      if (envelopePeriodInfoFullEl) envelopePeriodInfoFullEl.innerHTML = '';
    }

    // Uruchom countdown timery po wyrenderowaniu
    startCountdownTimers();
  }

  const gaugeColor = percentage < 50 ? 'linear-gradient(90deg, #10b981, #059669)'
    : percentage < 80 ? 'linear-gradient(90deg, #f59e0b, #d97706)'
    : 'linear-gradient(90deg, #ef4444, #dc2626)';

  if (spendingGaugeEl) {
    spendingGaugeEl.style.width = `${percentage}%`;
    spendingGaugeEl.style.background = gaugeColor;
  }
  if (spendingGaugeFullEl) {
    spendingGaugeFullEl.style.width = `${percentage}%`;
    spendingGaugeFullEl.style.background = gaugeColor;
  }

  // Update both SVG ring gauges
  updateEnvelopeGaugeSvg('envelopeGaugeFillEl', 'envelopeGaugeRemaining', spent, total);
  updateEnvelopeGaugeSvg('envelopeGaugeFillFull', 'envelopeGaugeRemainingFull', spent, total);

  const calcInfoHtml = calcInfo ? sanitizeHTML(`
    <small style="font-size: 0.85rem; line-height: 1.4; opacity: 0.85;">
      ${calcInfo.description}<br>
      <strong>Składowe:</strong> ${calcInfo.formula}
    </small>
  `) : '';

  const calcInfoDiv = document.getElementById('envelopeCalculationInfo');
  if (calcInfoDiv && calcInfo) {
    calcInfoDiv.innerHTML = sanitizeHTML(`
      <small style="color: white; font-size: 0.85rem; line-height: 1.4; opacity: 0.95;">
        ${calcInfo.description}<br>
        <strong>Składowe:</strong> ${calcInfo.formula}
      </small>
    `);
  }
  if (envelopeCalcInfoFullEl && calcInfo) {
    envelopeCalcInfoFullEl.innerHTML = calcInfoHtml;
  }

  const overLimitDiv = document.getElementById('envelopeOverLimit');
  if (overLimitDiv) {
    if (spent > total) {
      const overAmount = (spent - total).toFixed(2);
      const html = `
        <div style="color: #fee; font-weight: 600; margin-top: 10px;">
          ⚠️ Przekroczono kopertę o ${overAmount} zł
        </div>
      `;
      overLimitDiv.innerHTML = sanitizeHTML(html);
      overLimitDiv.style.display = 'block';
    } else {
      overLimitDiv.style.display = 'none';
    }
  }
}
