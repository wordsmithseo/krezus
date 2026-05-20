// src/ui/renderSavingsGoals.js
import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { getSavingsGoals } from '../modules/savingsGoalManager.js';
import { calculateAllSuggestions, calculateGoalProgress, calculateSavingsStats } from '../modules/savingsGoalCalculator.js';
import { icon } from '../utils/icons.js';

const GOALS_PER_PAGE = 25;
let currentGoalsPage = 1;

export function renderSavingsGoals() {
    const contentDiv = document.getElementById('savingsGoalsContent');
    if (!contentDiv) return;

    const goals = getSavingsGoals();
    const stats = calculateSavingsStats();
    const suggestions = calculateAllSuggestions();

    const html = `
        <div class="card" style="margin-bottom:16px">
            <div class="card-header">
                <div>
                    <h3>Oszczędzanie</h3>
                    <span class="card-sub">Twoje cele i postępy</span>
                </div>
                <button class="btn accent sm" onclick="window.showAddSavingsGoalModal()">
                    ${icon('Plus', { size: 13, strokeWidth: 2 })} Dodaj cel
                </button>
            </div>
            ${renderSavingsStats(stats)}
        </div>
        ${renderSavingsGoalsList(goals, suggestions)}
    `;

    contentDiv.innerHTML = sanitizeHTML(html);
}

function renderSavingsStats(stats) {
    if (stats.totalGoals === 0) {
        return `
            <div class="empty-state" style="padding:40px 20px">
                <p style="font-size:2rem;margin:0 0 12px">🎯</p>
                <p style="font-weight:500;margin:0 0 8px">Brak celów oszczędzania</p>
                <p class="text-mute text-sm" style="max-width:360px;margin:0 auto 0">Dodaj swój pierwszy cel, a aplikacja automatycznie będzie sugerowała bezpieczne kwoty do odłożenia.</p>
            </div>
        `;
    }

    return `
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
            <div class="metric">
                <div class="metric-label">Aktywne cele</div>
                <div class="metric-value">${stats.activeGoals}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Ukończone</div>
                <div class="metric-value">${stats.completedGoals}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Odłożono razem</div>
                <div class="metric-value num">${stats.totalCurrentAmount.toFixed(2)} <small style="font-size:0.55em;font-weight:400">zł</small></div>
            </div>
            <div class="metric">
                <div class="metric-label">Cel docelowy</div>
                <div class="metric-value num">${stats.totalTargetAmount.toFixed(2)} <small style="font-size:0.55em;font-weight:400">zł</small></div>
            </div>
            <div class="metric">
                <div class="metric-label">Postęp ogólny</div>
                <div class="metric-value">${stats.progressPercentage.toFixed(1)}%</div>
            </div>
        </div>
    `;
}

function renderSavingsGoalsList(goals, suggestions) {
    if (goals.length === 0) return '';

    const sortedGoals = [
        ...goals.filter(g => g.status === 'active'),
        ...goals.filter(g => g.status === 'completed'),
        ...goals.filter(g => g.status === 'paused')
    ];

    const totalGoals = sortedGoals.length;
    const totalPages = Math.ceil(totalGoals / GOALS_PER_PAGE);
    const goalsToShow = sortedGoals.slice(
        (currentGoalsPage - 1) * GOALS_PER_PAGE,
        currentGoalsPage * GOALS_PER_PAGE
    );

    const iconArrowUp   = icon('ArrowUp',   { size: 13, strokeWidth: 1.5 });
    const iconArrowDown = icon('ArrowDown', { size: 13, strokeWidth: 1.5 });

    let html = `
        <div class="card">
            <div class="card-header">
                <h3>Lista celów <span class="tag" style="font-weight:400;font-size:12px">${totalGoals}</span></h3>
                <div style="display:flex;gap:6px">
                    <button class="btn ghost sm" onclick="window.collapseAllGoals()">
                        ${iconArrowUp} Zwiń
                    </button>
                    <button class="btn ghost sm" onclick="window.expandAllGoals()">
                        ${iconArrowDown} Rozwiń
                    </button>
                </div>
            </div>
            <div class="savings-goals-list">
    `;

    goalsToShow.forEach(goal => {
        const suggestion = suggestions.find(s => s.goal.id === goal.id);
        html += renderSavingsGoalCard(goal, suggestion);
    });

    html += '</div>';
    if (totalPages > 1) html += renderGoalsPagination(totalPages);
    html += '</div>';
    return html;
}

