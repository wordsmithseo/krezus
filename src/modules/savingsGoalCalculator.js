// src/modules/savingsGoalCalculator.js
import { getWarsawDateString } from '../utils/dateHelpers.js';
import { getExpenses, getIncomes } from './dataManager.js';
import { calculateAvailableFunds, calculateSpendingPeriods, calculatePlannedTransactionsTotals } from './budgetCalculator.js';
import { getSavingsGoals, getSavingsContributions } from './savingsGoalManager.js';

/**
 * KLUCZOWY ALGORYTM: Oblicza bezpieczną kwotę do oszczędzania dla danego celu
 *
 * Algorytm analizuje:
 * 1. Dostępne środki (available)
 * 2. Historyczne wzorce wydatków (30 dni)
 * 3. Moment miesiąca (ile dni do następnego przychodu)
 * 4. Planowane transakcje
 * 5. Priorytet celu
 *
 * UWAGA: Ten algorytm NIE MODYFIKUJE danych budżetowych!
 * Tylko czyta dane i oblicza sugestie.
 *
 * @param {string} goalId - ID celu oszczędzania
 * @returns {Object} - { canSuggest, amount, reason, details }
 */
export function calculateSafeSavingsAmount(goalId) {
    console.log('\n💰 === ALGORYTM SUGESTII OSZCZĘDZANIA ===');
    console.log('🎯 Cel ID:', goalId);

    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Cel nie został znaleziony',
            details: []
        };
    }

    console.log('📌 Cel:', goal.name);
    console.log('🎯 Docelowa kwota:', goal.targetAmount, 'zł');
    console.log('💰 Aktualnie odłożone:', goal.currentAmount, 'zł');

    // WARUNEK 1: Sprawdź czy cel jest aktywny
    if (goal.status !== 'active') {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Cel nie jest aktywny',
            details: ['Status celu: ' + goal.status]
        };
    }

    // WARUNEK 2: Sprawdź czy cel został już osiągnięty
    if (goal.currentAmount >= goal.targetAmount) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Cel został już osiągnięty! 🎉',
            details: [
                `Zebrano: ${goal.currentAmount.toFixed(2)} zł`,
                `Cel: ${goal.targetAmount.toFixed(2)} zł`
            ]
        };
    }

    const today = getWarsawDateString();

    // WARUNEK 3: Sprawdź czy była już sugestia dzisiaj
    if (goal.lastSuggestionDate === today && goal.suggestionStatus === 'pending') {
        return {
            canSuggest: false,
            amount: goal.lastSuggestionAmount || 0,
            reason: 'Sugestia już istnieje - oczekuje na decyzję',
            details: [
                `Sugerowana kwota: ${(goal.lastSuggestionAmount || 0).toFixed(2)} zł`,
                'Zaakceptuj lub odrzuć bieżącą sugestię'
            ]
        };
    }

    // WARUNEK 4: Oblicz dostępne środki
    const { available } = calculateAvailableFunds();
    console.log('💵 Dostępne środki (available):', available.toFixed(2), 'zł');

    if (available <= 0) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Brak dostępnych środków do oszczędzania',
            details: [
                `Dostępne środki: ${available.toFixed(2)} zł`,
                'Musisz mieć dodatni bilans, aby oszczędzać'
            ]
        };
    }

    // WARUNEK 5: Sprawdź okresy budżetowe i dni do końca
    const { periods } = calculateSpendingPeriods();
    const firstPeriod = periods[0];

    // ZMIANA: Używamy calendarDays zamiast daysLeft
    // calendarDays = 0 oznacza "wpływ jest dziś" (OK)
    // calendarDays < 0 oznacza "wpływ był wczoraj lub wcześniej" (NIE OK)
    if (!firstPeriod || firstPeriod.calendarDays < 0) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Brak zdefiniowanego okresu budżetowego',
            details: ['Dodaj planowane przychody, aby określić okresy budżetowe']
        };
    }

    // ZMIANA: Dla celów oszczędności używamy calendarDays (minimum 1 dzień, nawet gdy wpływ jest dziś)
    const daysLeft = Math.max(1, firstPeriod.calendarDays);
    console.log('📅 Dni do następnego przychodu (dla obliczeń):', daysLeft);
    console.log('📅 Pełne dni kalendarzowe:', firstPeriod.calendarDays);

    if (daysLeft < 7) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Za mało dni do końca okresu (minimum 7 dni)',
            details: [
                `Dni do następnego przychodu: ${daysLeft}`,
                'Algorytm sugeruje oszczędzanie tylko gdy zostało co najmniej 7 dni'
            ]
        };
    }

    // WARUNEK 6: Analiza historycznych wydatków (30 dni)
    const expenses = getExpenses();
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);

    const historicalExpenses = expenses.filter(e =>
        e.type === 'normal' &&
        e.date >= date30str &&
        e.date < today
    );

    console.log('📊 Liczba historycznych wydatków (30 dni):', historicalExpenses.length);

    if (historicalExpenses.length < 10) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Za mało danych historycznych do analizy',
            details: [
                `Transakcje w ostatnich 30 dniach: ${historicalExpenses.length}`,
                'Potrzeba minimum 10 transakcji, aby algorytm działał bezpiecznie'
            ]
        };
    }

    // Oblicz medianę dziennych wydatków
    const amounts = historicalExpenses.map(e => e.amount || 0).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const average = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

    console.log('📊 Mediana wydatków:', median.toFixed(2), 'zł');
    console.log('📊 Średnia wydatków:', average.toFixed(2), 'zł');

    // Oblicz dzienny średni wydatek (suma / 30 dni)
    const totalHistoricalExpenses = historicalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const dailyAverageExpense = totalHistoricalExpenses / 30;

    console.log('📊 Średnie dzienne wydatki (30 dni):', dailyAverageExpense.toFixed(2), 'zł');

    // WARUNEK 7: Sprawdź planowane wydatki do końca okresu
    const { periodTotals } = calculatePlannedTransactionsTotals();
    const plannedExpenses = periodTotals[0]?.futureExpense || 0;
    const plannedIncomes = periodTotals[0]?.futureIncome || 0;

    console.log('📤 Planowane wydatki (do końca okresu):', plannedExpenses.toFixed(2), 'zł');
    console.log('📥 Planowane przychody (do końca okresu):', plannedIncomes.toFixed(2), 'zł');

    // === GŁÓWNY ALGORYTM OBLICZANIA BEZPIECZNEJ KWOTY ===

    // KROK 1: Oblicz bufor bezpieczeństwa
    // Bufor = dni pozostałe * dzienny średni wydatek * współczynnik bezpieczeństwa (1.3 = 130%)
    const safetyMultiplier = 1.3; // 30% dodatkowego buforu
    const safetyBuffer = daysLeft * dailyAverageExpense * safetyMultiplier;

    console.log('🛡️ Bufor bezpieczeństwa (', daysLeft, 'dni ×', dailyAverageExpense.toFixed(2), 'zł × 1.3):', safetyBuffer.toFixed(2), 'zł');

    // KROK 2: Oblicz wymagane środki do końca okresu
    const requiredFunds = safetyBuffer + plannedExpenses;

    console.log('💼 Wymagane środki (bufor + planowane wydatki):', requiredFunds.toFixed(2), 'zł');

    // KROK 3: Oblicz potencjalną nadwyżkę (uwzględniając planowane przychody)
    const potentialSurplus = available + plannedIncomes - requiredFunds;

    console.log('💡 Potencjalna nadwyżka:', potentialSurplus.toFixed(2), 'zł');

    if (potentialSurplus <= 0) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Brak bezpiecznej nadwyżki do oszczędzania',
            details: [
                `Dostępne środki: ${available.toFixed(2)} zł`,
                `Wymagane środki (do końca okresu): ${requiredFunds.toFixed(2)} zł`,
                `Potencjalna nadwyżka: ${potentialSurplus.toFixed(2)} zł`,
                'Algorytm nie sugeruje oszczędzania, gdy może to zagrozić budżetowi'
            ]
        };
    }

    // KROK 4: Zastosuj limity bezpieczeństwa
    // Maksymalnie 20% dostępnych środków
    const maxPercentage = 0.20; // 20%
    const maxAmount = available * maxPercentage;

    // Minimalna kwota do sugestii: 10 zł
    const minSuggestion = 10;

    // Bazowa sugestia = 50% potencjalnej nadwyżki (zachowawcze podejście)
    let suggestedAmount = potentialSurplus * 0.5;

    // Ogranicz do max 20% available
    suggestedAmount = Math.min(suggestedAmount, maxAmount);

    // Uwzględnij priorytet celu
    const priorityMultipliers = {
        1: 1.2,  // Wysoki priorytet: +20%
        2: 1.0,  // Średni priorytet: bez zmiany
        3: 0.8   // Niski priorytet: -20%
    };

    const priorityMultiplier = priorityMultipliers[goal.priority] || 1.0;
    suggestedAmount = suggestedAmount * priorityMultiplier;

    console.log('🎯 Priorytet celu:', goal.priority, '(mnożnik:', priorityMultiplier, ')');
    console.log('💰 Sugerowana kwota (po uwzględnieniu priorytetu):', suggestedAmount.toFixed(2), 'zł');

    // Uwzględnij deadline (targetDate)
    let deadlineMultiplier = 1.0;
    let daysToDeadline = null;

    if (goal.targetDate) {
        const targetDateObj = new Date(goal.targetDate);
        const todayObj = new Date(today);
        daysToDeadline = Math.max(0, Math.floor((targetDateObj - todayObj) / (1000 * 60 * 60 * 24)));

        console.log('📅 Data końcowa celu:', goal.targetDate);
        console.log('📅 Dni do deadline:', daysToDeadline);

        if (daysToDeadline < 7) {
            deadlineMultiplier = 1.8; // +80% - bardzo blisko deadline!
            console.log('⏰ PILNE! Zostało mniej niż 7 dni do deadline!');
        } else if (daysToDeadline < 15) {
            deadlineMultiplier = 1.5; // +50% - blisko deadline
            console.log('⏰ Blisko deadline (< 15 dni)');
        } else if (daysToDeadline < 30) {
            deadlineMultiplier = 1.3; // +30% - zbliża się deadline
            console.log('⏰ Zbliża się deadline (< 30 dni)');
        } else if (daysToDeadline < 60) {
            deadlineMultiplier = 1.15; // +15% - umiarkowanie blisko
            console.log('⏰ Umiarkowanie blisko deadline (< 60 dni)');
        } else {
            deadlineMultiplier = 1.0; // bez zmiany - dużo czasu
            console.log('✅ Dużo czasu do deadline (≥ 60 dni)');
        }

        suggestedAmount = suggestedAmount * deadlineMultiplier;
        console.log('🎯 Mnożnik deadline:', deadlineMultiplier);
        console.log('💰 Sugerowana kwota (po uwzględnieniu deadline):', suggestedAmount.toFixed(2), 'zł');
    }

    // KROK 5: Zaokrąglij do pełnych złotych
    suggestedAmount = Math.floor(suggestedAmount);

    // Sprawdź minimum
    if (suggestedAmount < minSuggestion) {
        return {
            canSuggest: false,
            amount: 0,
            reason: 'Bezpieczna kwota jest zbyt mała',
            details: [
                `Obliczona bezpieczna kwota: ${suggestedAmount.toFixed(2)} zł`,
                `Minimalna kwota sugestii: ${minSuggestion} zł`,
                'Poczekaj na lepszy moment finansowy'
            ]
        };
    }

    // Ogranicz do pozostałej kwoty celu
    const remainingToGoal = goal.targetAmount - goal.currentAmount;
    suggestedAmount = Math.min(suggestedAmount, remainingToGoal);

    console.log('✅ === KOŃCOWA SUGESTIA ===');
    console.log('💰 Kwota do odłożenia:', suggestedAmount.toFixed(2), 'zł');
    console.log('🎯 Pozostało do celu:', remainingToGoal.toFixed(2), 'zł');
    console.log('💵 Po odłożeniu zostanie:', (available - suggestedAmount).toFixed(2), 'zł');
    console.log('📊 To', ((suggestedAmount / available) * 100).toFixed(1), '% dostępnych środków');

    // Buduj details z uwzględnieniem deadline
    const details = [
        `💰 Dostępne środki: ${available.toFixed(2)} zł`,
        `🛡️ Bufor bezpieczeństwa: ${safetyBuffer.toFixed(2)} zł`,
        `📤 Planowane wydatki: ${plannedExpenses.toFixed(2)} zł`,
        `💡 Potencjalna nadwyżka: ${potentialSurplus.toFixed(2)} zł`,
        `📊 Sugerowana kwota: ${suggestedAmount.toFixed(2)} zł (${((suggestedAmount / available) * 100).toFixed(1)}% dostępnych środków)`,
        `🎯 Po odłożeniu zostanie: ${(available - suggestedAmount).toFixed(2)} zł`,
        `📅 Dni do następnego przychodu: ${daysLeft}`,
        `📈 Średnie dzienne wydatki (30 dni): ${dailyAverageExpense.toFixed(2)} zł`
    ];

    // Dodaj informację o deadline jeśli istnieje
    if (goal.targetDate && daysToDeadline !== null) {
        if (daysToDeadline < 7) {
            details.push(`⏰ PILNE! Deadline za ${daysToDeadline} dni! (${goal.targetDate})`);
        } else if (daysToDeadline < 30) {
            details.push(`⏰ Deadline zbliża się: ${daysToDeadline} dni (${goal.targetDate})`);
        } else {
            details.push(`📅 Deadline: ${daysToDeadline} dni (${goal.targetDate})`);
        }
        details.push(`🚀 Kwota zwiększona o ${((deadlineMultiplier - 1) * 100).toFixed(0)}% z powodu deadline`);
    }

    return {
        canSuggest: true,
        amount: suggestedAmount,
        reason: 'Bezpieczna kwota obliczona przez algorytm',
        details,
        calculation: {
            available,
            safetyBuffer,
            plannedExpenses,
            plannedIncomes,
            potentialSurplus,
            maxAmount,
            suggestedAmount,
            remainingAfterSaving: available - suggestedAmount,
            daysLeft,
            dailyAverageExpense,
            priorityMultiplier,
            deadlineMultiplier,
            daysToDeadline
        }
    };
}

