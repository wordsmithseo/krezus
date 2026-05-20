// src/components/savingsGoalsModals.js
import { getCurrentUser } from '../modules/auth.js';
import {
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addContribution,
    removeContribution,
    rejectSuggestion,
    getSavingsGoals
} from '../modules/savingsGoalManager.js';
import { getGoalContributionHistory } from '../modules/savingsGoalCalculator.js';
import { showErrorMessage, showSuccessMessage } from '../utils/errorHandler.js';
import { sanitizeHTML } from '../utils/sanitizer.js';
import { renderSavingsGoals, showSavingsSuccessMessage } from '../ui/renderSavingsGoals.js';
import { showConfirmModal } from './confirmModal.js';
import { Fmt } from '../utils/fmt.js';

/**
 * Modal dodawania nowego celu oszczędzania
 */
export function showAddSavingsGoalModal() {
    const modal = document.getElementById('addSavingsGoalModal') || createAddSavingsGoalModal();

    // Resetuj formularz
    document.getElementById('savingsGoalForm').reset();
    document.getElementById('savingsGoalPriority').value = '2'; // Domyślnie średni priorytet

    modal.classList.add('active');
}

function createAddSavingsGoalModal() {
    const modal = document.createElement('div');
    modal.id = 'addSavingsGoalModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px">
            <div class="modal-header">
                <h3>Nowy cel oszczędnościowy</h3>
                <button class="btn ghost icon-only" onclick="window.closeModal('addSavingsGoalModal')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form id="savingsGoalForm" onsubmit="window.handleAddSavingsGoal(event)">
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="field full">
                            <label>Nazwa celu</label>
                            <input class="input" type="text" id="savingsGoalName" placeholder="np. Wakacje, Nowy laptop…" required minlength="2" maxlength="50">
                        </div>
                        <div class="field">
                            <label>Kwota docelowa (zł)</label>
                            <input class="input mono" type="number" id="savingsGoalAmount" placeholder="0" required min="1" step="0.01">
                        </div>
                        <div class="field">
                            <label>Termin (opcjonalnie)</label>
                            <input class="input" type="date" id="savingsGoalTargetDate">
                        </div>
                        <div class="field full">
                            <label>Ikona</label>
                            <input class="input" type="text" id="savingsGoalIcon" placeholder="🎯" maxlength="2" value="🎯" style="font-size:20px;width:60px">
                            <div class="hint">Emoji reprezentujące cel</div>
                        </div>
                        <input type="hidden" id="savingsGoalPriority" value="2">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="window.closeModal('addSavingsGoalModal')">Anuluj</button>
                    <button type="submit" class="btn accent">Utwórz cel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) window.closeModal('addSavingsGoalModal'); });
    return modal;
}

/**
 * Handler dodawania celu
 */
window.handleAddSavingsGoal = async (e) => {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) {
        showErrorMessage('Musisz być zalogowany');
        return;
    }

    const name = document.getElementById('savingsGoalName').value.trim();
    const description = document.getElementById('savingsGoalDescription').value.trim();
    const amount = parseFloat(document.getElementById('savingsGoalAmount').value);
    const targetDate = document.getElementById('savingsGoalTargetDate').value || null;
    const priority = parseInt(document.getElementById('savingsGoalPriority').value);
    const icon = document.getElementById('savingsGoalIcon').value.trim() || '🎯';

    if (!name || name.length < 2) {
        showErrorMessage('Nazwa musi mieć minimum 2 znaki');
        return;
    }

    if (!amount || amount < 10) {
        showErrorMessage('Kwota musi być co najmniej 10 zł');
        return;
    }

    try {
        await addSavingsGoal({
            name,
            description,
            targetAmount: amount,
            targetDate,
            priority,
            icon
        }, user.uid);

        showSuccessMessage('Cel oszczędzania dodany!');
        closeModal('addSavingsGoalModal');
        renderSavingsGoals();
    } catch (error) {
        console.error('❌ Błąd dodawania celu:', error);
        showErrorMessage('Nie udało się dodać celu');
    }
};

