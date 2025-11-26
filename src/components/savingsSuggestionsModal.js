// src/components/savingsSuggestionsModal.js
import { getSavingsGoals } from '../modules/savingsGoalManager.js';
import { calculateSafeSavingsAmount } from '../modules/savingsGoalCalculator.js';
import { sanitizeHTML } from '../utils/sanitizer.js';

/**
 * Klucz localStorage dla odrzuconych sugestii
 */
const DISMISSED_SUGGESTIONS_KEY = 'krezus_dismissed_suggestions';

/**
 * Sprawdza czy sugestia została już odrzucona na tym urządzeniu
 */
function isSuggestionDismissed(goalId, amount) {
    try {
        const dismissed = JSON.parse(localStorage.getItem(DISMISSED_SUGGESTIONS_KEY) || '{}');
        const key = `${goalId}_${amount}`;
        return dismissed[key] === true;
    } catch (error) {
        console.error('Błąd przy odczycie odrzuconych sugestii:', error);
        return false;
    }
}

/**
 * Zapisuje informację o odrzuconej sugestii
 */
function markSuggestionAsDismissed(goalId, amount) {
    try {
        const dismissed = JSON.parse(localStorage.getItem(DISMISSED_SUGGESTIONS_KEY) || '{}');
        const key = `${goalId}_${amount}`;
        dismissed[key] = true;
        localStorage.setItem(DISMISSED_SUGGESTIONS_KEY, JSON.stringify(dismissed));
        console.log(`📝 Sugestia ${key} została oznaczona jako odrzucona`);
    } catch (error) {
        console.error('Błąd przy zapisie odrzuconej sugestii:', error);
    }
}

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
            // Sprawdź czy ta sugestia nie została już odrzucona
            if (!isSuggestionDismissed(goal.id, suggestion.amount)) {
                suggestions.push({
                    goal,
                    suggestion
                });
            } else {
                console.log(`⏭️ Pomijam sugestię dla ${goal.name} (${suggestion.amount} zł) - została już odrzucona`);
            }
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

    // Zapisz sugestie jako atrybut data dla późniejszego użycia
    modal.dataset.suggestions = JSON.stringify(suggestions.map(s => ({
        goalId: s.goal.id,
        amount: s.suggestion.amount
    })));

    modal.innerHTML = `
        <div class="modal-content notifications-modal">
            <div class="modal-header">
                <h2>💡 Mamy sugestie oszczędzania! (${suggestions.length})</h2>
                <button class="btn-close savings-btn-close" onclick="window.closeSavingsSuggestionsModal()">✕</button>
            </div>
            <div class="modal-body">
                <p class="notifications-intro">
                    Algorytm przeanalizował Twoje finanse i znalazł bezpieczne kwoty do odłożenia:
                </p>

                ${renderSuggestionsList(suggestions)}
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
 * Zamyka modal sugestii i zapisuje odrzucone sugestie
 */
window.closeSavingsSuggestionsModal = function() {
    const modal = document.querySelector('.savings-suggestions-modal.active');
    if (!modal) return;

    // Pobierz sugestie z data-atrybutu
    try {
        const suggestionsData = JSON.parse(modal.dataset.suggestions || '[]');
        // Oznacz wszystkie sugestie jako odrzucone
        suggestionsData.forEach(({ goalId, amount }) => {
            markSuggestionAsDismissed(goalId, amount);
        });
        console.log('📝 Wszystkie sugestie z modalu zostały oznaczone jako odrzucone');
    } catch (error) {
        console.error('Błąd przy zapisywaniu odrzuconych sugestii:', error);
    }

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
    // Usuń tę sugestię z listy sugestii w modalu (żeby nie została oznaczona jako odrzucona)
    const modal = document.querySelector('.savings-suggestions-modal.active');
    if (modal) {
        try {
            const suggestionsData = JSON.parse(modal.dataset.suggestions || '[]');
            const updatedSuggestions = suggestionsData.filter(s => !(s.goalId === goalId && s.amount === amount));
            modal.dataset.suggestions = JSON.stringify(updatedSuggestions);
            console.log(`✅ Usunięto zaakceptowaną sugestię ${goalId}_${amount} z listy do odrzucenia`);
        } catch (error) {
            console.error('Błąd przy aktualizacji listy sugestii:', error);
        }
    }

    // Wywołaj istniejącą funkcję akceptacji
    await window.acceptSuggestion(goalId, amount);

    // Zamknij modal (pozostałe sugestie zostaną odrzucone)
    window.closeSavingsSuggestionsModal();
};

/**
 * Odrzuca sugestię z modalu
 */
window.rejectSuggestionFromModal = async function(goalId) {
    // Oznacz tę sugestię jako odrzuconą
    const modal = document.querySelector('.savings-suggestions-modal.active');
    if (modal) {
        try {
            const suggestionsData = JSON.parse(modal.dataset.suggestions || '[]');
            const suggestion = suggestionsData.find(s => s.goalId === goalId);
            if (suggestion) {
                markSuggestionAsDismissed(suggestion.goalId, suggestion.amount);
                console.log(`📝 Sugestia ${goalId}_${suggestion.amount} została natychmiast oznaczona jako odrzucona`);
            }

            // Usuń z listy sugestii w modalu
            const updatedSuggestions = suggestionsData.filter(s => s.goalId !== goalId);
            modal.dataset.suggestions = JSON.stringify(updatedSuggestions);
        } catch (error) {
            console.error('Błąd przy odrzucaniu sugestii:', error);
        }
    }

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