/**
 * Oblicza sugestie dla wszystkich aktywnych celów
 * @returns {Array} - Tablica z sugestiami dla każdego celu
 */
export function calculateAllSuggestions() {
    console.log('\n🎯 === OBLICZANIE SUGESTII DLA WSZYSTKICH CELÓW ===');

    const goals = getSavingsGoals();
    const activeGoals = goals.filter(g => g.status === 'active');

    console.log('📊 Liczba aktywnych celów:', activeGoals.length);

    if (activeGoals.length === 0) {
        return [];
    }

    const suggestions = activeGoals.map(goal => {
        const suggestion = calculateSafeSavingsAmount(goal.id);
        return {
            goal,
            suggestion
        };
    });

    // Sortuj według priorytetu (1 = najwyższy) i kwoty sugestii
    suggestions.sort((a, b) => {
        if (a.goal.priority !== b.goal.priority) {
            return a.goal.priority - b.goal.priority;
        }
        return b.suggestion.amount - a.suggestion.amount;
    });

    const canSuggestCount = suggestions.filter(s => s.suggestion.canSuggest).length;
    console.log('✅ Możliwe sugestie:', canSuggestCount, '/', activeGoals.length);

    return suggestions;
}

/**
 * Oblicza postęp dla danego celu
 * @param {string} goalId - ID celu
 * @returns {Object} - Postęp w %
 */