/**
 * Modal edycji celu oszczędzania
 */
export function showEditSavingsGoalModal(goalId) {
    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        showErrorMessage('Cel nie znaleziony');
        return;
    }

    const modal = document.getElementById('editSavingsGoalModal') || createEditSavingsGoalModal();

    const titleEl = document.getElementById('editSavingsGoalTitle');
    if (titleEl) titleEl.textContent = `Edytuj: ${goal.name}`;

    document.getElementById('editSavingsGoalId').value = goal.id;
    document.getElementById('editSavingsGoalName').value = goal.name;
    document.getElementById('editSavingsGoalDescription').value = goal.description || '';
    document.getElementById('editSavingsGoalAmount').value = goal.targetAmount;
    document.getElementById('editSavingsGoalTargetDate').value = goal.targetDate || '';
    document.getElementById('editSavingsGoalPriority').value = goal.priority || 2;
    document.getElementById('editSavingsGoalIcon').value = goal.icon || '🎯';

    modal.classList.add('active');
}

function createEditSavingsGoalModal() {
    const modal = document.createElement('div');
    modal.id = 'editSavingsGoalModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px">
            <div class="modal-header">
                <h3 id="editSavingsGoalTitle">Edytuj cel</h3>
                <button class="btn ghost icon-only" onclick="window.closeModal('editSavingsGoalModal')"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form id="editSavingsGoalForm" onsubmit="window.handleEditSavingsGoal(event)">
                <div class="modal-body">
                    <input type="hidden" id="editSavingsGoalId">
                    <input type="hidden" id="editSavingsGoalDescription" value="">
                    <input type="hidden" id="editSavingsGoalPriority" value="2">
                    <div class="form-grid">
                        <div class="field full">
                            <label>Nazwa celu</label>
                            <input class="input" type="text" id="editSavingsGoalName" placeholder="np. Wakacje…" required minlength="2" maxlength="50">
                        </div>
                        <div class="field">
                            <label>Kwota docelowa (zł)</label>
                            <input class="input mono" type="number" id="editSavingsGoalAmount" placeholder="0" required min="1" step="0.01">
                        </div>
                        <div class="field">
                            <label>Termin (opcjonalnie)</label>
                            <input class="input" type="date" id="editSavingsGoalTargetDate">
                        </div>
                        <div class="field full">
                            <label>Ikona</label>
                            <input class="input" type="text" id="editSavingsGoalIcon" placeholder="🎯" maxlength="2" style="font-size:20px;width:60px">
                            <div class="hint">Emoji reprezentujące cel</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="window.closeModal('editSavingsGoalModal')">Anuluj</button>
                    <button type="submit" class="btn accent">Zapisz</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) window.closeModal('editSavingsGoalModal'); });
    return modal;
}

/**
 * Handler edycji celu
 */
window.handleEditSavingsGoal = async (e) => {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) {
        showErrorMessage('Musisz być zalogowany');
        return;
    }

    const goalId = document.getElementById('editSavingsGoalId').value;
    const name = document.getElementById('editSavingsGoalName').value.trim();
    const description = document.getElementById('editSavingsGoalDescription').value.trim();
    const amount = parseFloat(document.getElementById('editSavingsGoalAmount').value);
    const targetDate = document.getElementById('editSavingsGoalTargetDate').value || null;
    const priority = parseInt(document.getElementById('editSavingsGoalPriority').value);
    const icon = document.getElementById('editSavingsGoalIcon').value.trim() || '🎯';

    if (!name || name.length < 2) {
        showErrorMessage('Nazwa musi mieć minimum 2 znaki');
        return;
    }

    if (!amount || amount < 10) {
        showErrorMessage('Kwota musi być co najmniej 10 zł');
        return;
    }

    try {
        await updateSavingsGoal(goalId, {
            name,
            description,
            targetAmount: amount,
            targetDate,
            priority,
            icon
        }, user.uid);

        showSuccessMessage('Cel zaktualizowany!');
        closeModal('editSavingsGoalModal');
        renderSavingsGoals();
    } catch (error) {
        console.error('❌ Błąd aktualizacji celu:', error);
        showErrorMessage('Nie udało się zaktualizować celu');
    }
};

