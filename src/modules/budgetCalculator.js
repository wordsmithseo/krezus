// src/modules/budgetCalculator.js
import { parseDateStr, getWarsawDateString, getCurrentTimeString, isRealised, calculateRemainingTime } from '../utils/dateHelpers.js';
import { getIncomes, getExpenses, getEndDates, getSavingGoal, getEnvelopePeriod, getDynamicsPeriod, getDailyEnvelope, saveDailyEnvelope } from './dataManager.js';

// === CACHE LIMITÓW DZIENNYCH ===
const LIMITS_CACHE_KEY = 'krezus_daily_limits_cache';

/**
 * Zapisuje limity w cache z timestamp ustawionym na północ
 */
function saveLimitsCache(limits, plannedTotals) {
    const today = getWarsawDateString();
    // Ustaw timestamp na północ dzisiejszego dnia (00:00:00)
    const midnightTimestamp = new Date(today + 'T00:00:00+01:00').toISOString();

    const cache = {
        limits,
        plannedTotals,
        calculatedAt: midnightTimestamp,
        calculatedDate: today
    };
    localStorage.setItem(LIMITS_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Pobiera limity z cache jeśli są aktualne (z dzisiaj)
 */
function getLimitsCache() {
    try {
        const cached = localStorage.getItem(LIMITS_CACHE_KEY);
        if (!cached) return null;

        const cache = JSON.parse(cached);
        const today = getWarsawDateString();

        // Sprawdź czy cache jest z dzisiaj
        if (cache.calculatedDate !== today) {
            return null;
        }

        // Sprawdź czy cache ma nową strukturę z realLimit i plannedLimit
        if (!cache.limits || !Array.isArray(cache.limits.limits)) {
            return null;
        }

        const firstLimit = cache.limits.limits[0];
        if (firstLimit && (firstLimit.realLimit === undefined || firstLimit.plannedLimit === undefined)) {
            return null;
        }

        // NOWE: Sprawdź czy cache ma pola czasu (totalDays, timeFormatted, calendarDays, seconds, countdownFormat, showToday)
        if (firstLimit && (firstLimit.totalDays === undefined || firstLimit.timeFormatted === undefined || firstLimit.calendarDays === undefined || firstLimit.seconds === undefined || firstLimit.showToday === undefined)) {
            return null;
        }

        return cache;
    } catch (e) {
        console.error('Błąd odczytu cache limitów:', e);
        return null;
    }
}

/**
 * Czyści cache limitów
 */
export function clearLimitsCache() {
    localStorage.removeItem(LIMITS_CACHE_KEY);
}

export function calculateRealisedTotals(dateStr = null) {
    const today = dateStr || getWarsawDateString();

    const incomes = getIncomes();
    const expenses = getExpenses();

    let sumIncome = 0;
    let sumExpense = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            sumIncome += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= today) {
            sumExpense += exp.amount || 0;
        }
    });

    return { sumIncome, sumExpense };
}

