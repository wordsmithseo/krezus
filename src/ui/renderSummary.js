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

  console.log('💰 Planowane przychody (unikalne, od dzisiaj):', totalPlannedIncome.toFixed(2), 'zł');
  console.log('💸 Planowane wydatki (unikalne, od dzisiaj):', totalPlannedExpense.toFixed(2), 'zł');

  const futureIncomeEl = document.getElementById('futureIncome');
  const futureExpenseEl = document.getElementById('futureExpense');

  if (futureIncomeEl) futureIncomeEl.textContent = totalPlannedIncome.toFixed(2);
  if (futureExpenseEl) futureExpenseEl.textContent = totalPlannedExpense.toFixed(2);

  // Dynamika wydatków
  renderSpendingDynamics();

  // Budżety celowe
  renderPurposeBudgetsSummary();
}

/**
 * Oblicza kolor tła dla budżetu celowego na podstawie procenta pozostałych środków
 * Płynne przejście: ciemny pastelowy zielony (100%) → pomarańczowy (50%) → czerwony (0%)
 */
function getBudgetColor(percentRemaining) {
  // Kolory bazowe w RGB (ciemne pastelowe odcienie)
  const green = { r: 92, g: 184, b: 138 };       // #5cb88a
  const yellow = { r: 232, g: 157, b: 63 };      // #e89d3f
  const orange = { r: 214, g: 131, b: 31 };      // #d6831f
  const red = { r: 232, g: 92, b: 106 };         // #e85c6a

  let color1, color2, ratio;

  if (percentRemaining >= 50) {
    // Przejście od zielonego do żółtego (100% → 50%)
    color1 = green;
    color2 = yellow;
    ratio = (100 - percentRemaining) / 50;  // 0 at 100%, 1 at 50%
  } else if (percentRemaining >= 25) {
    // Przejście od żółtego do pomarańczowego (50% → 25%)
    color1 = yellow;
    color2 = orange;
    ratio = (50 - percentRemaining) / 25;   // 0 at 50%, 1 at 25%
  } else {
    // Przejście od pomarańczowego do czerwonego (25% → 0%)
    color1 = orange;
    color2 = red;
    ratio = (25 - percentRemaining) / 25;   // 0 at 25%, 1 at 0%
  }

  // Interpolacja liniowa między kolorami
  const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
  const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
  const b = Math.round(color1.b + (color2.b - color1.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

function renderPurposeBudgetsSummary() {
  const container = document.getElementById('summaryPurposeBudgets');
  if (!container) return;

  // Importuj dynamicznie funkcje z modułów
  Promise.all([
    import('../modules/purposeBudgetManager.js'),
    import('../modules/budgetCalculator.js')
  ]).then(([{ getBudgetStatistics }, { calculateAvailableFunds }]) => {
    const allBudgets = getBudgetStatistics();
    const { available } = calculateAvailableFunds();

    // Filtruj budżety - nie pokazuj "Ogólny"
    const budgets = allBudgets.filter(b => b.name !== 'Ogólny');

    if (budgets.length === 0) {
      container.innerHTML = sanitizeHTML(`
        <div class="stat-card" style="text-align: center; padding: 30px;">
          <div class="stat-label" style="font-size: 1.1rem; margin-bottom: 10px;">💰 Brak budżetów celowych</div>
          <p style="opacity: 0.8; margin-bottom: 15px;">Stwórz budżet celowy, aby lepiej planować swoje wydatki na konkretne cele.</p>
          <button class="btn btn-success" onclick="showPurposeBudgetModal()" style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold;">➕ Dodaj budżet celowy</button>
        </div>
      `);
      return;
    }

    const html = `
      <div class="stats-grid">
        ${budgets.map(budget => {
          const percentUsed = budget.percentage.toFixed(1);
          const percentRemaining = Math.max(0, 100 - budget.percentage);
          const percentOfTotal = available > 0 ? ((budget.amount / available) * 100).toFixed(1) : 0;

          // Dynamiczny kolor tła na podstawie pozostałych środków
          const bgColor = getBudgetColor(percentRemaining);
          const barColor = bgColor;  // Kolor paska taki sam jak tło
          const budgetIcon = getCategoryIcon(budget.name);

          return `
            <div class="stat-card" style="background: ${bgColor}; color: white;">
              <div class="stat-label" style="font-weight: bold; margin-bottom: 5px; color: white;">${budgetIcon} ${budget.name}</div>
              <div class="stat-value">
                <span>${budget.remaining.toFixed(2)}</span>
                <span class="stat-unit">zł pozostało</span>
              </div>
              <div style="margin-top: 10px; font-size: 0.85rem; opacity: 0.95;">
                <div style="margin-bottom: 5px;">Budżet: <strong>${budget.amount.toFixed(2)} zł</strong> <span style="opacity: 0.85;">(${percentOfTotal}% środków)</span></div>
                <div style="margin-bottom: 5px;">Wydano: <strong>${budget.spent.toFixed(2)} zł</strong></div>
                <div style="margin-bottom: 8px;">Wykorzystano: <strong>${percentUsed}%</strong> | Pozostało: <strong>${percentRemaining.toFixed(1)}%</strong></div>
                <div style="background: rgba(255, 255, 255, 0.3); border-radius: 10px; height: 10px; overflow: hidden;">
                  <div style="background: rgba(255, 255, 255, 0.9); height: 100%; width: ${Math.min(percentUsed, 100)}%; transition: width 0.3s, background 0.5s;"></div>
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

  const measuresHTML = dynamics.appliedMeasures && dynamics.appliedMeasures.length > 0 ? `
    <div class="dynamics-measures" style="margin-top: 12px; padding: 10px; background: rgba(0, 0, 0, 0.1); border-radius: 8px;">
      <strong>🛡️ Zastosowane zabezpieczenia:</strong>
      <ul style="margin: 5px 0 0 0; padding-left: 20px; opacity: 0.9;">
        ${dynamics.appliedMeasures.map(measure => `<li>${measure.description}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const html = `
    <div class="dynamics-card ${statusClass}">
      <h4 class="dynamics-title">${dynamics.title}</h4>
      <p class="dynamics-summary">${dynamics.summary}</p>
      <p style="font-size: 0.9rem; opacity: 0.9; margin-top: 8px;">📅 Okres: ${periodInfo}</p>
      ${detailsHTML}
      ${measuresHTML}
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

    // Limit z zabezpieczeniami (obliczony przez calculateCurrentLimits)
    const safeLimitDaily = limit.currentLimit || 0;

    // Limit surowy (bez zabezpieczeń) dla porównania
    const rawLimitDaily = limit.rawLimit || 0;

    // Limit planowany (z przyszłymi wpływami/wydatkami PRZED datą końcową)
    const projectedLimit = limit.daysLeft > 0
      ? (available + futureIncome - futureExpense) / limit.daysLeft
      : 0;

    const card = document.createElement('div');
    card.className = 'stat-card';

    // Nazwa wpływu na górze z ikoną
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stat-label';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.marginBottom = '5px';
    const limitIcon = getSourceIcon(limit.name || 'Planowany wpływ');
    nameDiv.textContent = `${limitIcon} ${limit.name || 'Planowany wpływ'}`;

    // Bezpieczny limit dzienny (główny)
    const safeLabelDiv = document.createElement('div');
    safeLabelDiv.className = 'stat-label';
    safeLabelDiv.style.fontSize = '0.9rem';
    safeLabelDiv.style.opacity = '0.8';
    safeLabelDiv.style.marginTop = '8px';
    safeLabelDiv.innerHTML = `🛡️ Bezpieczny limit dzienny`;

    const safeValueDiv = document.createElement('div');
    safeValueDiv.className = 'stat-value';
    safeValueDiv.style.fontSize = '1.8rem';
    safeValueDiv.style.marginBottom = '10px';
    const safeValueSpan = document.createElement('span');
    safeValueSpan.textContent = safeLimitDaily.toFixed(2);
    const safeUnitSpan = document.createElement('span');
    safeUnitSpan.className = 'stat-unit';
    safeUnitSpan.textContent = 'zł/dzień';
    safeValueDiv.appendChild(safeValueSpan);
    safeValueDiv.appendChild(safeUnitSpan);

    // Surowy limit dla porównania (mniejszą czcionką)
    const rawInfoDiv = document.createElement('div');
    rawInfoDiv.style.fontSize = '0.75rem';
    rawInfoDiv.style.opacity = '0.7';
    rawInfoDiv.style.marginBottom = '10px';
    rawInfoDiv.textContent = `(bez zabezpieczeń: ${rawLimitDaily.toFixed(2)} zł/dzień)`;

    // Limit planowany (z przyszłymi wpływami/wydatkami)
    const projectedLabelDiv = document.createElement('div');
    projectedLabelDiv.className = 'stat-label';
    projectedLabelDiv.style.fontSize = '0.85rem';
    projectedLabelDiv.style.opacity = '0.8';
    projectedLabelDiv.textContent = `📊 Limit planowany`;

    const projectedValueDiv = document.createElement('div');
    projectedValueDiv.className = 'stat-value';
    projectedValueDiv.style.fontSize = '1.2rem';
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
    card.appendChild(daysDiv);
    card.appendChild(safeLabelDiv);
    card.appendChild(safeValueDiv);
    card.appendChild(rawInfoDiv);
    card.appendChild(projectedLabelDiv);
    card.appendChild(projectedValueDiv);

    // Dodaj informacje o zastosowanych środkach zabezpieczających
    if (limit.appliedMeasures && limit.appliedMeasures.length > 0) {
      const measuresDiv = document.createElement('div');
      measuresDiv.style.marginTop = '12px';
      measuresDiv.style.padding = '10px';
      measuresDiv.style.background = 'rgba(0, 0, 0, 0.1)';
      measuresDiv.style.borderRadius = '8px';
      measuresDiv.style.fontSize = '0.8rem';

      const measuresTitle = document.createElement('div');
      measuresTitle.style.fontWeight = 'bold';
      measuresTitle.style.marginBottom = '6px';
      measuresTitle.style.opacity = '0.9';
      measuresTitle.textContent = '🛡️ Zastosowane zabezpieczenia:';
      measuresDiv.appendChild(measuresTitle);

      const measuresList = document.createElement('ul');
      measuresList.style.margin = '0';
      measuresList.style.paddingLeft = '18px';
      measuresList.style.opacity = '0.85';

      limit.appliedMeasures.forEach(measure => {
        const li = document.createElement('li');
        li.textContent = measure.description;
        li.style.marginBottom = '3px';
        measuresList.appendChild(li);
      });

      measuresDiv.appendChild(measuresList);
      card.appendChild(measuresDiv);
    }

    statsGrid.appendChild(card);
    console.log(`  ✅ Kafelek ${index + 1} dodany do DOM`);
  });

  console.log('✅ Wszystkie kafelki wyrenderowane. Dzieci w stats-grid:', statsGrid.children.length);
  console.log('🎨 renderDynamicLimits - DEBUG END');
}
