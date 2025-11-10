// src/ui/renderSummary.js
import {
  calculateAvailableFunds,
  calculateSpendingPeriods,
  calculateCurrentLimits,
  calculatePlannedTransactionsTotals,
  getTodayExpenses,
  getWeekExpenses,
  getMonthExpenses,
  getWeekDateRange,
  getMonthName,
  calculateSpendingDynamics
} from '../modules/budgetCalculator.js';

import { formatDateLabel } from '../utils/dateHelpers.js';
import { sanitizeHTML } from '../utils/sanitizer.js';

export function renderSummary() {
  const { available, savingGoal } = calculateAvailableFunds();

  const todayExpenses = getTodayExpenses();
  const weekExpenses = getWeekExpenses();
  const monthExpenses = getMonthExpenses();

  const weekRange = getWeekDateRange();
  const monthName = getMonthName();
  const todayDate = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Podstawowe statystyki
  const availableFundsEl = document.getElementById('availableFunds');
  const savingGoalEl = document.getElementById('savingGoal');

  if (availableFundsEl) availableFundsEl.textContent = available.toFixed(2);
  if (savingGoalEl) savingGoalEl.textContent = savingGoal.toFixed(2);

  // Wydatki dzisiaj
  const todayLabel = document.querySelector('#todayExpenses')?.closest('.stat-card')?.querySelector('.stat-label');
  if (todayLabel) {
    todayLabel.innerHTML = sanitizeHTML(`Wydano dziś<br><small style="font-size: 0.75rem; opacity: 0.8;">(${todayDate})</small>`);
  }
  const todayExpensesEl = document.getElementById('todayExpenses');
  if (todayExpensesEl) todayExpensesEl.textContent = todayExpenses.toFixed(2);

  // Wydatki w tym tygodniu
  const weekLabel = document.querySelector('#weekExpenses')?.closest('.stat-card')?.querySelector('.stat-label');
  if (weekLabel) {
    weekLabel.innerHTML = sanitizeHTML(`Wydano w tym tygodniu<br><small style="font-size: 0.75rem; opacity: 0.8;">(${weekRange.start} - ${weekRange.end})</small>`);
  }
  const weekExpensesEl = document.getElementById('weekExpenses');
  if (weekExpensesEl) weekExpensesEl.textContent = weekExpenses.toFixed(2);

  // Wydatki w tym miesiącu
  const monthLabel = document.querySelector('#monthExpenses')?.closest('.stat-card')?.querySelector('.stat-label');
  if (monthLabel) {
    monthLabel.innerHTML = sanitizeHTML(`Wydano w tym miesiącu<br><small style="font-size: 0.75rem; opacity: 0.8;">(${monthName})</small>`);
  }
  const monthExpensesEl = document.getElementById('monthExpenses');
  if (monthExpensesEl) monthExpensesEl.textContent = monthExpenses.toFixed(2);

  // NOWE: Renderuj wszystkie okresy dynamicznie
  const limitsData = calculateCurrentLimits();
  const plannedTotals = calculatePlannedTransactionsTotals();

  renderDynamicLimits(limitsData, plannedTotals, available, savingGoal);

  // Planowane transakcje - używamy ostatniego okresu (najdalszego)
  const lastPeriod = plannedTotals.periodTotals[plannedTotals.periodTotals.length - 1];
  const displayIncome = lastPeriod?.futureIncome || 0;
  const displayExpense = lastPeriod?.futureExpense || 0;

  const futureIncomeEl = document.getElementById('futureIncome');
  const futureExpenseEl = document.getElementById('futureExpense');

  if (futureIncomeEl) futureIncomeEl.textContent = displayIncome.toFixed(2);
  if (futureExpenseEl) futureExpenseEl.textContent = displayExpense.toFixed(2);

  // Dynamika wydatków
  renderSpendingDynamics();
}