export function getTodayExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    return expenses
        .filter(e => e.type === 'normal' && e.date === today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function getWeekExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + diff);
    const weekStartStr = getWarsawDateString(weekStart);
    
    return expenses
        .filter(e => e.type === 'normal' && e.date >= weekStartStr && e.date <= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function getMonthExpenses() {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    
    const todayDate = new Date(today);
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const monthStartStr = getWarsawDateString(monthStart);
    
    return expenses
        .filter(e => e.type === 'normal' && e.date >= monthStartStr && e.date <= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
}

/**
 * Pobiera następne daty planowanych przychodów (automatyczne wyznaczanie okresów budżetowych)
 * Zwraca WSZYSTKIE daty planowanych wpływów (bez limitu) wraz z nazwami
 */
function getNextPlannedIncomeDates() {
    const incomes = getIncomes();
    const today = getWarsawDateString();

    // Filtruj planowane przychody od dzisiaj w przyszłość
    const plannedIncomes = incomes
        .filter(inc => inc.type === 'planned' && inc.date >= today)
        .map(inc => ({
            date: inc.date,
            time: inc.time || null,  // NOWE: zachowaj czas wpływu (null jeśli nie podano)
            name: inc.source || 'Bez nazwy',
            amount: inc.amount || 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sortuj chronologicznie

    // Usuń duplikaty po dacie (jeśli kilka wpływów w tym samym dniu, zsumuj kwoty)
    const uniqueIncomes = [];
    const seenDates = new Map();

    for (const income of plannedIncomes) {
        if (!seenDates.has(income.date)) {
            seenDates.set(income.date, income);
            uniqueIncomes.push(income);
        } else {
            // Jeśli ta data już istnieje, dodaj amount do istniejącego wpływu
            const existing = seenDates.get(income.date);
            existing.amount += income.amount;

            // NOWE: Jeśli nowy wpływ ma czas, a istniejący nie - użyj nowego czasu
            // Jeśli oba mają czasy, wybierz wcześniejszy
            if (income.time) {
                if (!existing.time || income.time < existing.time) {
                    existing.time = income.time;
                }
            }
        }
    }

    return uniqueIncomes;
}

export function calculateSpendingPeriods() {
    // ZMIANA: Używamy automatycznych dat z planowanych przychodów zamiast manualnych z ustawień
    const incomes = getNextPlannedIncomeDates();
    const today = getWarsawDateString();

    // Oblicz dni pozostałe dla każdej daty
    const periods = incomes.map(income => {
        // ZMIANA: Przekazuj czas wpływu (jeśli został podany) do calculateRemainingTime
        const timeInfo = calculateRemainingTime(income.date, income.time);

        // Dla zgodności wstecznej, zachowujemy daysLeft jako liczbę całkowitą
        const daysLeft = timeInfo.days;

        // Dodajemy nowe pola dla dokładniejszych obliczeń
        return {
            date: income.date,
            time: income.time,  // NOWE: czas wpływu (może być null)
            name: income.name,
            amount: income.amount,
            daysLeft,  // Liczba całkowita dni (dla wyświetlania)
            totalDays: timeInfo.totalDays,  // Zmiennoprzecinkowa liczba dni (dokładny czas, dla wyświetlania)
            calendarDays: timeInfo.calendarDays,  // Pełne dni kalendarzowe (dla obliczeń limitów)
            hours: timeInfo.hours,
            minutes: timeInfo.minutes,
            seconds: timeInfo.seconds,  // NOWE: sekundy dla countdown timera
            timeFormatted: timeInfo.formatted,  // Sformatowany tekst czasu
            countdownFormat: timeInfo.countdownFormat,  // NOWE: format HH:MM:SS dla countdown (null gdy >= 1 dzień)
            showToday: timeInfo.showToday  // NOWE: true gdy należy pokazać "Dziś"
        };
    });

    // BACKWARD COMPATIBILITY: Zwracamy także date1/date2 dla starszego kodu
    return {
        periods,  // Nowa tablica okresów
        date1: periods[0]?.date || '',
        date2: periods[1]?.date || '',
        daysLeft1: periods[0]?.daysLeft || 0,
        daysLeft2: periods[1]?.daysLeft || 0
    };
}

export function calculateAvailableFunds() {
    const { sumIncome, sumExpense } = calculateRealisedTotals();
    const savingGoal = getSavingGoal();
    const totalAvailable = sumIncome - sumExpense;
    const available = totalAvailable - savingGoal;

    return {
        available,
        totalAvailable,
        savingsAmount: savingGoal
    };
}

export function calculateCurrentLimits() {
    const { available } = calculateAvailableFunds();
    const toSpend = available;
    const spendingPeriods = calculateSpendingPeriods();
    const { periods, date1, date2, daysLeft1, daysLeft2 } = spendingPeriods;
    const plannedTotals = calculatePlannedTransactionsTotals();

    // Oblicz limity dla wszystkich okresów
    const limits = periods.map((period, index) => {
        // ZMIANA: Używamy calendarDays (pełne dni kalendarzowe) dla obliczeń limitów
        // Jeśli calendarDays < 0 (wpływ był wczoraj lub wcześniej), zwracamy limity = 0
        if (period.calendarDays < 0) {
            return {
                date: period.date,
                time: period.time,
                name: period.name,
                amount: period.amount,
                daysLeft: period.daysLeft,
                hours: period.hours,
                minutes: period.minutes,
                seconds: period.seconds,
                timeFormatted: period.timeFormatted,
                countdownFormat: period.countdownFormat,
                showToday: period.showToday,
                totalDays: period.totalDays,
                calendarDays: period.calendarDays,
                realLimit: 0,
                plannedLimit: 0
            };
        }

        // Dla obliczeń limitów: używamy minimum 1 dzień (gdy calendarDays = 0, traktuj jako 1 dzień)
        // Gdy wpływ jest dzisiaj (calendarDays = 0), nadal mamy dzień dzisiejszy do wydawania
        const daysForCalculation = Math.max(1, period.calendarDays);

        const periodTotal = plannedTotals.periodTotals[index];
        const futureIncome = periodTotal?.futureIncome || 0;
        const futureExpense = periodTotal?.futureExpense || 0;

        // Limit realny = available / totalDays (BEZ dnia wpływu)
        const realLimit = Math.max(0, available / daysForCalculation);

        // Limit planowany = (available + futureIncome - futureExpense) / totalDays (BEZ dnia wpływu)
        const plannedLimit = Math.max(0, (available + futureIncome - futureExpense) / daysForCalculation);

        return {
            date: period.date,
            time: period.time,
            name: period.name,
            amount: period.amount, // Kwota planowanego przychodu
            daysLeft: period.daysLeft,
            hours: period.hours,
            minutes: period.minutes,
            seconds: period.seconds,
            timeFormatted: period.timeFormatted,
            countdownFormat: period.countdownFormat,
            showToday: period.showToday,
            totalDays: period.totalDays,
            calendarDays: period.calendarDays,
            realLimit: realLimit, // Limit realny bez modyfikatorów
            plannedLimit: plannedLimit // Limit planowany z przyszłymi transakcjami
        };
    });

    // BACKWARD COMPATIBILITY: Zachowaj stare pola dla zgodności
    return {
        limits,  // Nowa tablica limitów dla wszystkich okresów
        currentLimit1: limits[0]?.realLimit || 0,
        currentLimit2: limits[1]?.realLimit || 0,
        daysLeft1,
        daysLeft2,
        date1,
        date2
    };
}

export function calculatePlannedTransactionsTotals() {
    const incomes = getIncomes();
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const { periods, date1, date2 } = calculateSpendingPeriods();

    const plannedIncomes = incomes.filter(inc => inc.type === 'planned');

    // Oblicz sumy dla wszystkich okresów
    const periodTotals = periods.map((period, index) => {
        let futureIncome = 0;
        let futureExpense = 0;

        if (period.date && period.date.trim() !== '') {
            incomes.forEach(inc => {
                if (inc.type === 'planned' && inc.date >= today && inc.date < period.date) {
                    futureIncome += inc.amount || 0;
                }
            });

            expenses.forEach(exp => {
                if (exp.type === 'planned' && exp.date >= today && exp.date < period.date) {
                    futureExpense += exp.amount || 0;
                }
            });

        }

        return {
            date: period.date,
            futureIncome,
            futureExpense
        };
    });

    // BACKWARD COMPATIBILITY: Zachowaj stare pola dla zgodności
    return {
        periodTotals,  // Nowa tablica sum dla wszystkich okresów
        futureIncome1: periodTotals[0]?.futureIncome || 0,
        futureExpense1: periodTotals[0]?.futureExpense || 0,
        futureIncome2: periodTotals[1]?.futureIncome || 0,
        futureExpense2: periodTotals[1]?.futureExpense || 0
    };
}

/**
 * Pobiera lub oblicza limity z cache
 * Limity są obliczane raz dziennie i cache'owane
 */
export function getOrCalculateLimits() {
    // Sprawdź cache
    const cached = getLimitsCache();
    if (cached) {
        return {
            limits: cached.limits,
            plannedTotals: cached.plannedTotals,
            calculatedAt: cached.calculatedAt
        };
    }

    // Oblicz na nowo
    const limits = calculateCurrentLimits();
    const plannedTotals = calculatePlannedTransactionsTotals();

    // Zapisz w cache
    saveLimitsCache(limits, plannedTotals);

    return {
        limits,
        plannedTotals,
        calculatedAt: new Date().toISOString()
    };
}

export function computeSourcesRemaining() {
    const incomes = getIncomes();
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const sourcesMap = new Map();
    
    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            const src = inc.source || 'Brak źródła';
            sourcesMap.set(src, (sourcesMap.get(src) || 0) + (inc.amount || 0));
        }
    });
    
    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= today) {
            const src = exp.source || 'Brak źródła';
            sourcesMap.set(src, (sourcesMap.get(src) || 0) - (exp.amount || 0));
        }
    });
    
    return Array.from(sourcesMap.entries()).map(([name, amount]) => ({
        name,
        amount
    }));
}

