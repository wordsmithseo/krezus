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
  calculateSpendingDynamics
} from '../modules/budgetCalculator.js';

import { getDynamicsPeriod, getIncomes, getExpenses } from '../modules/dataManager.js';
import { formatDateLabel, getWarsawDateString } from '../utils/dateHelpers.js';
import { sanitizeHTML } from '../utils/sanitizer.js';
import { getCategoryIcon, getSourceIcon } from '../utils/iconMapper.js';
import { animateNumber } from '../utils/animateNumber.js';
import { startCountdownTimers } from '../utils/countdownTimer.js';

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

  if (availableFundsEl) animateNumber(availableFundsEl, available);

  // Pokaż informację o oszczędnościach jeśli są zdefiniowane
  const savingsInfoEl = document.getElementById('savingsInfo');
  if (savingsInfoEl) {
    if (savingsAmount > 0) {
      savingsInfoEl.innerHTML = sanitizeHTML(`<small style="font-size: 0.8rem; opacity: 0.8;">Z czego ${savingsAmount.toFixed(2)} zł odlozono jako oszczednosci</small>`);
      savingsInfoEl.style.display = 'block';
    } else {
      savingsInfoEl.style.display = 'none';
    }
  }

  // Wydatki dzisiaj
  const todayLabel = document.querySelector('#todayExpenses')?.closest('.stat-card')?.querySelector('.stat-label');
  if (todayLabel) {
    todayLabel.innerHTML = sanitizeHTML(`Wydano dziś<br><small style="font-size: 0.75rem; opacity: 0.8;">(${todayDate})</small>`);
  }
  const todayExpensesEl = document.getElementById('todayExpenses');
  if (todayExpensesEl) animateNumber(todayExpensesEl, todayExpenses);

  // Wydatki w tym tygodniu
  const weekLabel = document.querySelector('#weekExpenses')?.closest('.stat-card')?.querySelector('.stat-label');
  if (weekLabel) {
    weekLabel.innerHTML = sanitizeHTML(`Wydano w tym tygodniu<br><small style="font-size: 0.75rem; opacity: 0.8;">(${weekRange.start} - ${weekRange.end})</small>`);
  }
  const weekExpensesEl = document.getElementById('weekExpenses');
  if (weekExpensesEl) animateNumber(weekExpensesEl, weekExpenses);

  // Wydatki w tym miesiącu
  const monthLabel = document.querySelector('#monthExpenses')?.closest('.stat-card')?.querySelector('.stat-label');
  if (monthLabel) {
    monthLabel.innerHTML = sanitizeHTML(`Wydano w tym miesiącu<br><small style="font-size: 0.75rem; opacity: 0.8;">(${monthName})</small>`);
  }
  const monthExpensesEl = document.getElementById('monthExpenses');
  if (monthExpensesEl) animateNumber(monthExpensesEl, monthExpenses);

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

  if (futureIncomeEl) animateNumber(futureIncomeEl, totalPlannedIncome);
  if (futureExpenseEl) animateNumber(futureExpenseEl, totalPlannedExpense);

  // Dynamika wydatków
  renderSpendingDynamics();
}