export function calculateGoalProgress(goalId) {
    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
        return {
            percentage: 0,
            remaining: 0,
            isComplete: false
        };
    }

    const percentage = goal.targetAmount > 0
        ? (goal.currentAmount / goal.targetAmount) * 100
        : 0;

    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

    return {
        percentage: Math.min(100, percentage),
        remaining,
        isComplete: goal.currentAmount >= goal.targetAmount
    };
}

/**
 * Oblicza historię wpłat dla danego celu
 * @param {string} goalId - ID celu
 * @returns {Array} - Historia wpłat
 */
export function getGoalContributionHistory(goalId) {
    const contributions = getSavingsContributions();
    return contributions.filter(c => c.goalId === goalId);
}

/**
 * Oblicza statystyki oszczędzania
 * @returns {Object} - Statystyki
 */
export function calculateSavingsStats() {
    const goals = getSavingsGoals();
    const contributions = getSavingsContributions();

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');

    const totalTargetAmount = activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalSaved = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);

    const progressPercentage = totalTargetAmount > 0
        ? (totalCurrentAmount / totalTargetAmount) * 100
        : 0;

    // Średnia kwota wpłaty
    const averageContribution = contributions.length > 0
        ? totalSaved / contributions.length
        : 0;

    // Najbliższy cel do ukończenia
    const nearestGoal = activeGoals
        .map(g => ({
            ...g,
            progress: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
        }))
        .sort((a, b) => b.progress - a.progress)[0];

    return {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        totalTargetAmount,
        totalCurrentAmount,
        totalSaved,
        progressPercentage,
        averageContribution,
        nearestGoal,
        totalContributions: contributions.length
    };
}