export function getGlobalMedian30d() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const last30 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today
    );
    
    if (last30.length === 0) return 0;
    
    const amounts = last30.map(e => e.amount || 0).sort((a,b) => a-b);
    return amounts[Math.floor(amounts.length / 2)];
}

/**
 * Oblicza historię dziennych przekroczeń koperty z ostatnich N dni
 * Używane do korekty przyszłych limitów
 */
function calculateOverrunHistory(expenses, incomes, targetDate, daysBack = 14) {
    const overruns = [];
    const d = new Date(targetDate);

    for (let i = 1; i <= daysBack; i++) {
        const checkDate = new Date(d);
        checkDate.setDate(d.getDate() - i);
        const dateStr = getWarsawDateString(checkDate);

        const dayExpenses = expenses
            .filter(e => e.type === 'normal' && e.date === dateStr)
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const dayIncomes = incomes
            .filter(inc => inc.type === 'normal' && inc.date === dateStr)
            .reduce((sum, inc) => sum + (inc.amount || 0), 0);

        overruns.push({
            date: dateStr,
            spent: dayExpenses,
            received: dayIncomes
        });
    }
    return overruns;
}

/**
 * Oblicza wzorzec wydatków wg dnia tygodnia (pon=1, ndz=7)
 * Zwraca mnożnik: >1 = dzień, w którym zwykle wydaje się więcej, <1 = mniej
 */
function getDayOfWeekPattern(expenses, targetDate) {
    const d60 = new Date(targetDate);
    d60.setDate(d60.getDate() - 60);
    const date60str = getWarsawDateString(d60);

    const relevantExpenses = expenses.filter(e =>
        e.type === 'normal' && e.date >= date60str && e.date < targetDate
    );

    if (relevantExpenses.length < 14) return 1.0; // Za mało danych

    // Grupuj wydatki wg dnia tygodnia
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // 0=niedz, 1=pon, ..., 6=sob
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    relevantExpenses.forEach(e => {
        const dayOfWeek = new Date(e.date).getDay();
        dayTotals[dayOfWeek] += e.amount || 0;
        dayCounts[dayOfWeek]++;
    });

    const dayAverages = dayTotals.map((total, i) =>
        dayCounts[i] > 0 ? total / dayCounts[i] : 0
    );

    const overallAvg = dayAverages.reduce((a, b) => a + b, 0) / 7;
    if (overallAvg === 0) return 1.0;

    const todayDayOfWeek = new Date(targetDate).getDay();
    const todayAvg = dayAverages[todayDayOfWeek];

    // Mnożnik: jeśli w ten dzień tygodnia zwykle wydaje się 150% średniej, zwróć 1.5
    // Ograniczamy do zakresu 0.5 - 1.8 żeby uniknąć ekstremalnych wartości
    return Math.max(0.5, Math.min(1.8, todayAvg / overallAvg));
}

/**
 * Główna funkcja obliczania koperty dnia
 * Inteligentny algorytm bazujący na:
 * - Dostępnych środkach i dniach do następnego wpływu
 * - Historycznych wzorcach wydatków (60 dni)
 * - Wzorcach dnia tygodnia
 * - Planowanych wydatkach w okresie
 * - Historii przekroczeń koperty
 * - NIGDY nie przekracza faktycznie dostępnych środków
 *
 * forceRecalc=true wymusza pełne przeliczenie (np. po synchronizacji, nowym przychodzie)
 */
