// src/ui/renderAnalytics.js
import {
  setAnalyticsPeriod,
  setCustomDateRange,
  calculatePeriodStats,
  compareToPreviousPeriod,
  getCategoriesBreakdown,
  getUserExpensesBreakdown,
} from '../modules/analytics.js';
import { getExpenses, getCategories } from '../modules/dataManager.js';
import { getCategoryIcon } from '../utils/iconMapper.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { getWarsawDateString } from '../utils/dateHelpers.js';
import { showErrorMessage, showSuccessMessage } from '../utils/errorHandler.js';
import { barChartHTML, dailyChartHTML } from './charts.js';
import { CAT_COLORS } from './renderCategories.js';
import { Fmt } from '../utils/fmt.js';
import { icon } from '../utils/icons.js';

let categoriesChartInstance = null;
let chartTooltip = null;
let chartMouseMoveHandler = null;
let chartMouseLeaveHandler = null;
let chartTouchHandler = null;
let chartTouchEndHandler = null;

function adjustBrightness(hex, percent) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
  const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
  const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));
  const toHex = (n) => { const h = Math.round(n).toString(16); return h.length === 1 ? '0' + h : h; };
  return '#' + toHex(newR) + toHex(newG) + toHex(newB);
}

function comparisonCell(label, curr, prev, unit, lowerIsBetter) {
  const delta = prev ? ((curr - prev) / prev) * 100 : 0;
  const isUp = delta > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;
  const arrowIcon = icon(isUp ? 'TrendingUp' : 'TrendingDown', { width: 12, height: 12, style: 'vertical-align:middle;flex-shrink:0' });
  const deltaClass = `delta ${isUp ? 'up' : 'down'} ${isGood ? 'good' : 'bad'}`;
  const fmt = v => Fmt.zl(v);
  return `
    <div style="padding:14px;background:var(--surface-2);border-radius:10px">
      <div class="text-mute text-sm" style="margin-bottom:6px">${label}</div>
      <div style="display:flex;align-items:baseline;gap:8px">
        <div class="num" style="font-size:20px;font-weight:500">${fmt(curr)}${unit ? `<span class="text-mute" style="font-size:12px;margin-left:2px">${unit}</span>` : ''}</div>
        <span class="${deltaClass}" style="font-size:11px;display:inline-flex;align-items:center;gap:2px">${arrowIcon} ${Math.abs(delta).toFixed(1).replace('.', ',')}%</span>
      </div>
      <div class="text-mute" style="font-size:11px;margin-top:4px">Poprzednio: <span class="num">${fmt(prev)}${unit ? ' ' + unit : ''}</span></div>
    </div>`;
}