/**
 * Usuwa cel oszczędzania
 */
window.deleteSavingsGoal = async (goalId) => {
    const user = getCurrentUser();
    if (!user) {
        showErrorMessage('Musisz być zalogowany');
        return;
    }

    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        showErrorMessage('Cel nie znaleziony');
        return;
    }

    const confirmed = await showConfirmModal(
        'Czy na pewno chcesz usunąć ten cel?',
        `Cel: ${goal.name}\nOdłożono: ${Fmt.zl(goal.currentAmount)} zł\n\nTa operacja jest nieodwracalna.`
    );

    if (!confirmed) return;

    try {
        await deleteSavingsGoal(goalId, user.uid);
        showSuccessMessage('Cel usunięty');
        renderSavingsGoals();
    } catch (error) {
        console.error('❌ Błąd usuwania celu:', error);
        showErrorMessage('Nie udało się usunąć celu');
    }
};

/**
 * Akceptuje sugestię wpłaty
 */
window.acceptSuggestion = async (goalId, amount) => {
    const user = getCurrentUser();
    if (!user) {
        showErrorMessage('Musisz być zalogowany');
        return;
    }

    const confirmed = await showConfirmModal(
        'Potwierdź odłożenie pieniędzy',
        `Czy na pewno chcesz odłożyć ${Fmt.zl(amount)} zł na ten cel?\n\nTa kwota została obliczona przez algorytm jako bezpieczna.`
    );

    if (!confirmed) return;

    try {
        await addContribution(goalId, amount, user.uid);
        showSavingsSuccessMessage(`Odłożono ${Fmt.zl(amount)} zł!`);
        renderSavingsGoals();
    } catch (error) {
        console.error('❌ Błąd akceptacji sugestii:', error);
        showErrorMessage('Nie udało się odłożyć pieniędzy');
    }
};

/**
 * Odrzuca sugestię wpłaty
 */
window.rejectSuggestion = async (goalId) => {
    const user = getCurrentUser();
    if (!user) {
        showErrorMessage('Musisz być zalogowany');
        return;
    }

    try {
        await rejectSuggestion(goalId, user.uid);
        showSuccessMessage('Sugestia odrzucona');
        renderSavingsGoals();
    } catch (error) {
        console.error('❌ Błąd odrzucenia sugestii:', error);
        showErrorMessage('Nie udało się odrzucić sugestii');
    }
};

/**
 * Wyświetla historię wpłat dla celu
 */