export function renderSpendingDynamics() {
  const dynamics = calculateSpendingDynamics();
  const container = document.getElementById('dynamicsInfo');

  if (!container) return;

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
      ${detailsHTML}
      <div class="dynamics-recommendation">
        <strong>💡 Rekomendacja:</strong>
        <p>${dynamics.recommendation}</p>
      </div>
    </div>
  `;

  container.innerHTML = sanitizeHTML(html);
}

/**
 * Renderuje dynamicznie wszystkie kafelki limitów dla okresów budżetowych
 */
function renderDynamicLimits(limitsData, plannedTotals, available, savingGoal) {
  const { limits } = limitsData;

  console.log('🎨 renderDynamicLimits - DEBUG START');
  console.log('📊 Liczba limitów do wyrenderowania:', limits.length);
  console.log('📊 Limity:', limits);

  // Znajdź kontener na kafelki limitów - szukamy h3 z tekstem "📊 Limity dzienne"
  const allH3 = Array.from(document.querySelectorAll('h3'));
  const limitsContainer = allH3.find(h3 => h3.textContent.includes('Limity dzienne'));

  if (!limitsContainer) {
    console.error('❌ Nie znaleziono kontenera limitów!');
    return;
  }

  const statsGrid = limitsContainer.nextElementSibling;
  if (!statsGrid || !statsGrid.classList.contains('stats-grid')) {
    console.error('❌ Nie znaleziono stats-grid!');
    return;
  }

  console.log('✅ Znaleziono kontener, czyszczenie...');
  // Wyczyść istniejące kafelki
  statsGrid.innerHTML = '';

  // Jeśli brak okresów, pokaż komunikat
  if (limits.length === 0) {
    console.log('⚠️ Brak okresów - pokazuję komunikat');
    const noPeriodsCard = document.createElement('div');
    noPeriodsCard.className = 'stat-card';
    noPeriodsCard.innerHTML = sanitizeHTML(`
      <div class="stat-label">Brak planowanych przychodów</div>
      <p style="margin-top: 10px; opacity: 0.8; font-size: 0.9rem;">
        Dodaj przychody z typem "Zaplanowany", aby zobaczyć automatyczne okresy budżetowe.
      </p>
    `);
    statsGrid.appendChild(noPeriodsCard);
    return;
  }

  console.log('🔄 Renderowanie', limits.length, 'kafelków...');
  // Renderuj kafelek dla każdego okresu
  limits.forEach((limit, index) => {
    console.log(`  📌 Kafelek ${index + 1}/${limits.length}: data=${limit.date}, dni=${limit.daysLeft}, limit=${limit.currentLimit.toFixed(2)}`);

    const periodTotal = plannedTotals.periodTotals[index];
    const futureIncome = periodTotal?.futureIncome || 0;
    const futureExpense = periodTotal?.futureExpense || 0;

    // Oblicz limit z planowanymi wpływami (realny limit na ten okres)
    const projectedLimit = limit.daysLeft > 0
      ? (available - savingGoal + futureIncome - futureExpense) / limit.daysLeft
      : 0;

    const card = document.createElement('div');
    card.className = 'stat-card';

    // Nazwa wpływu na górze
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stat-label';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.marginBottom = '5px';
    nameDiv.textContent = limit.name || 'Planowany wpływ';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'stat-label';
    labelDiv.style.fontSize = '0.85rem';
    labelDiv.style.opacity = '0.8';
    labelDiv.textContent = `Limit dzienny (do ${formatDateLabel(limit.date)})`;

    const valueDiv = document.createElement('div');
    valueDiv.className = 'stat-value';
    const valueSpan = document.createElement('span');
    // Pokaż limit z planowanymi wpływami jako główny
    valueSpan.textContent = projectedLimit.toFixed(2);
    const unitSpan = document.createElement('span');
    unitSpan.className = 'stat-unit';
    unitSpan.textContent = 'zł/dzień';
    valueDiv.appendChild(valueSpan);
    valueDiv.appendChild(unitSpan);

    const daysDiv = document.createElement('div');
    daysDiv.className = 'stat-label mt-10';
    daysDiv.textContent = `Pozostało ${limit.daysLeft} dni`;

    card.appendChild(nameDiv);
    card.appendChild(labelDiv);
    card.appendChild(valueDiv);
    card.appendChild(daysDiv);

    // Pokaż szczegóły obliczeń
    if (futureIncome > 0 || futureExpense > 0) {
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'prognosis-text';
      detailsDiv.style.fontSize = '0.75rem';
      detailsDiv.style.marginTop = '6px';
      detailsDiv.style.opacity = '0.7';

      const parts = [];
      parts.push(`Obecne: ${available.toFixed(2)} zł`);
      if (futureIncome > 0) {
        parts.push(`Wpływy: +${futureIncome.toFixed(2)} zł`);
      }
      if (futureExpense > 0) {
        parts.push(`Wydatki: -${futureExpense.toFixed(2)} zł`);
      }

      detailsDiv.textContent = parts.join(' • ');
      card.appendChild(detailsDiv);
    }

    statsGrid.appendChild(card);
    console.log(`  ✅ Kafelek ${index + 1} dodany do DOM`);
  });

  console.log('✅ Wszystkie kafelki wyrenderowane. Dzieci w stats-grid:', statsGrid.children.length);
  console.log('🎨 renderDynamicLimits - DEBUG END');
}