export function renderSpendingDynamics() {
  const dynamics = calculateSpendingDynamics();
  const container = document.getElementById('dynamicsInfo');

  if (!container) return;

  // Pobierz informację o wybranym okresie
  const { periods } = calculateSpendingPeriods();
  const dynamicsPeriodIndex = getDynamicsPeriod();
  const selectedPeriod = periods[dynamicsPeriodIndex] || periods[0];

  // ZMIANA: Pokazuj "Dziś", countdown timer (HH:MM:SS) lub liczbę dni
  let periodInfo;
  if (selectedPeriod) {
    if (selectedPeriod.showToday) {
      // Gdy wpływ jest dziś i nie podano czasu
      periodInfo = `${selectedPeriod.name} (Dziś)`;
    } else if (selectedPeriod.countdownFormat) {
      // Gdy zostało < 1 dzień i podano czas
      periodInfo = `${selectedPeriod.name} (<span class="countdown-timer" data-end-date="${selectedPeriod.date}" data-end-time="${selectedPeriod.time || ''}">${selectedPeriod.countdownFormat}</span>)`;
    } else {
      // Gdy >= 1 dzień
      periodInfo = `${selectedPeriod.name} (${selectedPeriod.timeFormatted || `${selectedPeriod.daysLeft} dni`})`;
    }
  } else {
    periodInfo = 'Brak okresu';
  }

  let statusClass = '';
  switch(dynamics.status) {
    case 'excellent':
      statusClass = 'dynamics-excellent';
      break;
    case 'good':
      statusClass = 'dynamics-good';
      break;
    case 'moderate':
      statusClass = 'dynamics-moderate';
      break;
    case 'warning':
      statusClass = 'dynamics-warning';
      break;
    case 'critical':
      statusClass = 'dynamics-critical';
      break;
    case 'no-date':
      statusClass = 'dynamics-no-date';
      break;
  }

  const detailsHTML = dynamics.details.length > 0 ? `
    <div class="dynamics-details">
      <strong>📊 Szczegóły:</strong>
      <ul>
        ${dynamics.details.map(detail => `<li>${detail}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const html = `
    <div class="dynamics-card ${statusClass}">
      <h4 class="dynamics-title">${dynamics.title}</h4>
      <p class="dynamics-summary">${dynamics.summary}</p>
      <p style="font-size: 0.9rem; opacity: 0.9; margin-top: 8px;">📅 Okres: ${periodInfo}</p>
      ${detailsHTML}
      <div class="dynamics-recommendation">
        <strong>💡 Rekomendacja:</strong>
        <p>${dynamics.recommendation}</p>
      </div>
    </div>
  `;

  container.innerHTML = sanitizeHTML(html);

  // Uruchom countdown timery po wyrenderowaniu
  startCountdownTimers();
}

/**
 * Renderuje dynamicznie wszystkie kafelki limitów dla okresów budżetowych
 */