export async function updateDailyEnvelope(forDate = null, forceRecalc = false) {
    const targetDate = forDate || getWarsawDateString();

    const expenses = getExpenses();
    const incomes = getIncomes();

    // Oblicz dzisiejsze wydatki
    const todayExpenses = expenses.filter(exp =>
        exp.date === targetDate && exp.type === 'normal'
    );
    const todayExpensesSum = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const existing = getDailyEnvelope();

    // Sprawdź czy koperta została już dziś przeliczona
    // ZMIANA: forceRecalc wymusza pełne przeliczenie (np. po synchronizacji, nowym przychodzie)
    if (!forceRecalc && existing && existing.date === targetDate && existing.calculatedDate === targetDate) {
        const updatedEnvelope = {
            ...existing,
            spent: todayExpensesSum
        };

        await saveDailyEnvelope(targetDate, updatedEnvelope);
        return updatedEnvelope;
    }

    // === PEŁNE PRZELICZENIE INTELIGENTNEJ KOPERTY ===

    // 1. Oblicz dostępne środki (przychody - wydatki do dzisiaj włącznie)
    let sumIncomeUpToToday = 0;
    let sumExpenseUpToToday = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= targetDate) {
            sumIncomeUpToToday += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= targetDate) {
            sumExpenseUpToToday += exp.amount || 0;
        }
    });

    // Odejmij dzisiejsze wydatki - bo koperta je doliczy osobno jako "spent"
    sumExpenseUpToToday -= todayExpensesSum;

    const savingGoal = getSavingGoal();
    const totalAvailable = sumIncomeUpToToday - sumExpenseUpToToday - savingGoal;

    // Faktycznie dostępne środki po odjęciu dzisiejszych wydatków
    const availableAfterTodaySpending = totalAvailable - todayExpensesSum;

    // 2. Pobierz okres budżetowy
    const { periods } = calculateSpendingPeriods();
    const envelopePeriodIndex = getEnvelopePeriod();
    const selectedPeriod = periods[envelopePeriodIndex] || periods[0];

    let smartLimit = 0;
    let algorithmMode = 'none';

    if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
        smartLimit = 0;
        algorithmMode = 'no-period';
    } else if (totalAvailable <= 0) {
        smartLimit = 0;
        algorithmMode = 'no-funds';
    } else {
        const daysForCalculation = Math.max(1, selectedPeriod.calendarDays);

        // 3. Bazowy limit dzienny = dostępne / dni
        const baseDailyLimit = totalAvailable / daysForCalculation;

        // 4. Oblicz planowane wydatki do końca okresu
        const plannedExpensesInPeriod = expenses
            .filter(e => e.type === 'planned' && e.date >= targetDate && e.date <= selectedPeriod.date)
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        // Dostępne po odjęciu planowanych wydatków
        const availableAfterPlanned = totalAvailable - plannedExpensesInPeriod;
        const adjustedDailyLimit = Math.max(0, availableAfterPlanned / daysForCalculation);

        // 5. Analiza historyczna (60 dni) - mediana i średnia
        const d60 = new Date(targetDate);
        d60.setDate(d60.getDate() - 60);
        const date60str = getWarsawDateString(d60);

        const historicalExpenses = expenses.filter(e =>
            e.type === 'normal' && e.date >= date60str && e.date < targetDate
        );

        // 6. Wzorzec dnia tygodnia
        const dayOfWeekMultiplier = getDayOfWeekPattern(expenses, targetDate);

        // 7. Historia przekroczeń koperty (14 dni)
        const overrunHistory = calculateOverrunHistory(expenses, incomes, targetDate, 14);
        const recentOverruns = overrunHistory.filter(d => d.spent > baseDailyLimit);
        const overrunPenalty = recentOverruns.length > 0
            ? Math.max(0.85, 1 - (recentOverruns.length * 0.02))
            : 1.0;

        // 8. Oblicz inteligentny limit
        if (historicalExpenses.length >= 10) {
            // Tryb pełny - dużo historii
            algorithmMode = 'full';

            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a, b) => a - b);
            const median = amounts[Math.floor(amounts.length / 2)];

            // Grupuj wydatki po dniach i oblicz medianę dzienną
            const dailySpending = {};
            historicalExpenses.forEach(e => {
                dailySpending[e.date] = (dailySpending[e.date] || 0) + (e.amount || 0);
            });
            const dailyTotals = Object.values(dailySpending).sort((a, b) => a - b);
            const dailyMedian = dailyTotals.length > 0
                ? dailyTotals[Math.floor(dailyTotals.length / 2)]
                : median;

            // Bazowa propozycja: ważona kombinacja limitu budżetowego i mediany dziennej
            let proposed;
            if (dailyMedian > adjustedDailyLimit * 1.3) {
                // Historyczne wydatki powyżej limitu - tryb ostrożny
                proposed = adjustedDailyLimit * 0.9;
            } else if (dailyMedian < adjustedDailyLimit * 0.4) {
                // Historyczne wydatki znacznie poniżej limitu - tryb zbliżony do limitu
                proposed = adjustedDailyLimit * 0.85;
            } else {
                // Zbalansowany: 35% mediana dzienna + 65% limit budżetowy
                proposed = (dailyMedian * 0.35 + adjustedDailyLimit * 0.65);
            }

            // Zastosuj wzorzec dnia tygodnia (delikatnie: max ±15%)
            const dowAdjustment = 1 + (dayOfWeekMultiplier - 1) * 0.3;
            proposed *= dowAdjustment;

            // Zastosuj karę za przekroczenia
            proposed *= overrunPenalty;

            smartLimit = proposed;
        } else if (historicalExpenses.length >= 5) {
            // Tryb ograniczony - trochę historii
            algorithmMode = 'limited';

            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a, b) => a - b);
            const median = amounts[Math.floor(amounts.length / 2)];

            let proposed;
            if (median > adjustedDailyLimit * 1.5) {
                proposed = adjustedDailyLimit * 0.85;
            } else if (median < adjustedDailyLimit * 0.3) {
                proposed = adjustedDailyLimit * 0.75;
            } else {
                proposed = (median * 0.3 + adjustedDailyLimit * 0.7);
            }

            proposed *= overrunPenalty;
            smartLimit = proposed;
        } else {
            // Tryb konserwatywny - za mało historii
            algorithmMode = 'conservative';
            smartLimit = adjustedDailyLimit * 0.8;
        }

        // 9. KLUCZOWE OGRANICZENIE: koperta NIGDY nie może przekraczać dostępnych środków
        smartLimit = Math.max(0, Math.min(smartLimit, totalAvailable, availableAfterTodaySpending + todayExpensesSum));

        // Jeśli smartLimit przekracza bazowy limit dzienny (np. przez wzorzec dnia),
        // ogranicz do 120% bazowego limitu - nie może być dużo większy
        smartLimit = Math.min(smartLimit, baseDailyLimit * 1.2);

        // Ostateczne ograniczenie do dostępnych środków
        smartLimit = Math.max(0, Math.min(smartLimit, totalAvailable));
    }

    // Informacja o okresie do zapisu
    const periodInfo = selectedPeriod ? {
        name: selectedPeriod.name,
        date: selectedPeriod.date,
        time: selectedPeriod.time,
        daysLeft: selectedPeriod.daysLeft,
        hours: selectedPeriod.hours,
        minutes: selectedPeriod.minutes,
        seconds: selectedPeriod.seconds,
        timeFormatted: selectedPeriod.timeFormatted,
        countdownFormat: selectedPeriod.countdownFormat,
        showToday: selectedPeriod.showToday,
        totalDays: selectedPeriod.totalDays,
        calendarDays: selectedPeriod.calendarDays
    } : null;

    const now = new Date();
    const calculatedAtTimestamp = now.toISOString();

    const envelope = {
        date: targetDate,
        baseAmount: smartLimit,
        additionalFunds: 0,
        totalAmount: smartLimit,
        spent: todayExpensesSum,
        period: periodInfo,
        algorithmMode,
        calculatedDate: targetDate,
        calculatedAt: calculatedAtTimestamp
    };

    await saveDailyEnvelope(targetDate, envelope);

    return envelope;
}

/**
 * Awaryjne przeliczenie koperty (po synchronizacji, nowym przychodzie, etc.)
 * Wymusza pełne przeliczenie bez resetowania daty
 */
export async function recalculateEnvelope() {
    return updateDailyEnvelope(null, true);
}

