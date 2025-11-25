// src/ui/renderSavingsGoals.js
import { sanitizeHTML } from '../utils/sanitizer.js';
import { getSavingsGoals, getSavingsGoalsStats } from '../modules/savingsGoalManager.js';
import { calculateAllSuggestions, calculateGoalProgress, calculateSavingsStats } from '../modules/savingsGoalCalculator.js';

/**
 * Renderuje sekcję oszczędzania
 */
export function renderSavingsGoals() {
    console.log('🎯 Renderowanie sekcji oszczędzania');

    const contentDiv = document.getElementById('savingsGoalsContent');
    if (!contentDiv) {
        console.error('❌ Nie znaleziono elementu #savingsGoalsContent');
        return;
    }

    // Pobierz dane
    const goals = getSavingsGoals();
    const stats = calculateSavingsStats();
    const suggestions = calculateAllSuggestions();

    console.log('📊 Liczba celów:', goals.length);
    console.log('💡 Liczba sugestii:', suggestions.length);

    // Generuj HTML
    let html = `
        <div class="savings-goals-section">
            <div class="section-header">
                <h2>🎯 Oszczędzanie</h2>
                <button class="btn-primary" onclick="window.showAddSavingsGoalModal()">
                    ➕ Dodaj cel oszczędzania
                </button>
            </div>

            ${renderSavingsStats(stats)}
            ${renderSavingsGoalsList(goals, suggestions)}
        </div>
    `;

    contentDiv.innerHTML = html;

    console.log('✅ Sekcja oszczędzania wyrenderowana');
}

/**
 * Renderuje statystyki oszczędzania
 */
function renderSavingsStats(stats) {
    if (stats.totalGoals === 0) {
        return `
            <div class="savings-empty-state">
                <p class="empty-icon">🎯</p>
                <h3>Brak celów oszczędzania</h3>
                <p>Dodaj swój pierwszy cel oszczędzania, a aplikacja automatycznie będzie sugerowała bezpieczne kwoty do odłożenia.</p>
                <button class="btn-primary" onclick="window.showAddSavingsGoalModal()">
                    ➕ Dodaj pierwszy cel
                </button>
            </div>
        `;
    }

    return `
        <div class="savings-stats">
            <div class="stat-card">
                <div class="stat-label">Aktywne cele</div>
                <div class="stat-value">${stats.activeGoals}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ukończone cele</div>
                <div class="stat-value">${stats.completedGoals}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Odłożono razem</div>
                <div class="stat-value">${stats.totalCurrentAmount.toFixed(2)} zł</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Cel docelowy</div>
                <div class="stat-value">${stats.totalTargetAmount.toFixed(2)} zł</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Postęp ogólny</div>
                <div class="stat-value">${stats.progressPercentage.toFixed(1)}%</div>
            </div>
        </div>
    `;
}

/**
 * Renderuje listę celów oszczędzania
 */
function renderSavingsGoalsList(goals, suggestions) {
    if (goals.length === 0) {
        return '';
    }

    // Grupuj cele według statusu
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const pausedGoals = goals.filter(g => g.status === 'paused');

    let html = '<div class="savings-goals-list">';

    // Aktywne cele
    if (activeGoals.length > 0) {
        html += '<h3 class="goals-section-title">🎯 Aktywne cele</h3>';
        activeGoals.forEach(goal => {
            const suggestion = suggestions.find(s => s.goal.id === goal.id);
            html += renderSavingsGoalCard(goal, suggestion);
        });
    }

    // Ukończone cele
    if (completedGoals.length > 0) {
        html += '<h3 class="goals-section-title">✅ Ukończone cele</h3>';
        completedGoals.forEach(goal => {
            html += renderSavingsGoalCard(goal, null);
        });
    }

    // Wstrzymane cele
    if (pausedGoals.length > 0) {
        html += '<h3 class="goals-section-title">⏸️ Wstrzymane cele</h3>';
        pausedGoals.forEach(goal => {
            html += renderSavingsGoalCard(goal, null);
        });
    }

    html += '</div>';

    return html;
}

/**
 * Renderuje pojedynczą kartę celu oszczędzania
 */
