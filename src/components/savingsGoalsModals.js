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
        <div class="modal-content">
            <div class="modal-header">
                <h2>Dodaj cel oszczędzania</h2>
                <button class="modal-close" onclick="closeModal('addSavingsGoalModal')">✕</button>
            </div>

            <form id="savingsGoalForm" onsubmit="window.handleAddSavingsGoal(event)">
                <div class="form-group">
                    <label for="savingsGoalName">Nazwa celu *</label>
                    <input
                        type="text"
                        id="savingsGoalName"
                        placeholder="np. Wakacje, Nowy laptop, Fundusz awaryjny"
                        required
                        minlength="2"
                        maxlength="50"
                    >
                </div>

                <div class="form-group">
                    <label for="savingsGoalDescription">Opis (opcjonalnie)</label>
                    <textarea
                        id="savingsGoalDescription"
                        placeholder="Krótki opis celu..."
                        rows="3"
                        maxlength="200"
                    ></textarea>
                </div>

                <div class="form-group">
                    <label for="savingsGoalAmount">Docelowa kwota (PLN) *</label>
                    <input
                        type="number"
                        id="savingsGoalAmount"
                        placeholder="0.00"
                        required
                        min="10"
                        step="0.01"
                    >
                </div>

                <div class="form-group">
                    <label for="savingsGoalTargetDate">Data końcowa (opcjonalnie)</label>
                    <input
                        type="date"
                        id="savingsGoalTargetDate"
                        placeholder="RRRR-MM-DD"
                    >
                    <small class="form-hint">Jeśli określisz deadline, algorytm będzie bardziej agresywny w sugestiach</small>
                </div>

                <div class="form-group">
                    <label for="savingsGoalPriority">Priorytet</label>
                    <select id="savingsGoalPriority">
                        <option value="1">🔴 Wysoki</option>
                        <option value="2" selected>🟡 Średni</option>
                        <option value="3">🟢 Niski</option>
                    </select>
                    <small class="form-hint">Priorytet wpływa na kolejność i kwotę sugestii</small>
                </div>

                <div class="form-group">
                    <label for="savingsGoalIcon">Ikona (emoji)</label>
                    <input
                        type="text"
                        id="savingsGoalIcon"
                        placeholder="🎯"
                        maxlength="2"
                        value="🎯"
                    >
                </div>

                <div class="modal-info-box">
                    <p>ℹ️ <strong>Jak to działa?</strong></p>
                    <p>Po dodaniu celu, aplikacja będzie automatycznie analizować Twoje finanse i sugerować bezpieczne kwoty do odłożenia. Nie musisz ręcznie dodawać pieniędzy - algorytm zadba o Twoje bezpieczeństwo finansowe.</p>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('addSavingsGoalModal')">
                        Anuluj
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Dodaj cel
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
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

    // Wypełnij formularz danymi celu
    document.getElementById('editSavingsGoalId').value = goal.id;
    document.getElementById('editSavingsGoalName').value = goal.name;
    document.getElementById('editSavingsGoalDescription').value = goal.description || '';
    document.getElementById('editSavingsGoalAmount').value = goal.targetAmount;
    document.getElementById('editSavingsGoalTargetDate').value = goal.targetDate || '';
    document.getElementById('editSavingsGoalPriority').value = goal.priority;
    document.getElementById('editSavingsGoalIcon').value = goal.icon;

    modal.classList.add('active');
}

function createEditSavingsGoalModal() {
    const modal = document.createElement('div');
    modal.id = 'editSavingsGoalModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edytuj cel oszczędzania</h2>
                <button class="modal-close" onclick="closeModal('editSavingsGoalModal')">✕</button>
            </div>

            <form id="editSavingsGoalForm" onsubmit="window.handleEditSavingsGoal(event)">
                <input type="hidden" id="editSavingsGoalId">

                <div class="form-group">
                    <label for="editSavingsGoalName">Nazwa celu *</label>
                    <input
                        type="text"
                        id="editSavingsGoalName"
                        placeholder="np. Wakacje, Nowy laptop"
                        required
                        minlength="2"
                        maxlength="50"
                    >
                </div>

                <div class="form-group">
                    <label for="editSavingsGoalDescription">Opis (opcjonalnie)</label>
                    <textarea
                        id="editSavingsGoalDescription"
                        placeholder="Krótki opis celu..."
                        rows="3"
                        maxlength="200"
                    ></textarea>
                </div>

                <div class="form-group">
                    <label for="editSavingsGoalAmount">Docelowa kwota (PLN) *</label>
                    <input
                        type="number"
                        id="editSavingsGoalAmount"
                        placeholder="0.00"
                        required
                        min="10"
                        step="0.01"
                    >
                </div>

                <div class="form-group">
                    <label for="editSavingsGoalTargetDate">Data końcowa (opcjonalnie)</label>
                    <input
                        type="date"
                        id="editSavingsGoalTargetDate"
                        placeholder="RRRR-MM-DD"
                    >
                    <small class="form-hint">Jeśli określisz deadline, algorytm będzie bardziej agresywny w sugestiach</small>
                </div>

                <div class="form-group">
                    <label for="editSavingsGoalPriority">Priorytet</label>
                    <select id="editSavingsGoalPriority">
                        <option value="1">🔴 Wysoki</option>
                        <option value="2">🟡 Średni</option>
                        <option value="3">🟢 Niski</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="editSavingsGoalIcon">Ikona (emoji)</label>
                    <input
                        type="text"
                        id="editSavingsGoalIcon"
                        placeholder="🎯"
                        maxlength="2"
                    >
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('editSavingsGoalModal')">
                        Anuluj
                    </button>
                    <button type="submit" class="btn btn-primary">
                        💾 Zapisz zmiany
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
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
 * Wrapper dla window funkcji używanych w innych miejscach
 */
window.showAddSavingsGoalModal = showAddSavingsGoalModal;
window.editSavingsGoal = showEditSavingsGoalModal;