export function getEnvelopeCalculationInfo() {
    const envelope = getDailyEnvelope();
    const { periods } = calculateSpendingPeriods();
    const envelopePeriodIndex = getEnvelopePeriod();
    const selectedPeriod = periods[envelopePeriodIndex] || periods[0];

    if (!envelope) {
        if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
            return {
                description: 'Brak wybranego okresu',
                formula: 'Wybierz okres w ustawieniach'
            };
        }
        return null;
    }

    const expenses = getExpenses();
    const incomes = getIncomes();
    const today = getWarsawDateString();

    // Oblicz dostępne środki (przychody - wydatki do dziś włącznie, bez dzisiejszych wydatków)
    const todayExpensesSum = expenses
        .filter(e => e.type === 'normal' && e.date === today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    let sumIncomeUpToToday = 0;
    let sumExpenseUpToToday = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date <= today) {
            sumIncomeUpToToday += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date <= today) {
            sumExpenseUpToToday += exp.amount || 0;
        }
    });

    sumExpenseUpToToday -= todayExpensesSum;
    const savingGoal = getSavingGoal();
    const totalAvailable = sumIncomeUpToToday - sumExpenseUpToToday - savingGoal;

    let description = '';
    let formula = '';

    if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
        description = 'Brak wybranego okresu';
        formula = 'Wybierz okres w ustawieniach';
    } else if (totalAvailable <= 0) {
        description = 'Brak środków do wydania';
        formula = `Dostępne środki: ${totalAvailable.toFixed(2)} zł`;
    } else {
        const daysForCalculation = Math.max(1, selectedPeriod.calendarDays);
        const baseDailyLimit = totalAvailable / daysForCalculation;
        const limitSource = `${selectedPeriod.name} (${selectedPeriod.timeFormatted})`;

        // Planowane wydatki w okresie
        const plannedExpensesInPeriod = expenses
            .filter(e => e.type === 'planned' && e.date >= today && e.date <= selectedPeriod.date)
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const adjustedAvailable = totalAvailable - plannedExpensesInPeriod;
        const adjustedDailyLimit = Math.max(0, adjustedAvailable / daysForCalculation);

        // Dane historyczne
        const d60 = new Date(today);
        d60.setDate(d60.getDate() - 60);
        const date60str = getWarsawDateString(d60);
        const historicalExpenses = expenses.filter(e =>
            e.type === 'normal' && e.date >= date60str && e.date < today
        );

        const mode = envelope.algorithmMode || 'unknown';
        const baseInfo = `Dostępne: ${totalAvailable.toFixed(2)} zł / ${daysForCalculation} dni (${limitSource})`;
        const plannedInfo = plannedExpensesInPeriod > 0
            ? ` | Planowane wydatki: -${plannedExpensesInPeriod.toFixed(2)} zł`
            : '';

        if (mode === 'full') {
            const dailySpending = {};
            historicalExpenses.forEach(e => {
                dailySpending[e.date] = (dailySpending[e.date] || 0) + (e.amount || 0);
            });
            const dailyTotals = Object.values(dailySpending).sort((a, b) => a - b);
            const dailyMedian = dailyTotals.length > 0
                ? dailyTotals[Math.floor(dailyTotals.length / 2)]
                : 0;

            description = `Algorytm pełny (${historicalExpenses.length} transakcji z 60 dni)`;
            formula = `${baseInfo}${plannedInfo}. Mediana dzienna: ${dailyMedian.toFixed(2)} zł. Limit bazowy: ${baseDailyLimit.toFixed(2)} zł/dzień. Uwzgl. wzorzec dnia tygodnia i historię przekroczeń.`;
        } else if (mode === 'limited') {
            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a, b) => a - b);
            const median = amounts[Math.floor(amounts.length / 2)] || 0;

            description = `Algorytm ograniczony (${historicalExpenses.length} transakcji)`;
            formula = `${baseInfo}${plannedInfo}. Mediana transakcji: ${median.toFixed(2)} zł. Limit bazowy: ${baseDailyLimit.toFixed(2)} zł/dzień.`;
        } else {
            description = `Algorytm konserwatywny (za mało historii: ${historicalExpenses.length} transakcji)`;
            formula = `${baseInfo}${plannedInfo}. 80% limitu bazowego: ${(adjustedDailyLimit * 0.8).toFixed(2)} zł.`;
        }
    }

    return {
        description,
        formula
    };
}

export function calculateSpendingGauge() {
    const envelope = getDailyEnvelope();
    
    if (!envelope) {
        return {
            spent: 0,
            total: 0,
            percentage: 0,
            remaining: 0
        };
    }
    
    const spent = envelope.spent || 0;
    const total = envelope.totalAmount || 0;
    const percentage = total > 0 ? (spent / total) * 100 : 0;
    const remaining = Math.max(0, total - spent);
    
    return {
        spent,
        total,
        percentage: Math.min(100, percentage),
        remaining
    };
}

export function getTopCategories(limit = 5) {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const last30 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today
    );
    
    const catMap = new Map();
    
    last30.forEach(exp => {
        const cat = exp.category || 'Bez kategorii';
        catMap.set(cat, (catMap.get(cat) || 0) + (exp.amount || 0));
    });
    
    return Array.from(catMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}

export function getTopDescriptionsForCategory(categoryName, limit = 3) {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);
    
    const catExpenses = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        e.date <= today &&
        e.category === categoryName
    );
    
    const descMap = new Map();
    
    catExpenses.forEach(exp => {
        const desc = exp.description || 'Brak opisu';
        descMap.set(desc, (descMap.get(desc) || 0) + (exp.amount || 0));
    });
    
    return Array.from(descMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}

export function getTopSources(limit = 5) {
  const incomes = getIncomes();
  const today = getWarsawDateString();
  
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const date30str = getWarsawDateString(d30);
  
  const last30 = incomes.filter(i => 
    i.type === 'normal' && 
    i.date >= date30str && 
    i.date <= today
  );
  
  const srcMap = new Map();
  
  last30.forEach(inc => {
    const src = inc.source || 'Bez źródła';
    srcMap.set(src, (srcMap.get(src) || 0) + (inc.amount || 0));
  });
  
  return Array.from(srcMap.entries())
    .map(([name, amount]) => name)
    .sort((a, b) => {
      const aAmount = srcMap.get(a);
      const bAmount = srcMap.get(b);
      return bAmount - aAmount;
    })
    .slice(0, limit);
}

export function computeComparisons() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const date7str = getWarsawDateString(d7);
    
    const d14 = new Date();
    d14.setDate(d14.getDate() - 14);
    const date14str = getWarsawDateString(d14);
    
    const last7 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date7str && 
        e.date <= today
    );
    
    const prev7 = expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date14str && 
        e.date < date7str
    );
    
    const sum7 = last7.reduce((sum, e) => sum + (e.amount || 0), 0);
    const sum14 = prev7.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const avg7 = last7.length > 0 ? sum7 / last7.length : 0;
    const avg14 = prev7.length > 0 ? sum14 / prev7.length : 0;
    
    return {
        last7Days: sum7,
        prev7Days: sum14,
        avgLast7: avg7,
        avgPrev7: avg14,
        change: sum14 > 0 ? ((sum7 - sum14) / sum14) * 100 : 0
    };
}