function renderSavingsGoalCard(goal, suggestion) {
    const progress = calculateGoalProgress(goal.id);
    const remaining = goal.targetAmount - goal.currentAmount;

    // Ikona priorytetu
    const priorityIcons = {
        1: '🔴',  // Wysoki
        2: '🟡',  // Średni
        3: '🟢'   // Niski
    };

    const priorityNames = {
        1: 'Wysoki',
        2: 'Średni',
        3: 'Niski'
    };

    const priorityIcon = priorityIcons[goal.priority] || '🟡';
    const priorityName = priorityNames[goal.priority] || 'Średni';

    // Status badge
    let statusBadge = '';
    if (goal.status === 'completed') {
        statusBadge = '<span class="status-badge status-completed">✅ Ukończono</span>';
    } else if (goal.status === 'paused') {
        statusBadge = '<span class="status-badge status-paused">⏸️ Wstrzymano</span>';
    }

    // Suggestion section
    let suggestionHtml = '';
    if (suggestion && suggestion.suggestion.canSuggest) {
        const sug = suggestion.suggestion;
        suggestionHtml = `
            <div class="suggestion-box suggestion-available">
                <div class="suggestion-header">
                    <span class="suggestion-icon">💡</span>
                    <span class="suggestion-title">Bezpieczna kwota do odłożenia</span>
                </div>
                <div class="suggestion-amount">${sug.amount.toFixed(2)} zł</div>
                <div class="suggestion-reason">${sanitizeHTML(sug.reason)}</div>
                <div class="suggestion-details">
                    ${sug.details.map(d => `<div class="suggestion-detail">• ${sanitizeHTML(d)}</div>`).join('')}
                </div>
                <div class="suggestion-actions">
                    <button class="btn-success" onclick="window.acceptSuggestion('${goal.id}', ${sug.amount})">
                        ✅ Zaakceptuj
                    </button>
                    <button class="btn-secondary" onclick="window.rejectSuggestion('${goal.id}')">
                        ❌ Odrzuć
                    </button>
                </div>
            </div>
        `;
    } else if (suggestion && !suggestion.suggestion.canSuggest) {
        const sug = suggestion.suggestion;
        suggestionHtml = `
            <div class="suggestion-box suggestion-unavailable">
                <div class="suggestion-header">
                    <span class="suggestion-icon">ℹ️</span>
                    <span class="suggestion-title">Brak sugestii</span>
                </div>
                <div class="suggestion-reason">${sanitizeHTML(sug.reason)}</div>
                ${sug.details.length > 0 ? `
                    <div class="suggestion-details">
                        ${sug.details.map(d => `<div class="suggestion-detail">• ${sanitizeHTML(d)}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    return `
        <div class="savings-goal-card ${goal.status}">
            <div class="goal-header">
                <div class="goal-title-section">
                    <span class="goal-icon">${sanitizeHTML(goal.icon)}</span>
                    <h3 class="goal-name">${sanitizeHTML(goal.name)}</h3>
                    ${statusBadge}
                </div>
                <div class="goal-actions">
                    ${goal.status === 'active' ? `
                        <button class="btn-icon" onclick="window.editSavingsGoal('${goal.id}')" title="Edytuj">
                            ✏️
                        </button>
                    ` : ''}
                    <button class="btn-icon" onclick="window.deleteSavingsGoal('${goal.id}')" title="Usuń">
                        🗑️
                    </button>
                </div>
            </div>

            ${goal.description ? `
                <div class="goal-description">${sanitizeHTML(goal.description)}</div>
            ` : ''}

            <div class="goal-info">
                <div class="goal-info-item">
                    <span class="label">Priorytet:</span>
                    <span class="value">${priorityIcon} ${priorityName}</span>
                </div>
                <div class="goal-info-item">
                    <span class="label">Odłożono:</span>
                    <span class="value">${goal.currentAmount.toFixed(2)} zł</span>
                </div>
                <div class="goal-info-item">
                    <span class="label">Cel:</span>
                    <span class="value">${goal.targetAmount.toFixed(2)} zł</span>
                </div>
                <div class="goal-info-item">
                    <span class="label">Pozostało:</span>
                    <span class="value">${remaining.toFixed(2)} zł</span>
                </div>
            </div>

            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
                <div class="progress-text">${progress.percentage.toFixed(1)}%</div>
            </div>

            ${suggestionHtml}

            ${goal.status === 'active' ? `
                <button class="btn-link view-history-btn" onclick="window.showGoalHistory('${goal.id}')">
                    📊 Zobacz historię wpłat
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Pokazuje komunikat sukcesu
 */
export function showSavingsSuccessMessage(message) {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 3000);
}

/**
 * Pokazuje komunikat błędu
 */
export function showSavingsErrorMessage(message) {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 3000);
}