function renderGoalsPagination(totalPages) {
    const chevLeft  = icon('ChevronLeft',  { size: 14, strokeWidth: 1.5 });
    const chevRight = icon('ChevronRight', { size: 14, strokeWidth: 1.5 });
    let html = '<div style="display:flex;justify-content:center;gap:4px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">';
    html += `<button class="pagination-btn" ${currentGoalsPage === 1 ? 'disabled' : ''} onclick="window.changeGoalsPage(${currentGoalsPage - 1})">${chevLeft}</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === currentGoalsPage ? 'active' : ''}" onclick="window.changeGoalsPage(${i})">${i}</button>`;
    }
    html += `<button class="pagination-btn" ${currentGoalsPage === totalPages ? 'disabled' : ''} onclick="window.changeGoalsPage(${currentGoalsPage + 1})">${chevRight}</button>`;
    html += '</div>';
    return html;
}

window.changeGoalsPage = function(page) {
    currentGoalsPage = page;
    renderSavingsGoals();
};

window.toggleGoalCollapse = function(goalId) {
    const card = document.querySelector(`[data-goal-id="${goalId}"]`);
    if (card) card.classList.toggle('collapsed');
};

window.collapseAllGoals = function() {
    document.querySelectorAll('.savings-goal-card').forEach(c => c.classList.add('collapsed'));
};

window.expandAllGoals = function() {
    document.querySelectorAll('.savings-goal-card').forEach(c => c.classList.remove('collapsed'));
};