window.showGoalHistory = (goalId) => {
    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        showErrorMessage('Cel nie znaleziony');
        return;
    }

    const contributions = getGoalContributionHistory(goalId);

    const modal = document.getElementById('goalHistoryModal') || createGoalHistoryModal();

    // Wypełnij danymi
    const titleEl = modal.querySelector('.modal-header h2');
    titleEl.textContent = `Historia wpłat: ${goal.name}`;

    const contentEl = modal.querySelector('#goalHistoryContent');

    if (contributions.length === 0) {
        contentEl.innerHTML = '<p class="empty-state">Brak wpłat dla tego celu</p>';
    } else {
        let html = '<div class="contributions-list">';

        contributions.forEach(contrib => {
            html += `
                <div class="contribution-item">
                    <div class="contribution-info">
                        <div class="contribution-date">${contrib.date} ${contrib.time}</div>
                        <div class="contribution-type">${contrib.type === 'suggestion-accepted' ? 'Sugestia zaakceptowana' : 'Ręczna wpłata'}</div>
                    </div>
                    <div class="contribution-right">
                        <div class="contribution-amount">+${Fmt.zl(contrib.amount)} zł</div>
                        <button class="btn-danger-small" onclick="window.removeContributionConfirm('${contrib.id}', '${goalId}')" title="Wycofaj wpłatę">
                            ↩️ Wycofaj
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

        html += `
            <div class="contributions-summary">
                <div class="summary-item">
                    <span class="label">Liczba wpłat:</span>
                    <span class="value">${contributions.length}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Suma wpłat:</span>
                    <span class="value">${Fmt.zl(totalAmount)} zł</span>
                </div>
                <div class="summary-item">
                    <span class="label">Średnia wpłata:</span>
                    <span class="value">${Fmt.zl(totalAmount / contributions.length)} zł</span>
                </div>
            </div>
        `;

        contentEl.innerHTML = html;
    }

    modal.classList.add('active');
};

function createGoalHistoryModal() {
    const modal = document.createElement('div');
    modal.id = 'goalHistoryModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Historia wpłat</h2>
                <button class="modal-close" onclick="closeModal('goalHistoryModal')">✕</button>
            </div>

            <div id="goalHistoryContent"></div>

            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('goalHistoryModal')">
                    Zamknij
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

/**
 * Wycofuje wpłatę z potwierdzeniem
 */
window.removeContributionConfirm = async (contributionId, goalId) => {
    const user = getCurrentUser();
    if (!user) {
        showErrorMessage('Musisz być zalogowany');
        return;
    }

    const confirmed = await showConfirmModal(
        'Czy na pewno chcesz wycofać tę wpłatę?',
        'Kwota zostanie odjęta od bieżącej sumy odłożonej na cel. Tej operacji nie można cofnąć.'
    );

    if (!confirmed) return;

    try {
        const result = await removeContribution(contributionId, user.uid);
        showSavingsSuccessMessage(`Wycofano wpłatę: ${Fmt.zl(result.contribution.amount)} zł`);

        // Odśwież modal historii
        window.showGoalHistory(goalId);

        // Odśwież główną sekcję
        renderSavingsGoals();
    } catch (error) {
        console.error('❌ Błąd wycofania wpłaty:', error);
        showErrorMessage('Nie udało się wycofać wpłaty');
    }
};

/**
 * Modal wpłaty na cel
 */
function showDepositModal(goalId) {
    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) { showErrorMessage('Cel nie znaleziony'); return; }

    const existing = document.getElementById('depositGoalModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'depositGoalModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:420px">
            <div class="modal-header">
                <h3>Wpłata: ${sanitizeHTML(goal.name)}</h3>
                <button class="btn ghost icon-only" data-action="close-deposit-modal"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label>Kwota wpłaty (zł)</label>
                    <input id="depositAmount" class="input mono lg" type="number" min="0.01" step="0.01" placeholder="0,00">
                    <div class="hint">Kwota zostanie doliczona do celu i odjęta z dostępnych środków</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" data-action="close-deposit-modal">Anuluj</button>
                <button class="btn accent" id="depositConfirmBtn">Wpłać</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#depositConfirmBtn').addEventListener('click', async () => {
        const amountStr = modal.querySelector('#depositAmount').value;
        const amount = parseFloat(amountStr);
        if (!amount || amount <= 0) { showErrorMessage('Podaj kwotę większą niż 0'); return; }
        const user = getCurrentUser();
        if (!user) { showErrorMessage('Musisz być zalogowany'); return; }
        try {
            await addContribution(goalId, amount, user.uid);
            modal.remove();
            showSuccessMessage(`Wpłacono ${Fmt.zl(amount)} zł!`);
            renderSavingsGoals();
        } catch (e) {
            showErrorMessage('Nie udało się wpłacić');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-action="close-deposit-modal"]')) modal.remove();
    });
}

/**
 * Wrapper dla window funkcji używanych w innych miejscach
 */
window.showAddSavingsGoalModal = showAddSavingsGoalModal;
window.editSavingsGoal = showEditSavingsGoalModal;
window.showDepositModal = showDepositModal;