function renderCategoriesChart(breakdown) {
  const canvas = document.getElementById('categoriesChart');
  if (!canvas) return;

  if (categoriesChartInstance) {
    categoriesChartInstance.destroy();
  }

  if (chartTooltip) {
    chartTooltip.remove();
    chartTooltip = null;
  }

  if (chartMouseMoveHandler) {
    canvas.removeEventListener('mousemove', chartMouseMoveHandler);
    chartMouseMoveHandler = null;
  }
  if (chartMouseLeaveHandler) {
    canvas.removeEventListener('mouseleave', chartMouseLeaveHandler);
    chartMouseLeaveHandler = null;
  }
  if (chartTouchHandler) {
    canvas.removeEventListener('touchstart', chartTouchHandler);
    canvas.removeEventListener('touchmove', chartTouchHandler);
    chartTouchHandler = null;
  }
  if (chartTouchEndHandler) {
    canvas.removeEventListener('touchend', chartTouchEndHandler);
    chartTouchEndHandler = null;
  }

  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const isMobile = containerWidth < 768;

  canvas.width = containerWidth;
  canvas.height = isMobile ? 750 : 550;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const SMALL_CATEGORY_THRESHOLD = 2;
  const mainCategories = breakdown.filter(item => item.percentage >= SMALL_CATEGORY_THRESHOLD);
  const smallCategories = breakdown.filter(item => item.percentage < SMALL_CATEGORY_THRESHOLD);

  let processedBreakdown = [...mainCategories];
  if (smallCategories.length > 0) {
    const otherAmount = smallCategories.reduce((sum, item) => sum + item.amount, 0);
    const otherPercentage = smallCategories.reduce((sum, item) => sum + item.percentage, 0);
    processedBreakdown.push({
      category: 'Inne',
      amount: otherAmount,
      percentage: otherPercentage,
      isOther: true,
      categories: smallCategories.map(c => c.category).join(', ')
    });
  }

  const colors = [
    '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD9BA', '#E0BBE4',
    '#FEC8D8', '#D4F4DD', '#FFF5BA', '#FFCCF9', '#C7CEEA', '#B5EAD7',
    '#FFE5D9', '#E2F0CB', '#FFDFD3', '#D9F0FF'
  ];

  const centerX = canvas.width / 2;
  const centerY = isMobile ? canvas.height * 0.3 : canvas.height / 2;
  const maxRadius = isMobile ?
    Math.min(canvas.width / 2 - 40, 150) :
    Math.min(canvas.width * 0.25, canvas.height * 0.35, 180);
  const radius = Math.max(30, maxRadius);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  let currentAngle = -Math.PI / 2;
  const sliceData = [];

  processedBreakdown.forEach((item, index) => {
    const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
    ctx.closePath();

    const midAngle = currentAngle + sliceAngle / 2;
    const gradientX = centerX + Math.cos(midAngle) * radius * 0.5;
    const gradientY = centerY + Math.sin(midAngle) * radius * 0.5;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, gradientX, gradientY, radius);
    const baseColor = colors[index % colors.length];
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustBrightness(baseColor, -15));
    ctx.fillStyle = gradient;
    ctx.fill();

    sliceData.push({
      startAngle: currentAngle,
      endAngle,
      category: item.category,
      amount: item.amount,
      percentage: item.percentage,
      color: colors[index % colors.length],
      categories: item.categories || null
    });

    currentAngle = endAngle;
  });

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const legendX = isMobile ? 20 : 50;
  const legendStartY = isMobile ? centerY + radius + 40 : 50;
  const lineHeight = isMobile ? 32 : 36;
  const fontSize = isMobile ? 13 : 14;
  const boxSize = isMobile ? 16 : 18;

  processedBreakdown.forEach((item, index) => {
    const y = legendStartY + (index * lineHeight);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const boxGradient = ctx.createLinearGradient(legendX, y, legendX + boxSize, y + boxSize);
    const baseColor = colors[index % colors.length];
    boxGradient.addColorStop(0, baseColor);
    boxGradient.addColorStop(1, adjustBrightness(baseColor, -10));
    ctx.fillStyle = boxGradient;

    const cornerRadius = 3;
    ctx.beginPath();
    ctx.moveTo(legendX + cornerRadius, y);
    ctx.lineTo(legendX + boxSize - cornerRadius, y);
    ctx.quadraticCurveTo(legendX + boxSize, y, legendX + boxSize, y + cornerRadius);
    ctx.lineTo(legendX + boxSize, y + boxSize - cornerRadius);
    ctx.quadraticCurveTo(legendX + boxSize, y + boxSize, legendX + boxSize - cornerRadius, y + boxSize);
    ctx.lineTo(legendX + cornerRadius, y + boxSize);
    ctx.quadraticCurveTo(legendX, y + boxSize, legendX, y + boxSize - cornerRadius);
    ctx.lineTo(legendX, y + cornerRadius);
    ctx.quadraticCurveTo(legendX, y, legendX + cornerRadius, y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1f2937';
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    const maxChars = isMobile ? 15 : 22;
    const displayText = item.category.length > maxChars
      ? item.category.substring(0, maxChars) + '...'
      : item.category;
    ctx.fillText(displayText, legendX + boxSize + 10, y + boxSize / 2 - 3);

    ctx.fillStyle = '#6b7280';
    ctx.font = `${fontSize - 1}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`${Fmt.int(item.amount)} zł (${item.percentage.toFixed(1).replace('.', ',')}%)`, legendX + boxSize + 10, y + boxSize / 2 + 11);
  });

  chartTooltip = document.createElement('div');
  chartTooltip.style.cssText = `
    position: fixed;
    background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98));
    color: white;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: none;
    z-index: 10000;
    display: none;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(chartTooltip);

  function buildTooltip(slice, x, y) {
    let html = `<div style="font-weight:bold;font-size:16px;margin-bottom:8px;color:${slice.color}">${slice.category}</div>`;
    if (slice.category === 'Inne' && slice.categories) {
      html += `<div style="font-size:12px;color:#ccc;margin-bottom:6px;font-style:italic">${slice.categories}</div>`;
    }
    html += `<div style="display:flex;gap:12px;margin-top:4px">
      <div><div style="font-size:11px;color:#999;text-transform:uppercase">Kwota</div><div style="font-size:15px;font-weight:bold">${Fmt.zl(slice.amount)} zł</div></div>
      <div><div style="font-size:11px;color:#999;text-transform:uppercase">Udział</div><div style="font-size:15px;font-weight:bold">${slice.percentage.toFixed(1).replace('.', ',')}%</div></div>
    </div>`;
    chartTooltip.innerHTML = html;
    chartTooltip.style.display = 'block';
    chartTooltip.style.left = `${x + 15}px`;
    chartTooltip.style.top = `${y + 15}px`;
  }

  function findSlice(mouseX, mouseY) {
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    if (Math.sqrt(dx * dx + dy * dy) > radius) return null;
    let angle = Math.atan2(dy, dx) - (-Math.PI / 2);
    if (angle < 0) angle += 2 * Math.PI;
    for (const slice of sliceData) {
      let s = slice.startAngle - (-Math.PI / 2);
      let e = slice.endAngle - (-Math.PI / 2);
      if (s < 0) s += 2 * Math.PI;
      if (e < 0) e += 2 * Math.PI;
      if (s <= e ? (angle >= s && angle <= e) : (angle >= s || angle <= e)) return slice;
    }
    return null;
  }

  chartMouseMoveHandler = (e) => {
    const rect = canvas.getBoundingClientRect();
    const slice = findSlice(e.clientX - rect.left, e.clientY - rect.top);
    if (slice) {
      buildTooltip(slice, e.clientX, e.clientY);
      canvas.style.cursor = 'pointer';
    } else {
      chartTooltip.style.display = 'none';
      canvas.style.cursor = 'default';
    }
  };

  chartMouseLeaveHandler = () => {
    chartTooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  };

  chartTouchHandler = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const slice = findSlice(touch.clientX - rect.left, touch.clientY - rect.top);
    if (slice) {
      buildTooltip(slice, touch.clientX, touch.clientY - 80);
    } else {
      chartTooltip.style.display = 'none';
    }
  };

  chartTouchEndHandler = () => { chartTooltip.style.display = 'none'; };

  canvas.addEventListener('mousemove', chartMouseMoveHandler);
  canvas.addEventListener('mouseleave', chartMouseLeaveHandler);
  canvas.addEventListener('touchstart', chartTouchHandler, { passive: false });
  canvas.addEventListener('touchmove', chartTouchHandler, { passive: false });
  canvas.addEventListener('touchend', chartTouchEndHandler);

  categoriesChartInstance = {
    destroy: () => {
      if (chartTooltip) { chartTooltip.remove(); chartTooltip = null; }
    }
  };
}

