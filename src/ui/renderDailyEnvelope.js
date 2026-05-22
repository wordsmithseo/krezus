// src/ui/renderDailyEnvelope.js
import { getDailyEnvelope, getExpenses, loadDailyEnvelope } from '../modules/dataManager.js';
import {
  calculateSpendingGauge,
  getGlobalMedian30d,
  calculateSpendingPeriods,
  getOrCalculateLimits
} from '../modules/budgetCalculator.js';

import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { startCountdownTimers } from '../utils/countdownTimer.js';
import { getWarsawDateString, getWarsawTimeString } from '../utils/dateHelpers.js';
import { icon } from '../utils/icons.js';
import { Fmt } from '../utils/fmt.js';

async function renderEnvelope14Days(total) {
  const container = document.getElementById('envelopeChart14');
  if (!container) return;

  const expenses = getExpenses();
  const chartH = 140;
  const now = new Date();

  // Fetch historical envelope values (days 1–13 ago); today comes from cache
  const historyMap = {};
  const todayStr = getWarsawDateString();
  const todayEnv = getDailyEnvelope();
  historyMap[todayStr] = todayEnv?.totalAmount ?? total;

  await Promise.all(
    Array.from({ length: 13 }, (_, idx) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - idx));
      const dateStr = getWarsawDateString(d);
      return loadDailyEnvelope(dateStr).then(env => {
        historyMap[dateStr] = env?.totalAmount ?? null;
      });
    })
  );

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getWarsawDateString(d);
    const value = expenses
      .filter(e => e.type === 'normal' && e.date === dateStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const envelopeVal = historyMap[dateStr] ?? total;
    days.push({ dateStr, value, day: d.getDate(), envelopeVal });
  }

  const maxVal = Math.max(...days.map(d => d.value), ...days.map(d => d.envelopeVal), 1);

  const barsHtml = days.map((d, i) => {
    const barH = d.value > 0 ? Math.max(Math.round((d.value / maxVal) * chartH), 2) : 0;
    const isOver = d.envelopeVal > 0 && d.value > d.envelopeVal;
    const color = isOver ? 'var(--danger)' : 'var(--accent)';
    const dateObj = new Date(d.dateStr + 'T12:00:00');
    const dateFmt = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const tip = `${dateFmt}: ${Fmt.zl(d.value)} zł (koperta: ${Fmt.zl(d.envelopeVal)} zł)`;
    return `<div class="daily-bar" data-tip="${escapeHTML(tip)}"><div style="height:${barH}px;--bar-h:${barH}px;background:${color};border-radius:3px 3px 2px 2px;opacity:0.8;animation:bar-rise 350ms ease both;animation-delay:${i * 25}ms"></div></div>`;
  }).join('');

  const dayLabels = days.map(d => `<div style="flex:1;text-align:center;font-family:var(--font-mono);font-size:10px;color:var(--ink-3)">${d.day}</div>`).join('');

  const html = `
    <div data-envelope-bars style="position:relative;display:flex;gap:3px;height:${chartH}px">${barsHtml}</div>
    <div style="display:flex;gap:3px;margin-top:4px">${dayLabels}</div>
    <div style="display:flex;align-items:center;gap:16px;font-size:12px;color:var(--ink-3);margin-top:14px;flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;background:var(--accent);border-radius:2px;flex-shrink:0;opacity:0.8"></span>Wydatki w normie</span>
      <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;background:var(--danger);border-radius:2px;flex-shrink:0;opacity:0.8"></span>Przekroczenie</span>
      ${total > 0 ? `<span style="display:flex;align-items:center;gap:6px"><span style="width:18px;border-top:1px dashed var(--ink-3);display:inline-block"></span>Koperta dnia</span>` : ''}
    </div>
  `;
  container.innerHTML = sanitizeHTML(html);

  // Draw the envelope line as SVG after DOM insertion so we can read actual pixel widths.
  // Built programmatically to avoid DOMPurify attribute restrictions and scaling distortion.
  if (total > 0) {
    const drawLine = () => {
      const barsEl = container.querySelector('[data-envelope-bars]');
      if (!barsEl) return;
      const W = barsEl.clientWidth;
      // Retry once if section was hidden during first rAF (clientWidth = 0)
      if (!W) { requestAnimationFrame(drawLine); return; }
      // Remove any previously drawn line before redrawing
      barsEl.querySelector('svg')?.remove();

      const barW = (W - 13 * 3) / 14; // 14 flex:1 bars, 13 gaps of 3px
      const pathPoints = days.map((d, i) => {
        const cx = (i * (barW + 3) + barW / 2).toFixed(1);
        const cy = ((1 - d.envelopeVal / maxVal) * chartH).toFixed(1);
        return `${cx},${cy}`;
      });

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = `position:absolute;top:0;left:0;width:${W}px;height:${chartH}px;pointer-events:none;overflow:visible`;
      svg.setAttribute('aria-hidden', 'true');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${pathPoints.join(' L ')}`);
      // CSS variables only work via style, not SVG presentation attributes
      path.style.cssText = 'fill:none;stroke:var(--ink-3);stroke-width:2;stroke-dasharray:5 4';

      svg.appendChild(path);
      barsEl.appendChild(svg);
    };
    requestAnimationFrame(drawLine);
  }
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

  const diffFmt = Fmt.zl(Math.abs(diff));
  const expectedFmt = Fmt.zl(expectedSpend);
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
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  fill.style.strokeDashoffset = `${(1 - pct).toFixed(4)}`;
  fill.style.stroke = pct > 0.85 ? 'var(--danger)' : pct > 0.6 ? 'oklch(0.65 0.15 50)' : 'var(--accent)';
  const rem = document.getElementById(remainingId);
  if (rem) rem.textContent = Fmt.zl(spent);
}

function getMiniDateLabel() {
  return 'Dziś, ' + new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw'
  }).format(new Date());
}

function getTimeLeft() {
  const timeStr = getWarsawTimeString();
  const [hh, mm] = timeStr.split(':').map(Number);
  const minsLeft = (24 * 60) - (hh * 60 + mm);
  const h = Math.floor(minsLeft / 60);
  const m = minsLeft % 60;
  if (h === 0) return `~${m} min`;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m} min`;
}

export function renderDailyEnvelope() {
  const envelope = getDailyEnvelope();
  const { spent, total, percentage, remaining } = calculateSpendingGauge();
  const median = getGlobalMedian30d();

  const envelopeAmountEl = document.getElementById('envelopeAmount');
  const envelopeSpentEl = document.getElementById('envelopeSpent');
  const envelopeRemainingEl = document.getElementById('envelopeRemaining');
  const envelopeMedianEl = document.getElementById('envelopeMedian');
  const spendingGaugeEl = document.getElementById('spendingGauge');
  const envelopePeriodInfoEl = document.getElementById('envelopePeriodInfo');
  const envelopeMiniDateEl = document.getElementById('envelopeMiniDate');
  const envelopeTimeLeftEl = document.getElementById('envelopeTimeLeft');

  // Full envelope section elements
  const envelopeAmountFullEl = document.getElementById('envelopeAmountFull');
  const envelopeSpentFullEl = document.getElementById('envelopeSpentFull');
  const envelopeMedianFullEl = document.getElementById('envelopeMedianFull');
  const spendingGaugeFullEl = document.getElementById('spendingGaugeFull');
  const envelopePeriodInfoFullEl = document.getElementById('envelopePeriodInfoFull');

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

    if (envelopePeriodInfoEl) envelopePeriodInfoEl.innerHTML = '';

    const overLimitDiv = document.getElementById('envelopeOverLimit');
    if (overLimitDiv) overLimitDiv.style.display = 'none';

    if (envelopeMiniDateEl) envelopeMiniDateEl.textContent = getMiniDateLabel();
    if (envelopeTimeLeftEl) envelopeTimeLeftEl.textContent = getTimeLeft();

    return;
  }

  if (envelopeAmountEl) envelopeAmountEl.textContent = Fmt.zl(total);
  if (envelopeSpentEl) envelopeSpentEl.textContent = Fmt.zl(spent);
  if (envelopeRemainingEl) envelopeRemainingEl.textContent = Fmt.zl(remaining);
  if (envelopeMedianEl) envelopeMedianEl.textContent = Fmt.zl(median);

  if (envelopeMiniDateEl) envelopeMiniDateEl.textContent = getMiniDateLabel();
  if (envelopeTimeLeftEl) envelopeTimeLeftEl.textContent = getTimeLeft();

  if (envelopeAmountFullEl) envelopeAmountFullEl.textContent = Fmt.zl(total);
  if (envelopeSpentFullEl) envelopeSpentFullEl.textContent = Fmt.zl(spent);
  if (envelopeMedianFullEl) envelopeMedianFullEl.textContent = Fmt.zl(median);

  // Limit dzienny + dni do końca
  const limitFullEl = document.getElementById('envelopeLimitFull');
  if (limitFullEl) limitFullEl.textContent = Fmt.zl(total);

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
      const periodText = `${icon('Calendar', {size:11})} Okres: ${envelope.period.name} (${timeText}) | ${icon('Clock', {size:11})} Wyliczono: ${formattedDate}`;
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
      const periodText = `${icon('Calendar', {size:11})} Okres: ${envelope.period.name} (${timeText})`;
      envelopePeriodInfoEl.innerHTML = sanitizeHTML(periodText);
      if (envelopePeriodInfoFullEl) envelopePeriodInfoFullEl.innerHTML = sanitizeHTML(periodText);
    } else {
      envelopePeriodInfoEl.innerHTML = '';
      if (envelopePeriodInfoFullEl) envelopePeriodInfoFullEl.innerHTML = '';
    }

    // Uruchom countdown timery po wyrenderowaniu
    startCountdownTimers();
  }

  const gaugeColor = percentage < 50 ? 'var(--success)'
    : percentage < 80 ? 'var(--warning)'
    : 'var(--danger)';

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

  const totalLabel = `z ${Fmt.zl(total)} zł`;
  const gaugeTotalEl = document.getElementById('envelopeGaugeTotal');
  if (gaugeTotalEl) gaugeTotalEl.textContent = totalLabel;
  const gaugeTotalFullEl = document.getElementById('envelopeGaugeTotalFull');
  if (gaugeTotalFullEl) gaugeTotalFullEl.textContent = totalLabel;

  const overLimitDiv = document.getElementById('envelopeOverLimit');
  if (overLimitDiv) {
    if (spent > total) {
      const overAmount = Fmt.zl(spent - total);
      overLimitDiv.innerHTML = sanitizeHTML(
        `<div style="background:var(--danger-soft);color:var(--danger);border-radius:6px;padding:8px 12px;font-size:13px;font-weight:500;margin-top:6px;display:flex;align-items:center;gap:6px">${icon('AlertTriangle', {size:13})} Przekroczono kopertę o ${escapeHTML(overAmount)} zł</div>`
      );
      overLimitDiv.style.display = 'block';
    } else {
      overLimitDiv.style.display = 'none';
    }
  }

  const recalcInfoEl = document.getElementById('envelopeRecalcInfo');
  if (recalcInfoEl) {
    if (envelope.calculatedAt) {
      const calcDate = new Date(envelope.calculatedAt);
      const dateFmt = calcDate.toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw'
      });
      const timeFmt = calcDate.toLocaleTimeString('pl-PL', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
      });
      const targetDateFmt = new Date(envelope.date + 'T12:00:00').toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const triggerLabels = {
        midnight: 'automatycznie (północ)',
        manual:   'ręcznie (przycisk)',
        initial:  'przy starcie aplikacji',
      };
      const triggerText = triggerLabels[envelope.recalcTrigger] || 'automatycznie';
      const triggerIcon = envelope.recalcTrigger === 'manual'
        ? icon('RefreshCw', { size: 11 })
        : icon('Clock', { size: 11 });
      recalcInfoEl.innerHTML = sanitizeHTML(
        `<span class="tag success dot" style="font-size:11px;gap:5px;white-space:normal;text-align:center;line-height:1.5">${icon('Check', { size: 11 })} Koperta na dzień ${escapeHTML(targetDateFmt)} przeliczona ${escapeHTML(dateFmt)} o ${escapeHTML(timeFmt)} · ${triggerIcon} ${escapeHTML(triggerText)}</span>`
      );
    } else {
      recalcInfoEl.innerHTML = '';
    }
  }
}
