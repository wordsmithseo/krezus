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

  if (availableFundsEl) animateNumber(availableFundsEl, available);

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

  console.log('💰 Planowane przychody (unikalne, od dzisiaj):', totalPlannedIncome.toFixed(2), 'zł');
  console.log('💸 Planowane wydatki (unikalne, od dzisiaj):', totalPlannedExpense.toFixed(2), 'zł');

  const futureIncomeEl = document.getElementById('futureIncome');
  const futureExpenseEl = document.getElementById('futureExpense');

  if (futureIncomeEl) animateNumber(futureIncomeEl, totalPlannedIncome);
  if (futureExpenseEl) animateNumber(futureExpenseEl, totalPlannedExpense);

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

    // Oblicz wolne środki do alokacji
    const totalAllocated = budgets.reduce((sum, b) => sum + b.amount, 0);
    const unallocatedFunds = available - totalAllocated;

    // Komunikat o stanie alokacji budżetów
    let unallocatedMessage = '';

    if (unallocatedFunds > 0.01) {
      // Są wolne środki do zaalokowania
      unallocatedMessage = `
        <div style="background: linear-gradient(135deg, #6b7fd7 0%, #9b7ec4 100%); color: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2rem;">💡</div>
            <div style="flex: 1;">
              <div style="font-weight: bold; font-size: 1rem; margin-bottom: 4px;">Masz wolne środki do zaalokowania!</div>
              <div style="font-size: 0.9rem; opacity: 0.95;">
                Do rozplanowania w budżetach celowych: <strong style="font-size: 1.1rem;">${unallocatedFunds.toFixed(2)} zł</strong>
              </div>
            </div>
            <button onclick="showPurposeBudgetModal()" style="background: rgba(255, 255, 255, 0.2); border: 2px solid white; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.95rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
              ➕ Dodaj budżet
            </button>
          </div>
        </div>
      `;
    } else {
      // Wszystkie środki zostały zaalokowane
      unallocatedMessage = `
        <div style="background: linear-gradient(135deg, #5cb88a 0%, #4CAF50 100%); color: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2rem;">✅</div>
            <div style="flex: 1;">
              <div style="font-weight: bold; font-size: 1rem; margin-bottom: 4px;">Świetna robota!</div>
              <div style="font-size: 0.9rem; opacity: 0.95;">
                Cały budżet (<strong style="font-size: 1.1rem;">${available.toFixed(2)} zł</strong>) został z powodzeniem umieszczony w budżetach celowych.
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const html = `
      ${unallocatedMessage}
      <div class="stats-grid">
        ${budgets.map(budget => {
          const percentUsed = budget.percentage.toFixed(1);
          const percentRemaining = Math.max(0, 100 - budget.percentage);
          const percentOfTotal = available > 0 ? ((budget.amount / available) * 100).toFixed(1) : 0;

          // Dynamiczny kolor tła na podstawie pozostałych środków
          const bgColor = getBudgetColor(percentRemaining);
          const barColor = bgColor;  // Kolor paska taki sam jak tło
          const budgetIcon = getCategoryIcon(budget.name);

          // Sprawdź czy budżet jest wyczerpany lub bliski wyczerpania
          const isDepletedOrNear = budget.remaining <= 10 && budget.name !== 'Ogólny';
          const deleteButtonHtml = isDepletedOrNear ? `
            <button
              class="delete-depleted-budget-btn"
              data-budget-id="${budget.id}"
              data-budget-name="${budget.name}"
              style="
                margin-top: 10px;
                width: 100%;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.4);
                border-radius: 8px;
                color: white;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
              "
              onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
              onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'"
            >
              ${budget.remaining <= 0 ? '⚠️ Budżet wyczerpany - Usuń?' : '⚠️ Budżet prawie pusty - Usuń?'}
            </button>
          ` : '';

          return `
            <div class="stat-card budget-card" style="background: ${bgColor}; color: white; cursor: pointer;" data-budget-id="${budget.id}" onclick="openExpenseFormWithBudget('${budget.id}')">
              <div class="stat-label" style="font-weight: bold; margin-bottom: 5px; color: white;">${budgetIcon} ${budget.name}</div>
              <div class="stat-value">
                <span class="budget-remaining" data-value="${budget.remaining}">0.00</span>
                <span class="stat-unit">zł</span>
              </div>
              <div style="margin-top: 10px; font-size: 0.85rem; opacity: 0.95;">
                <div style="margin-bottom: 5px;"><strong class="budget-spent" data-value="${budget.spent}">0.00</strong> zł (<strong class="budget-amount" data-value="${budget.amount}">0.00</strong> zł)</div>
                <div style="margin-bottom: 8px;">Wykorzystano: <strong>${percentUsed}%</strong> | Pozostało: <strong>${percentRemaining.toFixed(1)}%</strong></div>
                <div style="background: rgba(255, 255, 255, 0.3); border-radius: 10px; height: 10px; overflow: hidden;">
                  <div style="background: rgba(255, 255, 255, 0.9); height: 100%; width: ${Math.min(percentUsed, 100)}%; transition: width 0.3s, background 0.5s;"></div>
                </div>
              </div>
              ${deleteButtonHtml}
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = sanitizeHTML(html);

    // Animuj liczby w budżetach celowych
    requestAnimationFrame(() => {
      container.querySelectorAll('.budget-remaining').forEach(el => {
        const value = parseFloat(el.dataset.value);
        animateNumber(el, value);
      });
      container.querySelectorAll('.budget-amount').forEach(el => {
        const value = parseFloat(el.dataset.value);
        animateNumber(el, value);
      });
      container.querySelectorAll('.budget-spent').forEach(el => {
        const value = parseFloat(el.dataset.value);
        animateNumber(el, value);
      });
    });

    // Dodaj event listenery do przycisków usuwania wyczerpanych budżetów
    container.querySelectorAll('.delete-depleted-budget-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const budgetId = e.target.dataset.budgetId;
        const budgetName = e.target.dataset.budgetName;

        const confirmed = confirm(`Czy na pewno chcesz usunąć budżet "${budgetName}"?\n\nNiewydane środki zostaną przeniesione do budżetu "Ogólny".`);

        if (confirmed) {
          try {
            const { deletePurposeBudget } = await import('../modules/purposeBudgetManager.js');
            await deletePurposeBudget(budgetId);

            // Import funkcji z app.js
            const { showSuccessMessage, renderPurposeBudgets, renderSummary, setupPurposeBudgetSelect, recordActivity } = await import('../app.js');

            showSuccessMessage('Budżet celowy usunięty');
            recordActivity();
            renderPurposeBudgets();
            renderSummary();
            setupPurposeBudgetSelect();
          } catch (error) {
            console.error('❌ Błąd usuwania budżetu:', error);
            const { showErrorMessage } = await import('../app.js');
            showErrorMessage(error.message || 'Nie udało się usunąć budżetu');
          }
        }
      });
    });
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

    // Nazwa wpływu na górze z ikoną i kwotą
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stat-label';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.marginBottom = '5px';
    const limitIcon = getSourceIcon(limit.name || 'Planowany wpływ');
    const amountText = limit.amount ? ` (${limit.amount.toFixed(2)} zł)` : '';
    nameDiv.textContent = `${limitIcon} ${limit.name || 'Planowany wpływ'}${amountText}`;

    // Sprawdź czy są aktywne progresywne limity
    const hasProgressiveLimits = limit.appliedMeasures &&
      limit.appliedMeasures.some(m => m.type === 'progressive-limit');

    // Limit dzienny (nazwa zależy od tego czy są zabezpieczenia)
    const limitLabelDiv = document.createElement('div');
    limitLabelDiv.className = 'stat-label';
    limitLabelDiv.style.fontSize = '0.9rem';
    limitLabelDiv.style.opacity = '0.8';
    limitLabelDiv.style.marginTop = '8px';
    limitLabelDiv.innerHTML = hasProgressiveLimits ? `🛡️ Bezpieczny limit dzienny` : `💰 Limit dzienny`;

    const limitValueDiv = document.createElement('div');
    limitValueDiv.className = 'stat-value';
    limitValueDiv.style.fontSize = '1.8rem';
    limitValueDiv.style.marginBottom = '10px';
    const limitValueSpan = document.createElement('span');
    limitValueSpan.textContent = '0.00';
    const limitUnitSpan = document.createElement('span');
    limitUnitSpan.className = 'stat-unit';
    limitUnitSpan.textContent = 'zł/dzień';
    limitValueDiv.appendChild(limitValueSpan);
    limitValueDiv.appendChild(limitUnitSpan);

    // Animuj wartość
    requestAnimationFrame(() => {
      animateNumber(limitValueSpan, safeLimitDaily);
    });

    // Surowy limit dla porównania (TYLKO gdy są zabezpieczenia)
    let rawInfoDiv = null;
    if (hasProgressiveLimits) {
      rawInfoDiv = document.createElement('div');
      rawInfoDiv.style.fontSize = '0.75rem';
      rawInfoDiv.style.opacity = '0.7';
      rawInfoDiv.style.marginBottom = '10px';
      rawInfoDiv.textContent = `(bez zabezpieczeń: ${rawLimitDaily.toFixed(2)} zł/dzień)`;
    }

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
    projectedValueSpan.textContent = '0.00';
    const projectedUnitSpan = document.createElement('span');
    projectedUnitSpan.className = 'stat-unit';
    projectedUnitSpan.textContent = 'zł/dzień';
    projectedValueDiv.appendChild(projectedValueSpan);
    projectedValueDiv.appendChild(projectedUnitSpan);

    // Animuj wartość planowaną
    requestAnimationFrame(() => {
      animateNumber(projectedValueSpan, projectedLimit);
    });

    const daysDiv = document.createElement('div');
    daysDiv.className = 'stat-label mt-10';
    daysDiv.textContent = `Pozostało ${limit.daysLeft} dni`;

    card.appendChild(nameDiv);
    card.appendChild(daysDiv);
    card.appendChild(limitLabelDiv);
    card.appendChild(limitValueDiv);

    // Dodaj surowy limit TYLKO gdy są zabezpieczenia
    if (rawInfoDiv) {
      card.appendChild(rawInfoDiv);
    }

    card.appendChild(projectedLabelDiv);
    card.appendChild(projectedValueDiv);

    // Dodaj informacje o zastosowanych środkach zabezpieczających TYLKO gdy są aktywne
    if (hasProgressiveLimits) {
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