export function renderAnalytics() {
  const stats = calculatePeriodStats();
  const comparison = compareToPreviousPeriod();
  const breakdown = getCategoriesBreakdown();
  const userExpenses = getUserExpensesBreakdown();

  document.getElementById('periodExpenses').textContent = Fmt.zl(stats.totalExpenses);
  document.getElementById('periodIncomes').textContent = Fmt.zl(stats.totalIncomes);

  // Bilans
  const balance = stats.totalIncomes - stats.totalExpenses;
  const balEl = document.getElementById('periodBalance');
  if (balEl) {
    balEl.textContent = Fmt.zl(balance);
    balEl.style.color = balance > 0 ? 'var(--success)' : balance < 0 ? 'var(--danger)' : '';
  }
  const balSubEl = document.getElementById('periodBalanceSub');
  if (balSubEl) balSubEl.textContent = balance > 0 ? 'Saldo dodatnie' : balance < 0 ? 'Saldo ujemne' : 'Saldo zerowe';

  // Liczba transakcji
  const transTotal = stats.expensesCount + stats.incomesCount;
  const transEl = document.getElementById('periodTransCount');
  if (transEl) transEl.textContent = transTotal;
  const transSubEl = document.getElementById('periodTransSub');
  if (transSubEl) transSubEl.textContent = `${stats.expensesCount} wydatków · ${stats.incomesCount} przychodów`;

  // Delta w stosunku do poprzedniego okresu
  const prevExp = comparison.previousPeriod.totalExpenses;
  const prevInc = comparison.previousPeriod.totalIncomes;
  const buildDelta = (curr, prev, lowerIsBetter) => {
    if (!prev) return '';
    const pct = ((curr - prev) / prev) * 100;
    const isUp = pct > 0;
    const isGood = lowerIsBetter ? !isUp : isUp;
    const arrowIcn = icon(isUp ? 'TrendingUp' : 'TrendingDown', { width: 12, height: 12, style: 'vertical-align:middle;flex-shrink:0' });
    const cls = `delta ${isUp ? 'up' : 'down'}${isGood ? ' good' : ' bad'}`;
    return `<span class="${cls}" style="display:inline-flex;align-items:center;gap:2px">${arrowIcn} ${Math.abs(pct).toFixed(1).replace('.', ',')}%</span> vs poprzedni okres`;
  };
  const expDeltaEl = document.getElementById('periodExpensesDelta');
  if (expDeltaEl) expDeltaEl.innerHTML = buildDelta(stats.totalExpenses, prevExp, true);
  const incDeltaEl = document.getElementById('periodIncomesDelta');
  if (incDeltaEl) incDeltaEl.innerHTML = buildDelta(stats.totalIncomes, prevInc, false);

  const compEl = document.getElementById('analyticsComparison');
  if (compEl) {
    compEl.innerHTML = [
      comparisonCell('Suma wydatków', stats.totalExpenses, comparison.previousPeriod.totalExpenses, 'zł', true),
      comparisonCell('Suma przychodów', stats.totalIncomes, comparison.previousPeriod.totalIncomes, 'zł', false),
      comparisonCell('Liczba wydatków', stats.expensesCount, comparison.previousPeriod.expensesCount, '', true),
      comparisonCell('Liczba przychodów', stats.incomesCount, comparison.previousPeriod.incomesCount, '', false),
    ].join('');
  }

  const userExpDiv = document.getElementById('userExpensesBreakdown');

  const top3 = breakdown.slice(0, 3);
  const allCats = getCategories();
  const top3HTML = top3.length > 0 ? `
    <hr class="divider"/>
    <h3 style="margin-bottom:12px">Top 3 kategorii</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${top3.map((cat, i) => {
        const catObj = allCats.find(c => c.name === cat.category);
        const color = catObj?.color || CAT_COLORS[i % CAT_COLORS.length];
        const catEmoji = catObj?.icon || getCategoryIcon(cat.category);
        const bgColor = `color-mix(in srgb, ${color} 14%, var(--surface))`;
        return `
          <div style="display:flex;align-items:center;gap:10px">
            <span class="text-mute num" style="font-size:11px;width:16px;flex-shrink:0">#${i + 1}</span>
            <div style="width:28px;height:28px;border-radius:6px;background:${bgColor};color:${color};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${catEmoji}</div>
            <span style="font-size:13px;font-weight:500;flex:1;min-width:0">${escapeHTML(cat.category)}</span>
            <span class="num" style="font-weight:500;flex-shrink:0">${Fmt.zl(cat.amount)} zł</span>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  if (userExpenses.length > 0) {
    userExpDiv.innerHTML = userExpenses.map(user => `
      <div style="margin-bottom:12px">
        <div class="row" style="margin-bottom:6px">
          <div class="avatar sm" style="background:${user.color}">${escapeHTML((user.userName || '?')[0])}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${escapeHTML(user.userName)}</div>
            <div class="text-mute text-sm">${user.count || ''} transakcji</div>
          </div>
          <div class="num" style="font-weight:500;flex-shrink:0">${Fmt.zl(user.amount)} zł</div>
        </div>
        <div class="progress"><div style="width:${Math.min(user.percentage, 100)}%;height:100%;background:${user.color};border-radius:inherit;transition:width 400ms ease"></div></div>
        <div class="text-mute text-sm" style="margin-top:4px;text-align:right">${user.percentage.toFixed(1).replace('.', ',')}%</div>
      </div>
    `).join('') + top3HTML;
  } else {
    userExpDiv.innerHTML = '<div class="empty-state" style="padding:24px"><h3>Brak wydatków</h3><p class="hint">Brak danych w wybranym okresie</p></div>';
  }

  const topCatDiv = document.getElementById('mostExpensiveCategory');
  if (breakdown.length > 0) {
    const items = breakdown.slice(0, 8).map((cat, i) => ({
      label: cat.category,
      value: cat.amount,
      icon: getCategoryIcon(cat.category),
      color: CAT_COLORS[i % CAT_COLORS.length],
    }));
    const total = breakdown.reduce((s, c) => s + c.amount, 0);
    topCatDiv.innerHTML = barChartHTML(items, total);
  } else {
    topCatDiv.innerHTML = '<div class="empty-state" style="padding:24px"><h3>Brak danych</h3></div>';
  }

  const dailyChartEl = document.getElementById('analyticsDailyChart');
  if (dailyChartEl) {
    const expenses = getExpenses();
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getWarsawDateString(d);
      const value = expenses
        .filter(e => e.type === 'normal' && e.date === dateStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      days.push({ date: dateStr, value });
    }
    dailyChartEl.innerHTML = dailyChartHTML(days, { height: 200 });
  }

  const chartCanvas = document.getElementById('categoriesChart');
  if (chartCanvas && breakdown.length > 0) {
    renderCategoriesChart(breakdown);
  } else if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  }
}

