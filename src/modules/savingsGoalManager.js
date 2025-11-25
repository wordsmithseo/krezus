// src/modules/savingsGoalManager.js
import { ref, set, onValue, off, get } from 'firebase/database';
import { db } from '../config/firebase.js';
import { getWarsawDateString, getCurrentTimeString } from '../utils/dateHelpers.js';
import { log } from './logger.js';

// === CACHE CELÓW OSZCZĘDZANIA ===
let savingsGoalsCache = [];
let savingsContributionsCache = []; // Historia wpłat na cele
let activeListeners = {};

/**
 * Generuje unikalny ID dla celu oszczędzania
 */
function generateGoalId() {
    return `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generuje unikalny ID dla wpłaty
 */
function generateContributionId() {
    return `sc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Pobiera cele oszczędzania (zwraca kopię cache)
 */
export function getSavingsGoals() {
    return [...savingsGoalsCache];
}

/**
 * Pobiera wpłaty na cele (zwraca kopię cache)
 */
export function getSavingsContributions() {
    return [...savingsContributionsCache];
}

/**
 * Zapisuje cele oszczędzania do Firebase
 */
export async function saveSavingsGoals(goals, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    console.log('💾 Zapisywanie celów oszczędzania:', goals);

    // Deduplikacja po ID
    const seenIds = new Set();
    const obj = {};

    goals.forEach(goal => {
        if (goal && goal.id && !seenIds.has(goal.id)) {
            seenIds.add(goal.id);
            obj[goal.id] = goal;
        }
    });

    const path = `users/${userId}/budget/savingsGoals`;
    await set(ref(db, path), obj);

    // Zaktualizuj cache
    savingsGoalsCache = Object.values(obj).sort((a, b) => {
        // Sortuj po statusie (active pierwsze) i dacie utworzenia
        if (a.status !== b.status) {
            if (a.status === 'active') return -1;
            if (b.status === 'active') return 1;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    console.log('✅ Cele oszczędzania zapisane:', savingsGoalsCache.length);
}

/**
 * Zapisuje wpłaty na cele do Firebase
 */
export async function saveSavingsContributions(contributions, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    console.log('💾 Zapisywanie wpłat na cele:', contributions);

    // Deduplikacja po ID
    const seenIds = new Set();
    const obj = {};

    contributions.forEach(contrib => {
        if (contrib && contrib.id && !seenIds.has(contrib.id)) {
            seenIds.add(contrib.id);
            obj[contrib.id] = contrib;
        }
    });

    const path = `users/${userId}/budget/savingsContributions`;
    await set(ref(db, path), obj);

    // Zaktualizuj cache
    savingsContributionsCache = Object.values(obj).sort((a, b) => {
        return (b.date || '').localeCompare(a.date || '') ||
               (b.time || '').localeCompare(a.time || '');
    });

    console.log('✅ Wpłaty na cele zapisane:', savingsContributionsCache.length);
}

/**
 * Ładuje cele oszczędzania z Firebase
 */
export async function loadSavingsGoals(userId) {
    if (!userId) {
        console.warn('⚠️ Brak userId - nie można załadować celów oszczędzania');
        return [];
    }

    try {
        console.log('📥 Ładowanie celów oszczędzania dla userId:', userId);
        const path = `users/${userId}/budget/savingsGoals`;
        const snapshot = await get(ref(db, path));

        if (snapshot.exists()) {
            const data = snapshot.val();
            savingsGoalsCache = Object.values(data).sort((a, b) => {
                // Sortuj po statusie (active pierwsze) i dacie utworzenia
                if (a.status !== b.status) {
                    if (a.status === 'active') return -1;
                    if (b.status === 'active') return 1;
                }
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            });
            console.log('✅ Załadowano cele oszczędzania:', savingsGoalsCache.length);
        } else {
            savingsGoalsCache = [];
            console.log('ℹ️ Brak celów oszczędzania w bazie danych');
        }

        return [...savingsGoalsCache];
    } catch (error) {
        console.error('❌ Błąd podczas ładowania celów oszczędzania:', error);
        return [];
    }
}

/**
 * Ładuje wpłaty na cele z Firebase
 */
export async function loadSavingsContributions(userId) {
    if (!userId) {
        console.warn('⚠️ Brak userId - nie można załadować wpłat');
        return [];
    }

    try {
        console.log('📥 Ładowanie wpłat na cele dla userId:', userId);
        const path = `users/${userId}/budget/savingsContributions`;
        const snapshot = await get(ref(db, path));

        if (snapshot.exists()) {
            const data = snapshot.val();
            savingsContributionsCache = Object.values(data).sort((a, b) => {
                return (b.date || '').localeCompare(a.date || '') ||
                       (b.time || '').localeCompare(a.time || '');
            });
            console.log('✅ Załadowano wpłaty na cele:', savingsContributionsCache.length);
        } else {
            savingsContributionsCache = [];
            console.log('ℹ️ Brak wpłat w bazie danych');
        }

        return [...savingsContributionsCache];
    } catch (error) {
        console.error('❌ Błąd podczas ładowania wpłat:', error);
        return [];
    }
}

/**
 * Dodaje nowy cel oszczędzania
 */
export async function addSavingsGoal(goalData, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    const newGoal = {
        id: generateGoalId(),
        name: goalData.name || 'Nowy cel',
        targetAmount: goalData.targetAmount || 0,
        targetDate: goalData.targetDate || null, // Opcjonalna data końcowa (YYYY-MM-DD)
        currentAmount: 0, // Zawsze zaczynamy od 0
        createdAt: getWarsawDateString() + 'T' + getCurrentTimeString(),
        status: 'active', // active, completed, paused
        icon: goalData.icon || '🎯',
        description: goalData.description || '',
        priority: goalData.priority || 2, // 1=high, 2=medium, 3=low
        lastSuggestionDate: null, // Kiedy ostatnio była sugestia
        lastSuggestionAmount: null, // Jaka była ostatnia sugestowana kwota
        suggestionStatus: null // null, 'pending', 'accepted', 'rejected'
    };

    const goals = getSavingsGoals();
    goals.push(newGoal);
    await saveSavingsGoals(goals, userId);

    // Logowanie
    await log('SAVINGS_GOAL_ADD', {
        name: newGoal.name,
        targetAmount: newGoal.targetAmount,
        targetDate: newGoal.targetDate,
        priority: newGoal.priority,
        budgetUser: 'System'
    });

    return newGoal;
}

/**
 * Aktualizuje cel oszczędzania
 */
export async function updateSavingsGoal(goalId, updates, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    const goals = getSavingsGoals();
    const index = goals.findIndex(g => g.id === goalId);

    if (index === -1) {
        throw new Error('Goal not found');
    }

    goals[index] = {
        ...goals[index],
        ...updates,
        id: goalId // Nie pozwalaj na zmianę ID
    };

    await saveSavingsGoals(goals, userId);

    // Logowanie
    await log('SAVINGS_GOAL_EDIT', {
        name: goals[index].name,
        targetAmount: goals[index].targetAmount,
        budgetUser: 'System'
    });

    return goals[index];
}

/**
 * Usuwa cel oszczędzania
 */
export async function deleteSavingsGoal(goalId, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    const goals = getSavingsGoals();
    const goalToDelete = goals.find(g => g.id === goalId);
    const filtered = goals.filter(g => g.id !== goalId);

    if (filtered.length === goals.length) {
        throw new Error('Goal not found');
    }

    await saveSavingsGoals(filtered, userId);

    // Usuń również powiązane wpłaty
    const contributions = getSavingsContributions();
    const filteredContributions = contributions.filter(c => c.goalId !== goalId);
    await saveSavingsContributions(filteredContributions, userId);

    // Logowanie
    await log('SAVINGS_GOAL_DELETE', {
        name: goalToDelete ? goalToDelete.name : 'Nieznany cel',
        budgetUser: 'System'
    });

    return true;
}

/**
 * Dodaje wpłatę na cel oszczędzania (gdy użytkownik zaakceptuje sugestię)
 */
export async function addContribution(goalId, amount, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    if (!amount || amount <= 0) {
        throw new Error('Amount must be positive');
    }

    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        throw new Error('Goal not found');
    }

    // Dodaj wpłatę do historii
    const newContribution = {
        id: generateContributionId(),
        goalId: goalId,
        goalName: goal.name,
        amount: amount,
        date: getWarsawDateString(),
        time: getCurrentTimeString(),
        type: 'suggestion-accepted' // 'suggestion-accepted', 'manual' (na przyszłość)
    };

    const contributions = getSavingsContributions();
    contributions.push(newContribution);
    await saveSavingsContributions(contributions, userId);

    // Zaktualizuj currentAmount w celu
    const updatedGoal = {
        ...goal,
        currentAmount: (goal.currentAmount || 0) + amount,
        lastSuggestionDate: getWarsawDateString(),
        lastSuggestionAmount: amount,
        suggestionStatus: 'accepted'
    };

    // Jeśli osiągnięto cel, zmień status na completed
    if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
        updatedGoal.status = 'completed';
    }

    await updateSavingsGoal(goalId, updatedGoal, userId);

    // Logowanie
    await log('SAVINGS_CONTRIBUTION_ADD', {
        amount: amount,
        goalName: goal.name,
        budgetUser: 'System'
    });

    return {
        contribution: newContribution,
        goal: updatedGoal
    };
}

/**
 * Wycofuje wpłatę na cel oszczędzania
 */
export async function removeContribution(contributionId, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    const contributions = getSavingsContributions();
    const contribution = contributions.find(c => c.id === contributionId);

    if (!contribution) {
        throw new Error('Contribution not found');
    }

    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === contribution.goalId);

    if (!goal) {
        throw new Error('Goal not found');
    }

    // Usuń wpłatę z listy
    const filteredContributions = contributions.filter(c => c.id !== contributionId);
    await saveSavingsContributions(filteredContributions, userId);

    // Zaktualizuj currentAmount w celu (odejmij kwotę)
    const updatedGoal = {
        ...goal,
        currentAmount: Math.max(0, (goal.currentAmount || 0) - contribution.amount)
    };

    // Jeśli cel był completed, ale po wycofaniu nie jest już ukończony, zmień status
    if (goal.status === 'completed' && updatedGoal.currentAmount < updatedGoal.targetAmount) {
        updatedGoal.status = 'active';
    }

    await updateSavingsGoal(contribution.goalId, updatedGoal, userId);

    // Logowanie
    await log('SAVINGS_CONTRIBUTION_REMOVE', {
        amount: contribution.amount,
        goalName: goal.name,
        budgetUser: 'System'
    });

    return {
        contribution,
        goal: updatedGoal
    };
}

/**
 * Odrzuca sugestię wpłaty
 */
export async function rejectSuggestion(goalId, userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        throw new Error('Goal not found');
    }

    const updatedGoal = {
        ...goal,
        lastSuggestionDate: getWarsawDateString(),
        suggestionStatus: 'rejected'
    };

    await updateSavingsGoal(goalId, updatedGoal, userId);

    // Logowanie
    await log('SAVINGS_SUGGESTION_REJECT', {
        goalName: goal.name,
        budgetUser: 'System'
    });

    return updatedGoal;
}