function renderDynamicLimits(limitsData, plannedTotals, available, calculatedAt) {
  const { limits } = limitsData;

  // Znajdź kontener na kafelki limitów - szukamy h3 z tekstem "📊 Limity dzienne"
  const allH3 = Array.from(document.querySelectorAll('h3'));
  const limitsContainer = allH3.find(h3 => h3.textContent.includes('Limity dzienne'));

  if (!limitsContainer) {
    console.error('Nie znaleziono kontenera limitów!');
    return;
  }

  // Dodaj info o dacie wyliczenia pod nagłówkiem
  let dateInfo = limitsContainer.nextElementSibling;
  if (!dateInfo || !dateInfo.classList.contains('limits-date-info')) {
    dateInfo = document.createElement('div');
    dateInfo.className = 'limits-date-info';
    dateInfo.style.fontSize = '0.8rem';
    dateInfo.style.opacity = '0.7';
    dateInfo.style.marginBottom = '10px';
    dateInfo.style.marginTop = '-10px';
    limitsContainer.insertAdjacentElement('afterend', dateInfo);
  }

  // Formatuj datę wyliczenia
  const calcDate = new Date(calculatedAt);
  const formattedDate = calcDate.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  dateInfo.textContent = `Wyliczono: ${formattedDate}`;

  const statsGrid = dateInfo.nextElementSibling;
  if (!statsGrid || !statsGrid.classList.contains('stats-grid')) {
    console.error('Nie znaleziono stats-grid!');
    return;
  }

  // Wyczyść istniejące kafelki
  statsGrid.innerHTML = '';

  // Jeśli brak okresów, pokaż komunikat
  if (limits.length === 0) {
    const noPeriodsCard = document.createElement('div');
    noPeriodsCard.className = 'stat-card';
    noPeriodsCard.innerHTML = sanitizeHTML(`
      <div class="stat-label">Brak planowanych przychodów</div>
      <p style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">
        Dodaj przychody z typem "Zaplanowany", aby zobaczyć limity dzienne.
      </p>
    `);
    statsGrid.appendChild(noPeriodsCard);
    return;
  }

  // Renderuj kafelek dla każdego okresu
  limits.forEach((limit, index) => {
    const realLimit = limit.realLimit || 0;
    const plannedLimit = limit.plannedLimit || 0;

    const card = document.createElement('div');
    card.className = 'stat-card';

    // Nazwa wpływu na górze z ikoną i kwotą
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stat-label';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.marginBottom = '5px';
    const limitIcon = getSourceIcon(limit.name || 'Planowany wpływ');
    const amountText = limit.amount ? ` (${limit.amount.toFixed(2)} zł)` : '';
    nameDiv.textContent = `${limitIcon} ${limit.name || 'Planowany wpływ'}${amountText}`;

    const daysDiv = document.createElement('div');
    daysDiv.className = 'stat-label mt-10';

    // ZMIANA: Pokazuj "Dziś", countdown timer (HH:MM:SS) lub liczbę dni
    if (limit.showToday) {
      // Gdy wpływ jest dziś i nie podano czasu, pokaż "Dziś"
      daysDiv.textContent = `Pozostało: Dziś`;
    } else if (limit.countdownFormat) {
      // Gdy zostało < 1 dzień i podano czas, używamy countdown timera
      daysDiv.innerHTML = `Pozostało: <span class="countdown-timer" data-end-date="${limit.date}" data-end-time="${limit.time || ''}">${limit.countdownFormat}</span>`;
    } else {
      // Gdy >= 1 dzień, pokazuj liczbę dni
      daysDiv.textContent = `Pozostało: ${limit.timeFormatted || `${limit.daysLeft} dni`}`;
    }

    // Limit realny
    const realLabelDiv = document.createElement('div');
    realLabelDiv.className = 'stat-label';
    realLabelDiv.style.fontSize = '0.9rem';
    realLabelDiv.style.opacity = '0.8';
    realLabelDiv.style.marginTop = '12px';
    realLabelDiv.textContent = `💰 Limit realny`;

    const realValueDiv = document.createElement('div');
    realValueDiv.className = 'stat-value';
    realValueDiv.style.fontSize = '1.8rem';
    realValueDiv.style.marginBottom = '5px';
    const realValueSpan = document.createElement('span');
    realValueSpan.textContent = '0.00';
    const realUnitSpan = document.createElement('span');
    realUnitSpan.className = 'stat-unit';
    realUnitSpan.textContent = 'zł/dzień';
    realValueDiv.appendChild(realValueSpan);
    realValueDiv.appendChild(realUnitSpan);

    // Animuj wartość realną
    requestAnimationFrame(() => {
      animateNumber(realValueSpan, realLimit);
    });

    // Limit planowany
    const plannedLabelDiv = document.createElement('div');
    plannedLabelDiv.className = 'stat-label';
    plannedLabelDiv.style.fontSize = '0.9rem';
    plannedLabelDiv.style.opacity = '0.8';
    plannedLabelDiv.style.marginTop = '12px';
    plannedLabelDiv.textContent = `📊 Limit planowany`;

    const plannedValueDiv = document.createElement('div');
    plannedValueDiv.className = 'stat-value';
    plannedValueDiv.style.fontSize = '1.8rem';
    const plannedValueSpan = document.createElement('span');
    plannedValueSpan.textContent = '0.00';
    const plannedUnitSpan = document.createElement('span');
    plannedUnitSpan.className = 'stat-unit';
    plannedUnitSpan.textContent = 'zł/dzień';
    plannedValueDiv.appendChild(plannedValueSpan);
    plannedValueDiv.appendChild(plannedUnitSpan);

    // Animuj wartość planowaną
    requestAnimationFrame(() => {
      animateNumber(plannedValueSpan, plannedLimit);
    });

    card.appendChild(nameDiv);
    card.appendChild(daysDiv);
    card.appendChild(realLabelDiv);
    card.appendChild(realValueDiv);
    card.appendChild(plannedLabelDiv);
    card.appendChild(plannedValueDiv);

    statsGrid.appendChild(card);
  });

  // Uruchom countdown timery po wyrenderowaniu kafli
  startCountdownTimers();
}