export function selectPeriod(days, targetEl) {
  document.querySelectorAll('#analyticsPeriodSeg button').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  if (targetEl) targetEl.setAttribute('aria-pressed', 'true');

  if (days === 'custom') {
    document.getElementById('customPeriodInputs').style.display = 'block';
    const fromEl = document.getElementById('analyticsDateFrom');
    const toEl = document.getElementById('analyticsDateTo');
    const updateRangeInfo = () => {
      const info = document.getElementById('customRangeInfo');
      if (!info || !fromEl?.value || !toEl?.value) return;
      const d = Math.round((new Date(toEl.value) - new Date(fromEl.value)) / 86400000) + 1;
      if (d > 0) info.innerHTML = `Zakres: <strong class="num">${d}</strong> dni · porównanie z poprzedzającymi ${d} dniami`;
    };
    fromEl?.addEventListener('change', updateRangeInfo);
    toEl?.addEventListener('change', updateRangeInfo);
  } else {
    document.getElementById('customPeriodInputs').style.display = 'none';
    setAnalyticsPeriod(days);
    renderAnalytics();
  }
}

export function applyCustomPeriod() {
  const from = document.getElementById('analyticsDateFrom').value;
  const to = document.getElementById('analyticsDateTo').value;

  if (!from || !to) { showErrorMessage('Wybierz obie daty'); return; }
  if (from > to) { showErrorMessage('Data "od" nie może być późniejsza niż data "do"'); return; }

  setCustomDateRange(from, to);
  renderAnalytics();
  showSuccessMessage('Zastosowano własny przedział dat');
}

export function refreshCategoriesChart() {
  const breakdown = getCategoriesBreakdown();
  if (breakdown.length > 0) renderCategoriesChart(breakdown);
}

window.addEventListener('resize', () => {
  const activeSection = document.querySelector('.section.active');
  if (activeSection && activeSection.id === 'analyticsSection') {
    refreshCategoriesChart();
  }
});