/**
 * Subskrybuje zmiany w czasie rzeczywistym
 */
export function subscribeToSavingsGoalsUpdates(userId, callbacks) {
    if (!userId) {
        console.warn('⚠️ Brak userId - nie można subskrybować zmian');
        return;
    }

    console.log('🔔 Subskrybowanie zmian w celach oszczędzania');

    // Cele oszczędzania
    const goalsPath = `users/${userId}/budget/savingsGoals`;
    const goalsRef = ref(db, goalsPath);

    activeListeners.savingsGoals = onValue(goalsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            savingsGoalsCache = Object.values(data).sort((a, b) => {
                if (a.status !== b.status) {
                    if (a.status === 'active') return -1;
                    if (b.status === 'active') return 1;
                }
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            });
        } else {
            savingsGoalsCache = [];
        }

        console.log('🔄 Zaktualizowano cele oszczędzania:', savingsGoalsCache.length);

        if (callbacks.onGoalsChange) {
            callbacks.onGoalsChange(savingsGoalsCache);
        }
    });

    // Wpłaty na cele
    const contributionsPath = `users/${userId}/budget/savingsContributions`;
    const contributionsRef = ref(db, contributionsPath);

    activeListeners.savingsContributions = onValue(contributionsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            savingsContributionsCache = Object.values(data).sort((a, b) => {
                return (b.date || '').localeCompare(a.date || '') ||
                       (b.time || '').localeCompare(a.time || '');
            });
        } else {
            savingsContributionsCache = [];
        }

        console.log('🔄 Zaktualizowano wpłaty:', savingsContributionsCache.length);

        if (callbacks.onContributionsChange) {
            callbacks.onContributionsChange(savingsContributionsCache);
        }
    });
}

/**
 * Anuluje subskrypcje
 */
export function unsubscribeFromSavingsGoalsUpdates(userId) {
    if (!userId) return;

    console.log('🔕 Anulowanie subskrypcji celów oszczędzania');

    if (activeListeners.savingsGoals) {
        off(ref(db, `users/${userId}/budget/savingsGoals`));
        delete activeListeners.savingsGoals;
    }

    if (activeListeners.savingsContributions) {
        off(ref(db, `users/${userId}/budget/savingsContributions`));
        delete activeListeners.savingsContributions;
    }
}

/**
 * Czyści wszystkie cache
 */
export function clearSavingsGoalsCache() {
    savingsGoalsCache = [];
    savingsContributionsCache = [];
    console.log('🧹 Wyczyszczono cache celów oszczędzania');
}

/**
 * Pobiera statystyki celów
 */
export function getSavingsGoalsStats() {
    const goals = getSavingsGoals();
    const contributions = getSavingsContributions();

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const totalTargetAmount = activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalContributions = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const progressPercentage = totalTargetAmount > 0
        ? (totalCurrentAmount / totalTargetAmount) * 100
        : 0;

    return {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        totalTargetAmount,
        totalCurrentAmount,
        totalContributions,
        progressPercentage
    };
}