export function calculateSpendingDynamics() {
    const expenses = getExpenses();
    const today = getWarsawDateString();
    const { periods } = calculateSpendingPeriods();
    const dynamicsPeriodIndex = getDynamicsPeriod();
    const selectedPeriod = periods[dynamicsPeriodIndex] || periods[0];
    const { available } = calculateAvailableFunds();
    const toSpend = available;
    const limitsData = calculateCurrentLimits();

    if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
        return {
            status: 'no-date',
            title: '⚠️ Brak wybranego okresu',
            summary: 'Aby zobaczyć analizę dynamiki wydatków, wybierz okres w ustawieniach.',
            details: [],
            recommendation: 'Przejdź do ustawień i wybierz okres dla dynamiki wydatków.'
        };
    }

    // ZMIANA: Używamy calendarDays (pełne dni kalendarzowe) dla obliczeń
    // Dla prognozy: minimum 1 dzień (gdy wpływ jest dzisiaj, prognozujemy dla dzisiejszego dnia)
    const activeDays = Math.max(1, selectedPeriod.calendarDays);

    // Dla obliczeń limitu dziennego: używamy minimum 1 dzień
    const daysForLimitCalculation = Math.max(1, selectedPeriod.calendarDays);

    // Znajdź limit dla wybranego okresu dynamiki
    const selectedLimit = limitsData.limits[dynamicsPeriodIndex] || limitsData.limits[0];

    // Użyj realnego limitu dziennego - dynamika bazuje na rzeczywistych możliwościach
    let targetDaily = selectedLimit?.realLimit || 0;

    // Jeśli limit jest 0 a są środki dostępne, oblicz limit bezpośrednio
    if (targetDaily === 0 && toSpend > 0 && selectedPeriod.calendarDays >= 0) {
        targetDaily = toSpend / daysForLimitCalculation;
    }

    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const date7str = getWarsawDateString(d7);

    const last7 = expenses.filter(e =>
        e.type === 'normal' &&
        e.date >= date7str &&
        e.date <= today
    );

    if (last7.length === 0) {
        return {
            status: 'excellent',
            title: '🎉 Doskonała sytuacja!',
            summary: 'W ostatnich 7 dniach nie było żadnych wydatków. Twój budżet jest w świetnym stanie.',
            details: [
                `Dostępne środki: ${toSpend.toFixed(2)} zł`,
                `Czas do końca okresu (${selectedPeriod.name}): ${selectedPeriod.timeFormatted}`,
                `Dzienny limit: ${targetDaily.toFixed(2)} zł`
            ],
            recommendation: 'Kontynuuj tak dalej! Możesz pozwolić sobie na większe wydatki, jeśli zajdzie taka potrzeba.'
        };
    }

    const sum7 = last7.reduce((sum, e) => sum + (e.amount || 0), 0);
    const dailyAvg7 = sum7 / 7;

    if (targetDaily <= 0) {
        return {
            status: 'critical',
            title: '🚨 Sytuacja krytyczna!',
            summary: 'Przekroczyłeś dostępny budżet. Środki do wydania są ujemne.',
            details: [
                `Dostępne środki: ${toSpend.toFixed(2)} zł`,
                `Średnie dzienne wydatki (7 dni): ${dailyAvg7.toFixed(2)} zł`,
                `Czas do końca okresu: ${selectedPeriod.timeFormatted}`
            ],
            recommendation: 'Natychmiast ogranicz wydatki lub rozważ zwiększenie przychodów. Skonsultuj swój budżet i priorytetyzuj tylko niezbędne wydatki.'
        };
    }
    
    const ratio = dailyAvg7 / targetDaily;
    const percentageOfLimit = (ratio * 100).toFixed(0);
    
    let status, title, summary, recommendation;
    
    if (ratio <= 0.5) {
        status = 'excellent';
        title = '🌟 Doskonała kontrola wydatków!';
        summary = `Twoje średnie dzienne wydatki (${dailyAvg7.toFixed(2)} zł) stanowią zaledwie ${percentageOfLimit}% limitu dziennego. Budżet jest w bardzo dobrej kondycji.`;
        recommendation = 'Świetna robota! Masz dużo przestrzeni w budżecie. Możesz kontynuować obecny styl życia lub rozważyć zwiększenie oszczędności.';
    } else if (ratio <= 0.8) {
        status = 'good';
        title = '✅ Dobra sytuacja budżetowa';
        summary = `Wydajesz średnio ${dailyAvg7.toFixed(2)} zł dziennie, co stanowi ${percentageOfLimit}% limitu dziennego (${targetDaily.toFixed(2)} zł). Trzymasz się budżetu.`;
        recommendation = 'Dobrze Ci idzie! Kontynuuj obecne tempo wydatków, ale uważaj na większe zakupy.';
    } else if (ratio <= 1.0) {
        status = 'moderate';
        title = '⚡ Wydatki zbliżone do limitu';
        summary = `Średnie dzienne wydatki (${dailyAvg7.toFixed(2)} zł) zbliżają się do limitu (${targetDaily.toFixed(2)} zł). Stanowią ${percentageOfLimit}% dostępnego budżetu dziennego.`;
        recommendation = 'Sytuacja jest pod kontrolą, ale nie masz dużego marginesu błędu. Uważaj na spontaniczne zakupy i monitoruj wydatki częściej.';
    } else if (ratio <= 1.3) {
        status = 'warning';
        title = '⚠️ Przekraczasz limit!';
        summary = `Uwaga! Wydajesz średnio ${dailyAvg7.toFixed(2)} zł dziennie, czyli ${percentageOfLimit}% limitu dziennego (${targetDaily.toFixed(2)} zł). To ${(dailyAvg7 - targetDaily).toFixed(2)} zł ponad limit!`;
        recommendation = 'Czas na większą ostrożność! Ogranicz niepotrzebne wydatki i skup się na priorytetach. Jeśli tak dalej pójdzie, możesz nie zmieścić się w budżecie do końca okresu.';
    } else {
        status = 'critical';
        title = '🚨 Znaczne przekroczenie limitu!';
        summary = `Alarm! Średnie wydatki dzienne (${dailyAvg7.toFixed(2)} zł) przekraczają limit (${targetDaily.toFixed(2)} zł) o ${((ratio - 1) * 100).toFixed(0)}%! To ${(dailyAvg7 - targetDaily).toFixed(2)} zł dziennie ponad budżet.`;
        recommendation = 'Sytuacja wymaga natychmiastowej reakcji! Wstrzymaj wszystkie niepotrzebne wydatki. Przeanalizuj ostatnie zakupy i zidentyfikuj, co można było ograniczyć. Rozważ przesunięcie planowanych wydatków na później.';
    }

    // ZMIANA: Pokazuj "Dziś", countdown timer (HH:MM:SS) lub liczbę dni
    let timeLabel;
    let timeValue;

    if (selectedPeriod.showToday) {
        // Gdy wpływ jest dziś i nie podano czasu
        timeLabel = 'Czas do końca okresu';
        timeValue = 'Dziś';
    } else if (selectedPeriod.countdownFormat) {
        // Gdy zostało < 1 dzień i podano czas, używamy countdown timera
        timeLabel = 'Czas do końca okresu';
        timeValue = `<span class="countdown-timer" data-end-date="${selectedPeriod.date}" data-end-time="${selectedPeriod.time || ''}">${selectedPeriod.countdownFormat}</span>`;
    } else {
        // Gdy >= 1 dzień
        timeLabel = 'Dni do końca okresu';
        timeValue = selectedPeriod.timeFormatted || `${activeDays} dni`;
    }

    const details = [
        `Dostępne środki do wydania: ${toSpend.toFixed(2)} zł`,
        `${timeLabel}: ${timeValue}`,
        `Dzienny limit: ${targetDaily.toFixed(2)} zł`,
        `Średnie wydatki dzienne (7 dni): ${dailyAvg7.toFixed(2)} zł`,
        `Liczba transakcji (7 dni): ${last7.length}`,
        `Prognozowane wydatki do końca okresu: ${(dailyAvg7 * activeDays).toFixed(2)} zł`
    ];

    return {
        status,
        title,
        summary,
        details,
        recommendation
    };
}

