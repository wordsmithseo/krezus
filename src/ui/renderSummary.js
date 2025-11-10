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

    // Limit dzienny z obecnych środków
    const dailyLimit = limit.daysLeft > 0
      ? (available - savingGoal) / limit.daysLeft
      : 0;

    const card = document.createElement('div');
    card.className = 'stat-card';

    // Nazwa wpływu na górze
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stat-label';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.marginBottom = '10px';
    nameDiv.style.fontSize = '1rem';
    nameDiv.textContent = limit.name || 'Planowany wpływ';

    // Limit dzienny - duży, wyraźny
    const limitLabelDiv = document.createElement('div');
    limitLabelDiv.className = 'stat-label';
    limitLabelDiv.style.fontSize = '0.85rem';
    limitLabelDiv.style.opacity = '0.8';
    limitLabelDiv.textContent = `Limit dzienny (do ${formatDateLabel(limit.date)})`;

    const limitValueDiv = document.createElement('div');
    limitValueDiv.className = 'stat-value';
    limitValueDiv.style.fontSize = '1.8rem';
    limitValueDiv.style.marginBottom = '15px';
    limitValueDiv.style.color = '#3b82f6';
    const limitValueSpan = document.createElement('span');
    limitValueSpan.textContent = dailyLimit.toFixed(2);
    const limitUnitSpan = document.createElement('span');
    limitUnitSpan.className = 'stat-unit';
    limitUnitSpan.textContent = 'zł/dzień';
    limitValueDiv.appendChild(limitValueSpan);
    limitValueDiv.appendChild(limitUnitSpan);

    // Informacja o przyszłym wpływie
    const incomeInfoDiv = document.createElement('div');
    incomeInfoDiv.style.fontSize = '0.85rem';
    incomeInfoDiv.style.padding = '10px';
    incomeInfoDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    incomeInfoDiv.style.borderRadius = '6px';
    incomeInfoDiv.style.marginBottom = '10px';
    incomeInfoDiv.style.color = '#059669';
    incomeInfoDiv.innerHTML = `📥 <strong>+${futureIncome.toFixed(2)} zł</strong> za ${limit.daysLeft} dni`;

    if (futureExpense > 0) {
      const expenseSpan = document.createElement('div');
      expenseSpan.style.color = '#dc2626';
      expenseSpan.style.marginTop = '4px';
      expenseSpan.innerHTML = `📤 <strong>-${futureExpense.toFixed(2)} zł</strong> planowanych wydatków`;
      incomeInfoDiv.appendChild(expenseSpan);
    }

    const daysDiv = document.createElement('div');
    daysDiv.className = 'stat-label';
    daysDiv.style.fontSize = '0.85rem';
    daysDiv.style.opacity = '0.7';
    daysDiv.textContent = `Pozostało ${limit.daysLeft} dni`;

    card.appendChild(nameDiv);
    card.appendChild(limitLabelDiv);
    card.appendChild(limitValueDiv);
    card.appendChild(incomeInfoDiv);
    card.appendChild(daysDiv);

    statsGrid.appendChild(card);
    console.log(`  ✅ Kafelek ${index + 1} dodany do DOM`);
  });

  console.log('✅ Wszystkie kafelki wyrenderowane. Dzieci w stats-grid:', statsGrid.children.length);
  console.log('🎨 renderDynamicLimits - DEBUG END');
}
