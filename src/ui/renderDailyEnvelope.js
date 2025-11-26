// src/ui/renderDailyEnvelope.js
import { getDailyEnvelope } from '../modules/dataManager.js';
import {
  calculateSpendingGauge,
  getGlobalMedian30d,
  getEnvelopeCalculationInfo
} from '../modules/budgetCalculator.js';

import { sanitizeHTML } from '../utils/sanitizer.js';

export function renderDailyEnvelope() {
  const envelope = getDailyEnvelope();
  const { spent, total, percentage, remaining } = calculateSpendingGauge();
  const median = getGlobalMedian30d();
  const calcInfo = getEnvelopeCalculationInfo();

  const envelopeAmountEl = document.getElementById('envelopeAmount');
  const envelopeSpentEl = document.getElementById('envelopeSpent');
  const envelopeRemainingEl = document.getElementById('envelopeRemaining');
  const envelopeMedianEl = document.getElementById('envelopeMedian');
  const spendingGaugeEl = document.getElementById('spendingGauge');
  const envelopePeriodInfoEl = document.getElementById('envelopePeriodInfo');

  if (!envelope) {
    if (envelopeAmountEl) envelopeAmountEl.textContent = '0.00';
    if (envelopeSpentEl) envelopeSpentEl.textContent = '0.00';
    if (envelopeRemainingEl) envelopeRemainingEl.textContent = '0.00';
    if (envelopeMedianEl) envelopeMedianEl.textContent = '0.00';
    if (spendingGaugeEl) spendingGaugeEl.style.width = '0%';

    if (envelopePeriodInfoEl) {
      envelopePeriodInfoEl.innerHTML = '';
    }

    const calcInfoDiv = document.getElementById('envelopeCalculationInfo');
    if (calcInfoDiv) {
      if (calcInfo) {
        calcInfoDiv.innerHTML = sanitizeHTML(`<small style="color: white; opacity: 0.95;">${calcInfo.description}</small>`);
      } else {
        calcInfoDiv.innerHTML = '<small style="color: white; opacity: 0.95;">Brak danych do wyliczenia koperty</small>';
      }
    }

    const overLimitDiv = document.getElementById('envelopeOverLimit');
    if (overLimitDiv) {
      overLimitDiv.style.display = 'none';
    }

    return;
  }

  if (envelopeAmountEl) envelopeAmountEl.textContent = total.toFixed(2);
  if (envelopeSpentEl) envelopeSpentEl.textContent = spent.toFixed(2);
  if (envelopeRemainingEl) envelopeRemainingEl.textContent = remaining.toFixed(2);
  if (envelopeMedianEl) envelopeMedianEl.textContent = median.toFixed(2);

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
      // ZMIANA: Pokazuj czas (godziny/minuty) gdy zostało mniej niż 1 dzień
      const timeText = envelope.period.timeFormatted || `${envelope.period.daysLeft} dni`;
      const periodText = `📅 Okres: ${envelope.period.name} (${timeText}) | 🕐 Wyliczono: ${formattedDate}`;
      envelopePeriodInfoEl.innerHTML = sanitizeHTML(periodText);
    } else if (envelope.period) {
      // ZMIANA: Pokazuj czas (godziny/minuty) gdy zostało mniej niż 1 dzień
      const timeText = envelope.period.timeFormatted || `${envelope.period.daysLeft} dni`;
      const periodText = `📅 Okres: ${envelope.period.name} (${timeText})`;
      envelopePeriodInfoEl.innerHTML = sanitizeHTML(periodText);
    } else {
      envelopePeriodInfoEl.innerHTML = '';
    }
  }

  if (spendingGaugeEl) {
    spendingGaugeEl.style.width = `${percentage}%`;

    if (percentage < 50) {
      spendingGaugeEl.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    } else if (percentage < 80) {
      spendingGaugeEl.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    } else {
      spendingGaugeEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
  }

  const calcInfoDiv = document.getElementById('envelopeCalculationInfo');
  if (calcInfoDiv && calcInfo) {
    const html = `
      <small style="color: white; font-size: 0.85rem; line-height: 1.4; opacity: 0.95;">
        ${calcInfo.description}<br>
        <strong>Składowe:</strong> ${calcInfo.formula}
      </small>
    `;
    calcInfoDiv.innerHTML = sanitizeHTML(html);
  }

  const overLimitDiv = document.getElementById('envelopeOverLimit');
  if (overLimitDiv) {
    if (spent > total) {
      const overAmount = (spent - total).toFixed(2);
      const html = `
        <div style="color: #fee; font-weight: 600; margin-top: 10px;">
          ⚠️ Przekroczono kopertę o ${overAmount} zł
        </div>
      `;
      overLimitDiv.innerHTML = sanitizeHTML(html);
      overLimitDiv.style.display = 'block';
    } else {
      overLimitDiv.style.display = 'none';
    }
  }
}