/**
 * Sprawdza czy dzisiaj jest dobry moment na oszczędzanie (globalnie)
 * @returns {Object} - Analiza momentu
 */
export function analyzeCurrentSavingsMoment() {
    const { available } = calculateAvailableFunds();
    const { periods } = calculateSpendingPeriods();
    const expenses = getExpenses();
    const today = getWarsawDateString();

    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);

    const historicalExpenses = expenses.filter(e =>
        e.type === 'normal' &&
        e.date >= date30str &&
        e.date < today
    );

    const firstPeriod = periods[0];
    const daysLeft = firstPeriod?.daysLeft || 0;

    if (available <= 0) {
        return {
            isGoodMoment: false,
            reason: 'Brak dostępnych środków',
            score: 0
        };
    }

    if (daysLeft < 7) {
        return {
            isGoodMoment: false,
            reason: 'Za mało dni do końca okresu budżetowego',
            score: 0
        };
    }

    if (historicalExpenses.length < 10) {
        return {
            isGoodMoment: false,
            reason: 'Za mało danych historycznych',
            score: 0
        };
    }

    // Oblicz score (0-100)
    let score = 50; // Bazowy score

    // Bonus za dużo dostępnych środków
    if (available > 1000) score += 20;
    else if (available > 500) score += 10;

    // Bonus za dużo dni do końca okresu
    if (daysLeft > 20) score += 20;
    else if (daysLeft > 14) score += 10;

    // Bonus za dużo danych historycznych
    if (historicalExpenses.length > 50) score += 10;
    else if (historicalExpenses.length > 30) score += 5;

    score = Math.min(100, score);

    return {
        isGoodMoment: score >= 60,
        reason: score >= 60 ? 'Dobry moment na oszczędzanie' : 'Lepiej poczekać',
        score,
        details: {
            available,
            daysLeft,
            historicalTransactions: historicalExpenses.length
        }
    };
}
