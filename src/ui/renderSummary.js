// src/ui/renderSummary.js
import {
  calculateAvailableFunds,
  calculateSpendingPeriods,
  calculateCurrentLimits,
  calculatePlannedTransactionsTotals,
  getOrCalculateLimits,
  getTodayExpenses,
  getWeekExpenses,
  getMonthExpenses,
  getWeekDateRange,
  getMonthName,
  calculateSpendingDynamics,
} from '../modules/budgetCalculator.js';

import { getIncomes, getExpenses, getCategories } from '../modules/dataManager.js';
import { formatDateLabel, getWarsawDateString } from '../utils/dateHelpers.js';
import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { getCategoryIcon, getSourceIcon } from '../utils/iconMapper.js';
import { animateNumber } from '../utils/animateNumber.js';
import { startCountdownTimers } from '../utils/countdownTimer.js';
import { sparklineHTML, dailyChartHTML } from './charts.js';
import { icon } from '../utils/icons.js';
import { Fmt } from '../utils/fmt.js';
import { userChipHTML } from './chips.js';

let _getBudgetUsersCache = () => [];
export function setSummaryDeps({ getBudgetUsersCache }) {
  _getBudgetUsersCache = getBudgetUsersCache;
}

function buildLastNDaysData(n = 30) {
  const expenses = getExpenses();
  const data = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getWarsawDateString(d);
    const total = expenses
      .filter(e => e.type === 'normal' && e.date === dateStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    data.push({ date: dateStr, value: total });
  }
  return data;
}

let heroSparklineDays = 7;
let _segInitialized = false;

function renderSparkline(days = heroSparklineDays) {
  const wrap = document.getElementById('spendingSparklineWrap');
  if (!wrap) return;
  const data = buildLastNDaysData(days);
  const values = data.map(d => d.value);
  wrap.innerHTML = sparklineHTML(values, { height: 48 });
  const svg = wrap.querySelector('svg');
  if (svg) { svg.style.cssText = 'width:100%;height:100%;display:block'; }

  // Średnia + delta
  const meta = document.getElementById('heroSparklineMeta');
  if (!meta) return;
  const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;

  const prevData = buildLastNDaysData(days * 2).slice(0, days);
  const prevValues = prevData.map(d => d.value);
  const prevAvg = prevValues.length > 0 ? prevValues.reduce((s, v) => s + v, 0) / prevValues.length : 0;

  const avgFmt = Fmt.zl(avg);
  let deltaHtml = '';
  if (prevAvg > 0) {
    const pct = ((avg - prevAvg) / prevAvg) * 100;
    const sign = pct >= 0 ? '+' : '';
    const tone = pct > 0 ? 'up bad' : 'down good';
    const arrow = pct > 0 ? icon('TrendUp', { size: 11 }) : icon('TrendDown', { size: 11 });
    deltaHtml = `<span class="delta ${tone}">${arrow}${sign}${pct.toFixed(1).replace('.', ',')}% vs poprzednie ${days}d</span>`;
  }
  meta.innerHTML = sanitizeHTML(
    `<span style="color:var(--ink-3)">Średnia ${days}d: <strong class="num" style="color:var(--ink-1)">${avgFmt} zł</strong></span>${deltaHtml ? ' ' + deltaHtml : ''}`
  );
}

function initHeroSparklineSeg() {
  if (_segInitialized) return;
  const seg = document.getElementById('heroSparklineSeg');
  if (!seg) return;
  _segInitialized = true;
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-days]');
    if (!btn) return;
    heroSparklineDays = parseInt(btn.dataset.days, 10);
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    renderSparkline(heroSparklineDays);
  });
}

