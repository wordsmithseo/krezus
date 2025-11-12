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

import { getDynamicsPeriod } from '../modules/dataManager.js';
import { formatDateLabel } from '../utils/dateHelpers.js';
import { sanitizeHTML } from '../utils/sanitizer.js';

export function renderSummary() {
  const { available } = calculateAvailableFunds();

  const todayExpenses = getTodayExpenses();
  const weekExpenses = getWeekExpenses();
  const monthExpenses = getMonthExpenses();

  const weekRange = getWeekDateRange();
  const monthName = getMonthName();
  const todayDate = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Podstawowe statystyki
  const availableFundsEl = document.getElementById('availableFunds');

  if (availableFundsEl) availableFundsEl.textContent = available.toFixed(2);

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
  const { limits: limitsData, plannedTotals, calculatedAt } = getOrCalculateLimits();

  renderDynamicLimits(limitsData, plannedTotals, available, calculatedAt);

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

  // Budżety celowe
  renderPurposeBudgetsSummary();
}

function renderPurposeBudgetsSummary() {
  const container = document.getElementById('summaryPurposeBudgets');
  if (!container) return;

  // Importuj dynamicznie funkcje z modułów
  import('../modules/purposeBudgetManager.js').then(({ getBudgetStatistics }) => {
    const allBudgets = getBudgetStatistics();

    // Filtruj budżety - nie pokazuj "Ogólny"
    const budgets = allBudgets.filter(b => b.name !== 'Ogólny');

    if (budgets.length === 0) {
      container.innerHTML = sanitizeHTML(`
        <div class="stat-card" style="text-align: center; padding: 30px;">
          <div class="stat-label" style="font-size: 1.1rem; margin-bottom: 10px;">💰 Brak budżetów celowych</div>
          <p style="opacity: 0.8; margin-bottom: 15px;">Stwórz budżet celowy, aby lepiej planować swoje wydatki na konkretne cele.</p>
          <button class="btn btn-success" onclick="showPurposeBudgetModal()">➕ Dodaj budżet celowy</button>
        </div>
      `);
      return;
    }

    const html = `
      <div class="stats-grid">
        ${budgets.map(budget => {
          const percentUsed = budget.percentage.toFixed(1);
          const barColor = budget.percentage > 90 ? '#f44336' : (budget.percentage > 75 ? '#ff9800' : '#4CAF50');

          return `
            <div class="stat-card">
              <div class="stat-label" style="font-weight: bold; margin-bottom: 5px;">${budget.name}</div>
              <div class="stat-value">
                <span>${budget.remaining.toFixed(2)}</span>
                <span class="stat-unit">zł pozostało</span>
              </div>
              <div style="margin-top: 10px; font-size: 0.85rem; opacity: 0.9;">
                <div style="margin-bottom: 5px;">Budżet: <strong>${budget.amount.toFixed(2)} zł</strong></div>
                <div style="margin-bottom: 5px;">Wydano: <strong>${budget.spent.toFixed(2)} zł</strong></div>
                <div style="margin-bottom: 8px;">Wykorzystano: <strong>${percentUsed}%</strong></div>
                <div style="background: #ddd; border-radius: 10px; height: 10px; overflow: hidden;">
                  <div style="background: ${barColor}; height: 100%; width: ${Math.min(percentUsed, 100)}%; transition: width 0.3s;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = sanitizeHTML(html);
  }).catch(error => {
    console.error('❌ Błąd ładowania budżetów celowych:', error);
    container.innerHTML = sanitizeHTML('<p class="text-muted">Błąd ładowania budżetów celowych.</p>');
  });
}

export function renderSpendingDynamics() {
  const dynamics = calculateSpendingDynamics();
  const container = document.getElementById('dynamicsInfo');

  if (!container) return;

  // Pobierz informację o wybranym okresie
  const { periods } = calculateSpendingPeriods();
  const dynamicsPeriodIndex = getDynamicsPeriod();
  const selectedPeriod = periods[dynamicsPeriodIndex] || periods[0];
  const periodInfo = selectedPeriod ? `${selectedPeriod.name} (${selectedPeriod.daysLeft} dni)` : 'Brak okresu';

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
}

/**
 * Renderuje dynamicznie wszystkie kafelki limitów dla okresów budżetowych
 */
function renderDynamicLimits(limitsData, plannedTotals, available, calculatedAt) {
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
        Dodaj przychody z typem "Zaplanowany", aby zobaczyć limity dzienne.
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

    // Limit realny (tylko obecne środki)
    const realLimit = limit.daysLeft > 0
      ? available / limit.daysLeft
      : 0;

    // Limit planowany (z przyszłymi wpływami/wydatkami PRZED datą końcową)
    const projectedLimit = limit.daysLeft > 0
      ? (available + futureIncome - futureExpense) / limit.daysLeft
      : 0;

    const card = document.createElement('div');
    card.className = 'stat-card';

    // Nazwa wpływu na górze
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stat-label';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.marginBottom = '5px';
    nameDiv.textContent = limit.name || 'Planowany wpływ';

    // Limit realny
    const realLabelDiv = document.createElement('div');
    realLabelDiv.className = 'stat-label';
    realLabelDiv.style.fontSize = '0.85rem';
    realLabelDiv.style.opacity = '0.8';
    realLabelDiv.textContent = `Limit realny (do ${formatDateLabel(limit.date)})`;

    const realValueDiv = document.createElement('div');
    realValueDiv.className = 'stat-value';
    realValueDiv.style.fontSize = '1.2rem';
    realValueDiv.style.marginBottom = '10px';
    const realValueSpan = document.createElement('span');
    realValueSpan.textContent = realLimit.toFixed(2);
    const realUnitSpan = document.createElement('span');
    realUnitSpan.className = 'stat-unit';
    realUnitSpan.textContent = 'zł/dzień';
    realValueDiv.appendChild(realValueSpan);
    realValueDiv.appendChild(realUnitSpan);

    // Limit planowany
    const projectedLabelDiv = document.createElement('div');
    projectedLabelDiv.className = 'stat-label';
    projectedLabelDiv.style.fontSize = '0.85rem';
    projectedLabelDiv.style.opacity = '0.8';
    projectedLabelDiv.textContent = `Limit planowany`;

    const projectedValueDiv = document.createElement('div');
    projectedValueDiv.className = 'stat-value';
    projectedValueDiv.style.fontSize = '1.5rem';
    const projectedValueSpan = document.createElement('span');
    projectedValueSpan.textContent = projectedLimit.toFixed(2);
    const projectedUnitSpan = document.createElement('span');
    projectedUnitSpan.className = 'stat-unit';
    projectedUnitSpan.textContent = 'zł/dzień';
    projectedValueDiv.appendChild(projectedValueSpan);
    projectedValueDiv.appendChild(projectedUnitSpan);

    const daysDiv = document.createElement('div');
    daysDiv.className = 'stat-label mt-10';
    daysDiv.textContent = `Pozostało ${limit.daysLeft} dni`;

    card.appendChild(nameDiv);
    card.appendChild(realLabelDiv);
    card.appendChild(realValueDiv);
    card.appendChild(projectedLabelDiv);
    card.appendChild(projectedValueDiv);
    card.appendChild(daysDiv);

    statsGrid.appendChild(card);
    console.log(`  ✅ Kafelek ${index + 1} dodany do DOM`);
  });

  console.log('✅ Wszystkie kafelki wyrenderowane. Dzieci w stats-grid:', statsGrid.children.length);
  console.log('🎨 renderDynamicLimits - DEBUG END');
}