function renderSavingsGoalCard(goal, suggestion) {
    const progress = calculateGoalProgress(goal.id);
    const remaining = goal.targetAmount - goal.currentAmount;

    let deadlineHtml = '';
    if (goal.targetDate) {
        const targetDateObj = new Date(goal.targetDate);
        const today = new Date();
        const daysToDeadline = Math.max(0, Math.floor((targetDateObj - today) / (1000 * 60 * 60 * 24)));
        const isUrgent = daysToDeadline < 7;
        const isSoon   = daysToDeadline < 30;
        const formattedDate = targetDateObj.toLocaleDateString('pl-PL');
        const calColor = isUrgent ? 'var(--danger)' : isSoon ? 'oklch(0.62 0.17 60)' : 'var(--ink-2)';
        deadlineHtml = `
            <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:${calColor};margin-bottom:10px">
                ${icon('Calendar', { size: 13, strokeWidth: 1.5 })}
                <span>Deadline: <strong>${escapeHTML(formattedDate)}</strong> (za ${daysToDeadline} ${daysToDeadline === 1 ? 'dzień' : 'dni'})</span>
            </div>
        `;
    }

    const priorityNames  = { 1: 'Wysoki', 2: 'Średni', 3: 'Niski' };
    const priorityColors = { 1: 'var(--danger)', 2: 'var(--accent)', 3: 'var(--success)' };
    const priorityName   = priorityNames[goal.priority]  || 'Średni';
    const priorityColor  = priorityColors[goal.priority] || 'var(--accent)';

    let statusBadge = '';
    if      (goal.status === 'completed') statusBadge = '<span class="tag success dot">Ukończono</span>';
    else if (goal.status === 'paused')    statusBadge = '<span class="tag dot">Wstrzymano</span>';

    let suggestionHtml = '';
    if (suggestion?.suggestion?.canSuggest) {
        const sug = suggestion.suggestion;
        suggestionHtml = `
            <div style="background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 25%,var(--line));border-radius:var(--radius-sm);padding:12px;margin-top:12px">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                    ${icon('Sparkles', { size: 14, strokeWidth: 1.5 })}
                    <span style="font-size:12px;font-weight:600">Bezpieczna kwota do odłożenia</span>
                </div>
                <div class="num" style="font-size:1.2rem;font-weight:700;color:var(--accent);margin-bottom:4px">${sug.amount.toFixed(2)} zł</div>
                <div class="text-sm text-mute" style="margin-bottom:8px">${sanitizeHTML(sug.reason)}</div>
                ${sug.details.length ? `<ul style="margin:0 0 10px;padding-left:16px;font-size:12px;color:var(--ink-2)">${sug.details.map(d => `<li>${sanitizeHTML(d)}</li>`).join('')}</ul>` : ''}
                <div style="display:flex;gap:6px">
                    <button class="btn accent sm" onclick="window.acceptSuggestion('${goal.id}', ${sug.amount})">
                        ${icon('Check', { size: 12, strokeWidth: 2 })} Zaakceptuj
                    </button>
                    <button class="btn ghost sm" onclick="window.rejectSuggestion('${goal.id}')">
                        ${icon('X', { size: 12, strokeWidth: 2 })} Odrzuć
                    </button>
                </div>
            </div>
        `;
    } else if (suggestion && !suggestion.suggestion.canSuggest) {
        const sug = suggestion.suggestion;
        suggestionHtml = `
            <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:10px;margin-top:10px;display:flex;gap:6px;align-items:flex-start;font-size:12px;color:var(--ink-3)">
                ${icon('Info', { size: 13, strokeWidth: 1.5 })}
                <span>${sanitizeHTML(sug.reason)}</span>
            </div>
        `;
    }

    const iconEdit  = icon('Edit',  { size: 13, strokeWidth: 1.5 });
    const iconTrash = icon('Trash', { size: 13, strokeWidth: 1.5 });
    const iconChart = icon('Chart', { size: 13, strokeWidth: 1.5 });
    const pct = Math.min(progress.percentage, 100);
    const fillColor = progress.percentage >= 100 ? 'var(--success)' : 'var(--accent)';

    return `
        <div class="savings-goal-card ${goal.status} collapsed" data-goal-id="${goal.id}">
            <div class="goal-header-collapsible" onclick="window.toggleGoalCollapse('${goal.id}')">
                <div class="goal-collapse-left">
                    <button class="collapse-toggle" title="Rozwiń/Zwiń">
                        <span class="collapse-icon">▶</span>
                    </button>
                    <span class="goal-icon">${sanitizeHTML(goal.icon)}</span>
                    <div class="goal-title-section">
                        <span style="font-weight:500">${sanitizeHTML(goal.name)}</span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="goal-collapsed-info">
                    <div class="num" style="font-size:13px">
                        ${goal.currentAmount.toFixed(2)}<span class="text-mute"> / ${goal.targetAmount.toFixed(2)} zł</span>
                    </div>
                    <div class="text-mute text-sm">${progress.percentage.toFixed(0)}%</div>
                </div>
            </div>

            <div class="goal-actions-bar">
                ${goal.status === 'active' ? `
                    <button class="btn ghost icon-only sm" onclick="event.stopPropagation(); window.editSavingsGoal('${goal.id}')" title="Edytuj">${iconEdit}</button>
                ` : ''}
                <button class="btn ghost icon-only sm" onclick="event.stopPropagation(); window.deleteSavingsGoal('${goal.id}')" title="Usuń">${iconTrash}</button>
            </div>

            <div class="goal-expandable-content">
                ${goal.description ? `<p class="text-sm text-mute" style="margin:0 0 10px">${sanitizeHTML(goal.description)}</p>` : ''}

                ${deadlineHtml}

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
                    <div class="metric">
                        <div class="metric-label">Priorytet</div>
                        <div class="metric-value" style="color:${priorityColor}">${escapeHTML(priorityName)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Odłożono</div>
                        <div class="metric-value num">${goal.currentAmount.toFixed(2)} <small style="font-size:0.55em;font-weight:400">zł</small></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Cel</div>
                        <div class="metric-value num">${goal.targetAmount.toFixed(2)} <small style="font-size:0.55em;font-weight:400">zł</small></div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Pozostało</div>
                        <div class="metric-value num">${remaining.toFixed(2)} <small style="font-size:0.55em;font-weight:400">zł</small></div>
                    </div>
                </div>

                <div style="margin-bottom:12px">
                    <div class="progress" style="height:6px">
                        <div style="width:${pct}%;height:100%;background:${fillColor};border-radius:inherit;transition:width 400ms ease"></div>
                    </div>
                    <div class="text-sm text-mute" style="margin-top:4px;text-align:right">${progress.percentage.toFixed(1)}%</div>
                </div>

                ${suggestionHtml}

                ${goal.status === 'active' ? `
                    <button class="btn ghost sm" style="margin-top:10px" onclick="window.showGoalHistory('${goal.id}')">
                        ${iconChart} Historia wpłat
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

export function showSavingsSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position:fixed;top:20px;right:20px;background:var(--success);color:white;
        padding:14px 20px;border-radius:var(--radius-sm);box-shadow:var(--shadow-md);
        z-index:10000;font-size:14px;animation:slideInRight 0.3s ease-out
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

export function showSavingsErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position:fixed;top:20px;right:20px;background:var(--danger);color:white;
        padding:14px 20px;border-radius:var(--radius-sm);box-shadow:var(--shadow-md);
        z-index:10000;font-size:14px;animation:slideInRight 0.3s ease-out
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}