function deltaHTML(current, prev, invert = false, vsLabel = '') {
  if (prev <= 0 || current === 0) return '';
  const pct = ((current - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  // invert=true → wzrost wydatków to zło (up bad), spadek to dobro (down good)
  const up = pct > 0;
  const tone = invert ? (up ? 'up bad' : 'down good') : (up ? 'up good' : 'down bad');
  const arrow = up ? icon('TrendUp', { size: 11 }) : icon('TrendDown', { size: 11 });
  const vs = vsLabel ? ` <span style="font-weight:400;opacity:0.7;font-size:10px">${vsLabel}</span>` : '';
  return `<span class="delta ${tone}">${arrow}${sign}${pct.toFixed(1).replace('.', ',')}%${vs}</span>`;
}

function renderPeriodDeltas(todayExp, weekExp, monthExp) {
  const expenses = getExpenses();
  const now = new Date();

  // Dziś vs średnia dzienna z ostatnich 30 dni
  const last30 = buildLastNDaysData(30);
  const avg30 = last30.reduce((s, d) => s + d.value, 0) / 30;
  const todayEl = document.getElementById('todayExpensesDelta');
  if (todayEl) todayEl.innerHTML = sanitizeHTML(deltaHTML(todayExp, avg30, true, 'vs śr. 30d'));

  // Tydzień vs poprzedni tydzień (ostatnie 7 dni vs 7 dni wcześniej)
  const w1End = getWarsawDateString(now);
  const w1Start = new Date(now); w1Start.setDate(now.getDate() - 6);
  const w2End = new Date(now); w2End.setDate(now.getDate() - 7);
  const w2Start = new Date(now); w2Start.setDate(now.getDate() - 13);
  const prevWeekExp = expenses
    .filter(e => e.type === 'normal' && e.date >= getWarsawDateString(w2Start) && e.date <= getWarsawDateString(w2End))
    .reduce((s, e) => s + (e.amount || 0), 0);
  const weekEl = document.getElementById('weekExpensesDelta');
  if (weekEl) weekEl.innerHTML = sanitizeHTML(deltaHTML(weekExp, prevWeekExp, true, 'vs poprzedni tydz.') || '');

  // Miesiąc vs poprzedni miesiąc (proporcjonalnie do dni)
  const daysElapsed = now.getDate();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, daysElapsed);
  const prevMonthExp = expenses
    .filter(e => e.type === 'normal' && e.date >= getWarsawDateString(prevMonthStart) && e.date <= getWarsawDateString(prevMonthSameDay))
    .reduce((s, e) => s + (e.amount || 0), 0);
  const monthEl = document.getElementById('monthExpensesDelta');
  if (monthEl) monthEl.innerHTML = sanitizeHTML(deltaHTML(monthExp, prevMonthExp, true, 'vs poprzedni mies.') || '');
}

export function renderSummary() {
  const { available, totalAvailable, savingsAmount } = calculateAvailableFunds();

  const todayExpenses = getTodayExpenses();
  const weekExpenses = getWeekExpenses();
  const monthExpenses = getMonthExpenses();

  const weekRange = getWeekDateRange();
  const monthName = getMonthName();
  const todayDate = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Podstawowe statystyki
  const availableFundsEl = document.getElementById('availableFunds');

  if (availableFundsEl) animateNumber(availableFundsEl, available, 1500, 2, 0, Fmt.zl);

  // Pokaż informację o oszczędnościach jeśli są zdefiniowane
  const savingsInfoEl = document.getElementById('savingsInfo');
  if (savingsInfoEl) {
    if (savingsAmount > 0) {
      const amtFmt = Fmt.zl(savingsAmount);
      savingsInfoEl.innerHTML = sanitizeHTML(
        `<span class="tag success dot">Po odjęciu oszczędności <strong class="num">${amtFmt} zł</strong></span>`
      );
      savingsInfoEl.style.display = 'block';
    } else {
      savingsInfoEl.style.display = 'none';
    }
  }

  // Wydatki dzisiaj
  const todayLabelEl = document.getElementById('todayExpensesLabel');
  if (todayLabelEl) todayLabelEl.textContent = `Dziś (${todayDate})`;
  const todayExpensesEl = document.getElementById('todayExpenses');
  if (todayExpensesEl) animateNumber(todayExpensesEl, todayExpenses, 1500, 2, 0, Fmt.zl);

  // Wydatki w tym tygodniu
  const weekLabelEl = document.getElementById('weekExpensesLabel');
  if (weekLabelEl) weekLabelEl.textContent = `Tydzień (${weekRange.start}–${weekRange.end})`;
  const weekExpensesEl = document.getElementById('weekExpenses');
  if (weekExpensesEl) animateNumber(weekExpensesEl, weekExpenses, 1500, 2, 0, Fmt.zl);

  // Wydatki w tym miesiącu
  const monthLabelEl = document.getElementById('monthExpensesLabel');
  if (monthLabelEl) monthLabelEl.textContent = `Miesiąc (${monthName})`;
  const monthExpensesEl = document.getElementById('monthExpenses');
  if (monthExpensesEl) animateNumber(monthExpensesEl, monthExpenses, 1500, 2, 0, Fmt.zl);

  // Średnia dzienna (ostatnie 30 dni)
  const last30forAvg = buildLastNDaysData(30);
  const dailyAvg = last30forAvg.reduce((s, d) => s + d.value, 0) / 30;
  const dailyAvgEl = document.getElementById('dailyAvgExpenses');
  if (dailyAvgEl) animateNumber(dailyAvgEl, dailyAvg, 1500, 2, 0, Fmt.zl);

  // Delty pod statystykami
  renderPeriodDeltas(todayExpenses, weekExpenses, monthExpenses);

  // NOWE: Renderuj wszystkie okresy dynamicznie
  const { limits: limitsData, plannedTotals, calculatedAt } = getOrCalculateLimits();

  renderDynamicLimits(limitsData, plannedTotals, available, calculatedAt);

  // Planowane transakcje - obliczamy sumę UNIKALNYCH planowanych transakcji
  // (nie sumujemy okresów, bo każda transakcja byłaby liczona wielokrotnie!)
  const incomes = getIncomes();
  const expenses = getExpenses();
  const today = getWarsawDateString();

  const totalPlannedIncome = incomes
    .filter(inc => inc.type === 'planned' && inc.date >= today)
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const totalPlannedExpense = expenses
    .filter(exp => exp.type === 'planned' && exp.date >= today)
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const futureIncomeEl = document.getElementById('futureIncome');
  const futureExpenseEl = document.getElementById('futureExpense');

  if (futureIncomeEl) animateNumber(futureIncomeEl, totalPlannedIncome, 1500, 2, 0, Fmt.zl);
  if (futureExpenseEl) animateNumber(futureExpenseEl, totalPlannedExpense, 1500, 2, 0, Fmt.zl);

  // Dynamika wydatków
  renderSpendingDynamics();

  // Sparkline w hero
  initHeroSparklineSeg();
  renderSparkline();

  // Nadchodzące transakcje
  renderUpcomingTransactions();
}

export function renderSpendingDynamics() {
  const container = document.getElementById('dynamicsInfo');
  if (!container) return;

  const d = calculateSpendingDynamics();

  if (d.status === 'no-date') {
    container.innerHTML = sanitizeHTML(`
      <div style="padding:20px 16px;text-align:center;color:var(--ink-3);font-size:13px">${escapeHTML(d.summary)}</div>
    `);
    return;
  }

  const STATUS_TAG = {
    excellent: 'tag success dot',
    good:      'tag success dot',
    moderate:  'tag accent dot',
    warning:   'tag danger dot',
    critical:  'tag danger dot',
  };
  const tagClass = STATUS_TAG[d.status] || 'tag dot';

  const pct = Math.min(100, Math.round((d.ratio || 0) * 100));
  const barColor = d.status === 'excellent' || d.status === 'good'
    ? 'var(--success)'
    : d.status === 'moderate'
      ? 'var(--accent)'
      : d.status === 'warning'
        ? 'var(--warning)'
        : 'var(--danger)';

  let timeHtml;
  if (d.showToday) {
    timeHtml = 'Dziś';
  } else if (d.countdownFormat) {
    timeHtml = `<span class="countdown-timer" data-end-date="${d.periodDate}" data-end-time="${d.periodTime2}">${d.countdownFormat}</span>`;
  } else {
    timeHtml = escapeHTML(d.periodTime || '—');
  }

  const overBudget = d.projectedTotal > d.toSpend && d.toSpend > 0;
  const projColor = overBudget ? 'var(--danger)' : 'var(--ink-1)';

  const html = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--line)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px">
        <span style="font-size:12px;font-weight:600;color:var(--ink-2)">${escapeHTML(d.periodName || 'Okres')}</span>
        <span class="${tagClass}" style="font-size:10px">${escapeHTML(d.title)}</span>
      </div>
      <span style="font-size:11px;color:var(--ink-3)">Następny planowany wpływ — horyzont tej analizy</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-bottom:1px solid var(--line)">
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:3px">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--ink-3)">Śr/dzień (7d)</span>
        <span class="num" style="font-size:16px;font-weight:600;color:var(--ink-1)">${Fmt.zl(d.dailyAvg7)} <span style="font-size:11px;color:var(--ink-3)">zł</span></span>
        <span style="font-size:10px;color:var(--ink-3)">Twoje aktualne tempo</span>
      </div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:3px;border-left:1px solid var(--line);border-right:1px solid var(--line)">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--ink-3)">Limit/dzień</span>
        <span class="num" style="font-size:16px;font-weight:600;color:var(--ink-1)">${Fmt.zl(d.targetDaily)} <span style="font-size:11px;color:var(--ink-3)">zł</span></span>
        <span style="font-size:10px;color:var(--ink-3)">Dostępne ÷ dni do wpływu</span>
      </div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:3px">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--ink-3)">Do wpływu</span>
        <span style="font-size:13px;font-weight:500;color:var(--ink-2)">${timeHtml}</span>
        <span style="font-size:10px;color:var(--ink-3)">Koniec okresu</span>
      </div>
    </div>
    <div style="padding:10px 16px;border-bottom:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
        <div>
          <span style="font-size:11px;font-weight:600;color:var(--ink-2)">Tempo vs limit</span>
          <span style="font-size:10px;color:var(--ink-3)"> · śr. 7d ÷ limit; limit maleje z każdym dniem</span>
        </div>
        <span class="num" style="font-size:11px;font-weight:600;color:${barColor}">${pct}%</span>
      </div>
      <div class="progress" style="height:5px;border-radius:3px;background:var(--surface-2)">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.4s"></div>
      </div>
    </div>
    <div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div>
        <span style="font-size:11px;font-weight:600;color:var(--ink-2)">Prognoza do końca okresu</span>
        <span style="font-size:10px;color:var(--ink-3)"> · jeśli utrzymasz to tempo${overBudget ? ', przekroczysz budżet' : ''}</span>
      </div>
      <span class="num" style="font-size:13px;font-weight:600;color:${projColor};white-space:nowrap">${Fmt.zl(d.projectedTotal)} zł${overBudget ? ' ' + icon('AlertTriangle', { size: 12 }) : ''}</span>
    </div>`;

  container.innerHTML = sanitizeHTML(html);
  startCountdownTimers(container);
}

/**
 * Renderuje dynamicznie wszystkie kafelki limitów dla okresów budżetowych
 */
function renderDynamicLimits(limitsData, plannedTotals, available, calculatedAt) {
  const { limits } = limitsData;

  const statsGrid = document.getElementById('limitsGrid');
  if (!statsGrid) return;

  const calcDateEl = document.getElementById('limitsCalcDate');
  if (calcDateEl) {
    const calcDate = new Date(calculatedAt);
    calcDateEl.textContent = `Wyliczono: ${calcDate.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  }

  statsGrid.innerHTML = '';

  if (limits.length === 0) {
    statsGrid.innerHTML = sanitizeHTML(`
      <div class="card" style="text-align:center;padding:32px 20px;color:var(--ink-3)">
        <div style="font-size:14px;font-weight:500;color:var(--ink-2);margin-bottom:6px">Brak planowanych przychodów</div>
        <div style="font-size:13px">Dodaj przychody z typem „Planowany", aby zobaczyć limity dzienne dla każdego okresu.</div>
      </div>
    `);
    return;
  }

  limits.forEach((limit, index) => {
    const realLimit = limit.realLimit || 0;
    const plannedLimit = limit.plannedLimit || 0;
    const delta = plannedLimit - realLimit;
    const isFirst = index === 0;
    const limitIcon = getSourceIcon(limit.name || 'Planowany wpływ');
    const usersCache = _getBudgetUsersCache();
    const limitUser = limit.userId ? (usersCache.find(u => u.id === limit.userId) || null) : null;
    const futureExpense = plannedTotals?.periodTotals?.[index]?.futureExpense || 0;

    let timeText;
    if (limit.showToday) {
      timeText = 'Dziś';
    } else if (limit.countdownFormat) {
      timeText = `<span class="countdown-timer" data-end-date="${limit.date}" data-end-time="${limit.time || ''}">${limit.countdownFormat}</span>`;
    } else {
      timeText = `${limit.daysLeft}d`;
    }

    const dateStr = limit.date ? Fmt.date(limit.date) : '';

    const realColor = realLimit < 50 ? 'var(--danger)' : 'var(--ink-1)';

    const tileStyle = isFirst
      ? 'padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 25%,var(--line))'
      : 'padding:16px;display:flex;flex-direction:column;gap:12px';

    const html = `
      <div class="card limit-tile${isFirst ? ' limit-tile--next' : ''}" style="${tileStyle}">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div class="limit-tile-icon">${limitIcon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;letter-spacing:-0.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(limit.name || 'Planowany wpływ')}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px">
              ${limitUser ? userChipHTML(limitUser) : ''}
              ${isFirst ? '<span class="tag accent dot" style="font-size:10px">Następny</span>' : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 10px;background:var(--surface-2);border-radius:8px;gap:8px;flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--ink-3)">Wpływ</span>
            <span class="num" style="font-size:16px;font-weight:600;color:var(--success)">+${Fmt.zl(limit.amount || 0)} zł</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--ink-3)">Data</span>
            <span style="font-size:13px;font-weight:500"><span class="num">${dateStr}</span> <span style="font-size:11px;color:var(--ink-3)">· za ${timeText}</span></span>
          </div>
        </div>
        <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)">
          <div style="padding:10px 12px;display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--ink-3);white-space:nowrap;display:inline-flex;align-items:center;gap:3px">${icon('Wallet', {size:10})} Realny</span>
            <span style="font-size:11px;color:var(--ink-3)">· bez wpływu</span>
            <div class="num" style="margin-left:auto;font-size:18px;font-weight:500;color:${realColor};white-space:nowrap">${Fmt.zl(realLimit)} <span style="font-size:11px;color:var(--ink-3)">zł/d</span></div>
          </div>
          <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);background:color-mix(in srgb, var(--accent) 6%, transparent)">
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--accent);white-space:nowrap;display:inline-flex;align-items:center;gap:3px">${icon('Sparkles', {size:10})} Planowany</span>
            <span style="font-size:11px;color:var(--ink-3)">· po wpływie</span>
            <div class="num" style="margin-left:auto;font-size:18px;font-weight:500;color:var(--accent);white-space:nowrap">${Fmt.zl(plannedLimit)} <span style="font-size:11px;color:var(--ink-3)">zł/d</span></div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink-3);flex-wrap:wrap;gap:8px">
          <span>Różnica: <strong class="num" style="color:${delta >= 0 ? 'var(--success)' : 'var(--danger)'}">${delta >= 0 ? '+' : ''}${Fmt.zl(delta)} zł/d</strong></span>
          ${futureExpense > 0 ? `<span>Zobowiązania: <strong class="num" style="color:var(--danger)">${Fmt.zl(futureExpense)} zł</strong></span>` : ''}
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = sanitizeHTML(html);
    statsGrid.appendChild(wrapper.firstElementChild);
  });

  startCountdownTimers();
}

export function renderUpcomingTransactions() {
  const container = document.getElementById('upcomingTransactionsList');
  const countBadge = document.getElementById('upcomingCount');
  if (!container) return;

  const today = getWarsawDateString();
  const incomes = getIncomes();
  const expenses = getExpenses();
  const categories = getCategories();

  const catById = id => categories.find(c => c.id === id) || null;

  const upcoming = [
    ...expenses.filter(e => e.type === 'planned' && e.date >= today).map(e => ({ ...e, kind: 'expense' })),
    ...incomes.filter(i => i.type === 'planned' && i.date >= today).map(i => ({ ...i, kind: 'income' })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  if (countBadge) {
    if (upcoming.length > 0) {
      countBadge.textContent = upcoming.length;
      countBadge.style.display = '';
    } else {
      countBadge.style.display = 'none';
    }
  }

  if (upcoming.length === 0) {
    container.innerHTML = '<div style="padding:24px 20px;text-align:center;color:var(--ink-3);font-size:13px">Brak zaplanowanych transakcji</div>';
    return;
  }

  const arrowDownIcon = icon('ArrowDown', { size: 14, strokeWidth: 2 });
  const arrowUpIcon   = icon('ArrowUp',   { size: 14, strokeWidth: 2 });
  const calIcon       = icon('Calendar',  { size: 10, strokeWidth: 2 });

  const relativeDate = dateStr => {
    if (!dateStr) return '';
    const diff = Math.round((new Date(dateStr) - new Date(today)) / 86400000);
    if (diff === 0) return 'Dziś';
    if (diff === 1) return 'Jutro';
    if (diff === 2) return 'Pojutrze';
    return `Za ${diff} dni`;
  };

  const html = upcoming.map(u => {
    const isExpense = u.kind === 'expense';
    const cat = isExpense ? catById(u.category) : null;
    const label = isExpense ? escapeHTML(u.description || '—') : escapeHTML(u.source || '—');
    const catName = cat ? escapeHTML(cat.name) : '';
    const dateLabel = escapeHTML(relativeDate(u.date));
    const amountStr = Fmt.zl(u.amount || 0);
    const iconHtml = isExpense ? arrowDownIcon : arrowUpIcon;
    const colorCls = isExpense ? 'var(--danger)' : 'var(--success)';
    const bgCls    = isExpense ? 'var(--danger-soft)' : 'var(--success-soft)';
    const metaTail = catName ? ` · ${catName}` : '';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--line)">
        <div style="width:36px;height:36px;border-radius:8px;background:${bgCls};color:${colorCls};display:grid;place-items:center;flex-shrink:0">
          ${iconHtml}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</div>
          <div class="text-mute text-sm" style="display:flex;align-items:center;gap:4px">${calIcon}${dateLabel}${metaTail}</div>
        </div>
        <div class="num" style="font-size:13px;font-weight:500;color:${colorCls};white-space:nowrap">
          ${isExpense ? '−' : '+'}${amountStr} zł
        </div>
      </div>`;
  }).join('');

  container.innerHTML = sanitizeHTML(html);
}
