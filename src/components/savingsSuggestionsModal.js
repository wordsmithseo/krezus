// src/components/savingsSuggestionsModal.js
import { getSavingsGoals } from '../modules/savingsGoalManager.js';
import { calculateSafeSavingsAmount } from '../modules/savingsGoalCalculator.js';
import { sanitizeHTML } from '../utils/sanitizer.js';

/**
 * Sprawdza czy są jakieś sugestie oszczędzania i wyświetla modal
 */
export async function checkAndShowSavingsSuggestions() {
    console.log('💡 Sprawdzanie sugestii oszczędzania...');

    const goals = getSavingsGoals();
    const activeGoals = goals.filter(g => g.status === 'active');

    if (activeGoals.length === 0) {
        console.log('ℹ️ Brak aktywnych celów oszczędzania');
        return;
    }

    // Zbierz wszystkie sugestie
    const suggestions = [];
    for (const goal of activeGoals) {
        const suggestion = calculateSafeSavingsAmount(goal.id);
        if (suggestion.canSuggest && suggestion.amount > 0) {
            suggestions.push({
                goal,
                suggestion
            });
        }
    }

    if (suggestions.length === 0) {
        console.log('ℹ️ Brak nowych sugestii oszczędzania');
        return;
    }

    console.log(`💰 Znaleziono ${suggestions.length} sugestii oszczędzania`);
    showSavingsSuggestionsModal(suggestions);
}

/**
 * Wyświetla modal z sugestiami oszczędzania
 */
function showSavingsSuggestionsModal(suggestions) {
    // Sprawdź czy modal już nie istnieje
    const existingModal = document.querySelector('.savings-suggestions-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal savings-suggestions-modal';
    modal.innerHTML = `
        <div class="modal-content notifications-modal">
            <div class="modal-header">
                <h2>💡 Mamy sugestie oszczędzania! (${suggestions.length})</h2>
                <button class="btn-close" onclick="window.closeSavingsSuggestionsModal()">✕</button>
            </div>
            <div class="modal-body">
                <p class="notifications-intro">
                    Algorytm przeanalizował Twoje finanse i znalazł bezpieczne kwoty do odłożenia:
                </p>

                ${renderSuggestionsList(suggestions)}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.closeSavingsSuggestionsModal()">
                    Zamknij
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animacja wejścia
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

/**
 * Renderuje listę sugestii
 */
function renderSuggestionsList(suggestions) {
    let html = '<div class="suggestions-list">';

    suggestions.forEach(({ goal, suggestion }) => {
        const remaining = goal.targetAmount - goal.currentAmount;
        const progress = (goal.currentAmount / goal.targetAmount) * 100;

        html += `
            <div class="suggestion-card">
                <div class="suggestion-card-header">
                    <div class="goal-info">
                        <div class="goal-icon">${sanitizeHTML(goal.icon)}</div>
                        <div class="goal-details">
                            <h3 class="goal-name">${sanitizeHTML(goal.name)}</h3>
                            <div class="goal-progress-mini">
                                <span class="progress-text">${goal.currentAmount.toFixed(2)} zł / ${goal.targetAmount.toFixed(2)} zł</span>
                                <span class="progress-percent">(${progress.toFixed(0)}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="suggestion-card-body">
                    <div class="suggestion-amount-box">
                        <div class="suggestion-label">Sugerowana kwota:</div>
                        <div class="suggestion-amount-large">${suggestion.amount.toFixed(2)} zł</div>
                    </div>

                    <div class="suggestion-reason-box">
                        <div class="suggestion-reason-label">Dlaczego ta kwota?</div>
                        <div class="suggestion-reason-text">${sanitizeHTML(suggestion.reason)}</div>
                        ${suggestion.details.length > 0 ? `
                            <div class="suggestion-details-list">
                                ${suggestion.details.map(d => `
                                    <div class="suggestion-detail-item">• ${sanitizeHTML(d)}</div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="suggestion-card-actions">
                        <button class="btn btn-success" onclick="window.acceptSuggestionFromModal('${goal.id}', ${suggestion.amount})">
                            ✅ Zaakceptuj (${suggestion.amount.toFixed(2)} zł)
                        </button>
                        <button class="btn btn-secondary" onclick="window.rejectSuggestionFromModal('${goal.id}')">
                            ❌ Odrzuć
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

/**
 * Zamyka modal sugestii
 */
window.closeSavingsSuggestionsModal = function() {
    const modal = document.querySelector('.savings-suggestions-modal.active');
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => {
        modal.remove();
    }, 300);

    console.log('✅ Modal sugestii zamknięty');
};

/**
 * Akceptuje sugestię z modalu
 */
window.acceptSuggestionFromModal = async function(goalId, amount) {
    // Wywołaj istniejącą funkcję akceptacji
    await window.acceptSuggestion(goalId, amount);

    // Zamknij modal
    window.closeSavingsSuggestionsModal();
};

/**
 * Odrzuca sugestię z modalu
 */
window.rejectSuggestionFromModal = async function(goalId) {
    // Wywołaj istniejącą funkcję odrzucenia
    await window.rejectSuggestion(goalId);

    // Sprawdź czy są jeszcze jakieś sugestie
    setTimeout(() => {
        checkAndShowSavingsSuggestions();
    }, 500);
};

/**
 * Funkcja pomocnicza do ręcznego wywołania (dla testowania)
 */
window.showSavingsSuggestions = checkAndShowSavingsSuggestions;
