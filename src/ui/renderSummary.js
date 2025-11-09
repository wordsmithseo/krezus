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
  const { daysLeft1, daysLeft2, date1, date2 } = calculateSpendingPeriods();
  const { currentLimit1, currentLimit2 } = calculateCurrentLimits();
  const { futureIncome1, futureExpense1, futureIncome2, futureExpense2 } = calculatePlannedTransactionsTotals();

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

  // Limity
  const currentLimit1El = document.getElementById('currentLimit1');
  const currentDaysLeft1El = document.getElementById('currentDaysLeft1');
  const currentLimitDate1El = document.getElementById('currentLimitDate1');

  if (currentLimit1El) currentLimit1El.textContent = currentLimit1.toFixed(2);
  if (currentDaysLeft1El) currentDaysLeft1El.textContent = daysLeft1;
  if (currentLimitDate1El) currentLimitDate1El.textContent = date1 ? formatDateLabel(date1) : '-';

  // Prognoza dla pierwszego limitu
  const projectedLimit1 = daysLeft1 > 0 ? (available - savingGoal + futureIncome1 - futureExpense1) / daysLeft1 : 0;
  const prognosis1El = document.getElementById('prognosis1');
  if (prognosis1El) {
    if (futureIncome1 > 0 || futureExpense1 > 0) {
      prognosis1El.textContent = `z planowanymi: ${projectedLimit1.toFixed(2)} zł/dzień`;
      prognosis1El.style.display = 'block';
    } else {
      prognosis1El.style.display = 'none';
    }
  }

  // Drugi limit (opcjonalny)
  const currentLimit2Section = document.getElementById('currentLimit2Section');
  if (date2 && date2.trim() !== '') {
    if (currentLimit2Section) currentLimit2Section.style.display = 'block';

    const currentLimit2El = document.getElementById('currentLimit2');
    const currentDaysLeft2El = document.getElementById('currentDaysLeft2');
    const currentLimitDate2El = document.getElementById('currentLimitDate2');

    if (currentLimit2El) currentLimit2El.textContent = currentLimit2.toFixed(2);
    if (currentDaysLeft2El) currentDaysLeft2El.textContent = daysLeft2;
    if (currentLimitDate2El) currentLimitDate2El.textContent = formatDateLabel(date2);

    const projectedLimit2 = daysLeft2 > 0 ? (available - savingGoal + futureIncome2 - futureExpense2) / daysLeft2 : 0;
    const prognosis2El = document.getElementById('prognosis2');
    if (prognosis2El) {
      if (futureIncome2 > 0 || futureExpense2 > 0) {
        prognosis2El.textContent = `z planowanymi: ${projectedLimit2.toFixed(2)} zł/dzień`;
        prognosis2El.style.display = 'block';
      } else {
        prognosis2El.style.display = 'none';
      }
    }
  } else {
    if (currentLimit2Section) currentLimit2Section.style.display = 'none';
  }

  // Planowane transakcje
  const displayIncome = (date2 && date2.trim() !== '') ? futureIncome2 : futureIncome1;
  const displayExpense = (date2 && date2.trim() !== '') ? futureExpense2 : futureExpense1;

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