export function getWeekDateRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    
    return {
        start: weekStart.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }),
        end: today.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
    };
}

export function getMonthName() {
    const today = new Date();
    return today.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

/**
 * Symulacja wydatku - analizuje czy w podanej dacie bezpiecznie jest dokonać wydatku o podanej kwocie
 * Bazuje na: budżecie, wydatkach, przychodach (planowanych i zrealizowanych),
 * danych historycznych, przyzwyczajeniach użytkownika i inteligentnej analizie
 *
 * @param {string} simulationDate - Data wydatku (YYYY-MM-DD)
 * @param {number} simulationAmount - Kwota wydatku
 * @returns {Object} Szczegółowa analiza bezpieczeństwa wydatku
 */
export function simulateExpense(simulationDate, simulationAmount) {
    const today = getWarsawDateString();
    const expenses = getExpenses();
    const incomes = getIncomes();
    const savingGoal = getSavingGoal();

    // === KROK 1: Realne środki DZIŚ (tylko zrealizowane transakcje) ===
    let realizedIncome = 0;
    let realizedExpense = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal') {
            realizedIncome += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal') {
            realizedExpense += exp.amount || 0;
        }
    });

    const currentRealFunds = realizedIncome - realizedExpense - savingGoal;

    // === KROK 2: Analiza historyczna (60 dni) - potrzebna do szacowania codziennych wydatków ===
    const d60 = new Date(today);
    d60.setDate(d60.getDate() - 60);
    const date60str = getWarsawDateString(d60);

    const historicalExpenses = expenses.filter(e =>
        e.type === 'normal' && e.date >= date60str && e.date <= today
    );

    const dailySpending = {};
    historicalExpenses.forEach(e => {
        dailySpending[e.date] = (dailySpending[e.date] || 0) + (e.amount || 0);
    });
    const dailyTotals = Object.values(dailySpending);
    const avgDailySpending = dailyTotals.length > 0
        ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length
        : 0;

    const sortedDailyTotals = [...dailyTotals].sort((a, b) => a - b);
    const medianDailySpending = sortedDailyTotals.length > 0
        ? sortedDailyTotals[Math.floor(sortedDailyTotals.length / 2)]
        : 0;

    // === KROK 3: Planowane transakcje PRZED datą symulacji (te się zrealizują po drodze) ===
    const plannedIncomesBeforeSim = incomes
        .filter(inc => inc.type === 'planned' && inc.date > today && inc.date <= simulationDate)
        .reduce((sum, inc) => sum + (inc.amount || 0), 0);

    const plannedExpensesBeforeSim = expenses
        .filter(e => e.type === 'planned' && e.date > today && e.date <= simulationDate)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    // === KROK 4: Szacowane codzienne wydatki od dziś do daty symulacji ===
    // Ile dni między dziś a datą symulacji (nie licząc dziś - dzisiejsze wydatki już się realizują)
    const daysToSimulation = Math.max(0, Math.ceil((new Date(simulationDate) - new Date(today)) / (1000 * 60 * 60 * 24)));

    // Używamy mediany dziennej jako bezpieczniejszego estymatora codziennych wydatków
    // (mediana jest odporniejsza na jednorazowe duże wydatki niż średnia)
    const estimatedDailyBurn = medianDailySpending > 0 ? medianDailySpending : avgDailySpending;
    const estimatedSpendingUntilSim = estimatedDailyBurn * daysToSimulation;

    // === KROK 5: Prognozowane środki na dzień symulacji ===
    // Realne środki + planowane wpływy przed symulacją - planowane wydatki przed symulacją - szacowane codzienne wydatki
    const projectedAvailable = currentRealFunds
        + plannedIncomesBeforeSim    // planowane wpływy (zrealizują się przed datą symulacji)
        - plannedExpensesBeforeSim   // planowane wydatki (zrealizują się przed datą symulacji)
        - estimatedSpendingUntilSim; // szacowane codzienne wydatki po drodze (na bazie nawyków)

    const availableAfterSimulation = projectedAvailable - simulationAmount;

    // === KROK 6: Kontekst PO dacie symulacji (tylko informacyjnie, NIE wpływa na decyzję) ===
    // Następny planowany wpływ po dacie symulacji
    const futureIncomesAfterSim = incomes
        .filter(inc => inc.type === 'planned' && inc.date > simulationDate)
        .sort((a, b) => a.date.localeCompare(b.date));

    const nextIncomeAfterSim = futureIncomesAfterSim[0] || null;
    let daysToNextIncome = 0;
    if (nextIncomeAfterSim) {
        const simDate = new Date(simulationDate);
        const incDate = new Date(nextIncomeAfterSim.date);
        daysToNextIncome = Math.ceil((incDate - simDate) / (1000 * 60 * 60 * 24));
    }

    // Szacowany dzienny budżet po wydatku (ile zostanie na dzień do następnego wpływu)
    const daysForBudget = Math.max(1, daysToNextIncome || 30);
    const dailyBudgetAfter = availableAfterSimulation / daysForBudget;

    // === KROK 7: Analiza dnia tygodnia ===
    const simDayOfWeek = new Date(simulationDate).getDay();
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const dayExpenses = historicalExpenses.filter(e => new Date(e.date).getDay() === simDayOfWeek);
    const dayAvg = dayExpenses.length > 0
        ? dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) / new Set(dayExpenses.map(e => e.date)).size
        : avgDailySpending;

    // === KROK 8: Podobne wydatki w historii ===
    const similarExpenses = historicalExpenses.filter(e =>
        Math.abs((e.amount || 0) - simulationAmount) < simulationAmount * 0.2
    );

    // === KROK 9: Podejmij decyzję ===
    const findings = [];
    let riskLevel = 'safe'; // safe, caution, warning, danger

    // Czy starczy środków?
    if (availableAfterSimulation < 0) {
        riskLevel = 'danger';
        findings.push(`Brak wystarczających środków. Prognozowane saldo po wydatku: ${availableAfterSimulation.toFixed(2)} zł (ujemne).`);
    } else if (dailyBudgetAfter < 0) {
        riskLevel = 'danger';
        findings.push(`Po wydatku zabraknie środków na codzienne wydatki do następnego wpływu.`);
    } else if (dailyBudgetAfter < estimatedDailyBurn * 0.3) {
        riskLevel = 'warning';
        findings.push(`Po wydatku dzienny budżet (${dailyBudgetAfter.toFixed(2)} zł) spadnie poniżej 30% Twoich zwykłych wydatków (${estimatedDailyBurn.toFixed(2)} zł/dzień).`);
    } else if (dailyBudgetAfter < estimatedDailyBurn * 0.6) {
        riskLevel = 'caution';
        findings.push(`Po wydatku dzienny budżet (${dailyBudgetAfter.toFixed(2)} zł) będzie ograniczony w porównaniu do zwykłych wydatków (${estimatedDailyBurn.toFixed(2)} zł/dzień).`);
    }

    // Kontekst kwoty vs dostępne środki
    if (projectedAvailable > 0 && simulationAmount > projectedAvailable * 0.5) {
        if (riskLevel === 'safe') riskLevel = 'caution';
        findings.push(`Wydatek stanowi ${((simulationAmount / projectedAvailable) * 100).toFixed(0)}% prognozowanych środków na dzień symulacji.`);
    }

    if (simulationAmount > avgDailySpending * 5 && avgDailySpending > 0) {
        findings.push(`Kwota jest ${(simulationAmount / avgDailySpending).toFixed(1)}× wyższa od Twojej średniej dziennej (${avgDailySpending.toFixed(2)} zł).`);
    }

    // Kontekst dnia tygodnia
    if (dayAvg > 0 && simulationAmount > dayAvg * 3) {
        findings.push(`W ${dayNames[simDayOfWeek].toLowerCase()} zwykle wydajesz ok. ${dayAvg.toFixed(2)} zł, ten wydatek jest ${(simulationAmount / dayAvg).toFixed(1)}× wyższy.`);
    }

    // Podobne wydatki w historii
    if (similarExpenses.length > 0) {
        findings.push(`Podobne wydatki (ok. ${simulationAmount.toFixed(0)} zł) pojawiały się ${similarExpenses.length} razy w ostatnich 60 dniach.`);
    }

    // Szacowane wydatki po drodze
    if (daysToSimulation > 0 && estimatedSpendingUntilSim > 0) {
        findings.push(`Szacowane codzienne wydatki do daty symulacji (${daysToSimulation} dni × ${estimatedDailyBurn.toFixed(2)} zł): ${estimatedSpendingUntilSim.toFixed(2)} zł.`);
    }

    // Planowane wpływy PRZED symulacją (zrealizują się po drodze)
    if (plannedIncomesBeforeSim > 0) {
        findings.push(`Planowane wpływy do dnia symulacji: +${plannedIncomesBeforeSim.toFixed(2)} zł (uwzględnione w prognozie).`);
    }

    // Planowane wydatki PRZED symulacją (zrealizują się po drodze)
    if (plannedExpensesBeforeSim > 0) {
        findings.push(`Planowane wydatki do dnia symulacji: -${plannedExpensesBeforeSim.toFixed(2)} zł (uwzględnione w prognozie).`);
    }

    // Informacja o następnym wpływie PO dacie symulacji (kontekst informacyjny)
    if (nextIncomeAfterSim) {
        findings.push(`Następny wpływ po wydatku: ${nextIncomeAfterSim.source || 'Bez nazwy'} (${(nextIncomeAfterSim.amount || 0).toFixed(2)} zł) dnia ${nextIncomeAfterSim.date} (za ${daysToNextIncome} dni od symulacji).`);
    } else {
        if (riskLevel === 'safe' || riskLevel === 'caution') riskLevel = 'caution';
        findings.push(`Brak zaplanowanych wpływów po dacie symulacji - zachowaj ostrożność.`);
    }

    // Pozytywne informacje jeśli bezpiecznie
    if (riskLevel === 'safe') {
        findings.push(`Po wydatku pozostanie ${availableAfterSimulation.toFixed(2)} zł, co daje ${dailyBudgetAfter.toFixed(2)} zł/dzień na ${daysForBudget} dni.`);
    }

    // Tytuł i podsumowanie
    const titles = {
        safe: 'Bezpieczny wydatek',
        caution: 'Wydatek możliwy z uwagami',
        warning: 'Wydatek ryzykowny',
        danger: 'Wydatek niebezpieczny'
    };

    const summaries = {
        safe: `Możesz bezpiecznie dokonać wydatku ${simulationAmount.toFixed(2)} zł w dniu ${simulationDate}. Twój budżet to udźwignie.`,
        caution: `Wydatek ${simulationAmount.toFixed(2)} zł w dniu ${simulationDate} jest możliwy, ale wymaga ostrożności w kolejnych dniach.`,
        warning: `Wydatek ${simulationAmount.toFixed(2)} zł w dniu ${simulationDate} jest ryzykowny i może zagrozić stabilności budżetu.`,
        danger: `Wydatek ${simulationAmount.toFixed(2)} zł w dniu ${simulationDate} jest niebezpieczny - grozi brakiem środków.`
    };

    return {
        riskLevel,
        title: titles[riskLevel],
        summary: summaries[riskLevel],
        findings,
        data: {
            simulationDate,
            simulationAmount,
            currentRealFunds,
            projectedAvailable,
            availableAfterSimulation,
            dailyBudgetAfter,
            daysToSimulation,
            daysToNextIncome,
            estimatedDailyBurn,
            estimatedSpendingUntilSim,
            plannedIncomesBeforeSim,
            plannedExpensesBeforeSim,
            nextIncomeAfterSim: nextIncomeAfterSim ? { source: nextIncomeAfterSim.source, amount: nextIncomeAfterSim.amount, date: nextIncomeAfterSim.date } : null,
            avgDailySpending,
            medianDailySpending
        }
    };
}