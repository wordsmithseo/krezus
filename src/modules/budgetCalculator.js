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
    console.log('💾 Zapisano cache limitów z datą północy:', cache.calculatedAt);
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
            console.log('⚠️ Cache limitów nieaktualny (stara data), obliczam na nowo');
            return null;
        }

        // Sprawdź czy cache ma nową strukturę z realLimit i plannedLimit
        if (!cache.limits || !Array.isArray(cache.limits.limits)) {
            console.log('⚠️ Cache limitów ma starą strukturę, obliczam na nowo');
            return null;
        }

        const firstLimit = cache.limits.limits[0];
        if (firstLimit && (firstLimit.realLimit === undefined || firstLimit.plannedLimit === undefined)) {
            console.log('⚠️ Cache limitów nie ma nowych pól (realLimit/plannedLimit), obliczam na nowo');
            return null;
        }

        // NOWE: Sprawdź czy cache ma pola czasu (totalDays, timeFormatted, calendarDays, seconds, countdownFormat, showToday)
        if (firstLimit && (firstLimit.totalDays === undefined || firstLimit.timeFormatted === undefined || firstLimit.calendarDays === undefined || firstLimit.seconds === undefined || firstLimit.showToday === undefined)) {
            console.log('⚠️ Cache limitów nie ma pól czasu (totalDays/timeFormatted/calendarDays/seconds/countdownFormat/showToday), obliczam na nowo');
            return null;
        }

        console.log('✅ Używam cache limitów z:', cache.calculatedAt);
        return cache;
    } catch (e) {
        console.error('❌ Błąd odczytu cache limitów:', e);
        return null;
    }
}

/**
 * Czyści cache limitów
 */
export function clearLimitsCache() {
    localStorage.removeItem(LIMITS_CACHE_KEY);
    console.log('🧹 Wyczyszczono cache limitów');
}

export function calculateRealisedTotals(dateStr = null) {
    const today = dateStr || getWarsawDateString();
    console.log('📊 Obliczanie zrealizowanych sum (WŁĄCZNIE z dzisiejszymi)');
    console.log('📅 Dzisiejsza data:', today);
    
    const incomes = getIncomes();
    const expenses = getExpenses();
    
    console.log('📥 Liczba przychodów:', incomes.length);
    console.log('📤 Liczba wydatków:', expenses.length);

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

    console.log('📊 SUMA przychodów (zrealizowane, do dziś włącznie):', sumIncome);
    console.log('📊 SUMA wydatków (zrealizowane, do dziś włącznie):', sumExpense);

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

    console.log('📅 Znalezione daty planowanych przychodów:', uniqueIncomes);

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

    console.log('📊 Okresy budżetowe (automatyczne):', periods);

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
    const available = sumIncome - sumExpense;

    return {
        available
    };
}

export function calculateCurrentLimits() {
    const { available } = calculateAvailableFunds();
    const toSpend = available;
    const spendingPeriods = calculateSpendingPeriods();
    const { periods, date1, date2, daysLeft1, daysLeft2 } = spendingPeriods;
    const plannedTotals = calculatePlannedTransactionsTotals();

    console.log('💰 === OBLICZANIE LIMITÓW ===');
    console.log('💰 Dostępne środki (available):', available.toFixed(2), 'zł');

    // Oblicz limity dla wszystkich okresów
    const limits = periods.map((period, index) => {
        // ZMIANA: Używamy calendarDays (pełne dni kalendarzowe) dla obliczeń limitów
        // Jeśli calendarDays < 0 (wpływ był wczoraj lub wcześniej), zwracamy limity = 0
        if (period.calendarDays < 0) {
            console.log(`\n📊 Okres: ${period.name} - BRAK CZASU (wpływ był w przeszłości)`);
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

        console.log(`\n📊 Okres: ${period.name} (${period.timeFormatted})`);
        console.log('  📅 Pełne dni kalendarzowe (dla obliczeń):', daysForCalculation, 'dni');
        console.log('  ⏱️  Dokładny czas pozostały:', period.totalDays.toFixed(3), 'dni');
        console.log('  💰 Dostępne środki:', available.toFixed(2), 'zł');
        console.log('  📥 Planowane przychody (BEZ dnia wpływu):', futureIncome.toFixed(2), 'zł');
        console.log('  📤 Planowane wydatki (BEZ dnia wpływu):', futureExpense.toFixed(2), 'zł');

        // Limit realny = available / totalDays (BEZ dnia wpływu)
        const realLimit = Math.max(0, available / daysForCalculation);

        // Limit planowany = (available + futureIncome - futureExpense) / totalDays (BEZ dnia wpływu)
        const plannedLimit = Math.max(0, (available + futureIncome - futureExpense) / daysForCalculation);

        console.log('  ✅ Limit realny:', realLimit.toFixed(2), 'zł/dzień');
        console.log('  ✅ Limit planowany:', plannedLimit.toFixed(2), 'zł/dzień');

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

    console.log('✅ === KONIEC OBLICZANIA LIMITÓW ===\n');

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

    console.log('📊 === DEBUG PLANOWANYCH TRANSAKCJI ===');
    console.log('📅 Dzisiejsza data:', today);
    console.log('📅 Liczba okresów:', periods.length);
    console.log('📥 Wszystkie przychody:', incomes.length);
    console.log('📤 Wszystkie wydatki:', expenses.length);

    const plannedIncomes = incomes.filter(inc => inc.type === 'planned');
    console.log('💰 Planowane przychody (wszystkie):', plannedIncomes);

    // Oblicz sumy dla wszystkich okresów
    const periodTotals = periods.map((period, index) => {
        let futureIncome = 0;
        let futureExpense = 0;

        if (period.date && period.date.trim() !== '') {
            console.log(`🔍 Filtrowanie dla okresu ${index + 1} (od ${today} włącznie do ${period.date} BEZ daty końcowej)`);

            incomes.forEach(inc => {
                if (inc.type === 'planned' && inc.date >= today && inc.date < period.date) {
                    console.log(`  ✅ Dodaję przychód: ${inc.amount} zł, data: ${inc.date}, źródło: ${inc.source}`);
                    futureIncome += inc.amount || 0;
                }
            });

            expenses.forEach(exp => {
                if (exp.type === 'planned' && exp.date >= today && exp.date < period.date) {
                    console.log(`  ✅ Dodaję wydatek: ${exp.amount} zł, data: ${exp.date}`);
                    futureExpense += exp.amount || 0;
                }
            });

            console.log(`  💰 Okres ${index + 1} - Przychody: ${futureIncome} zł, Wydatki: ${futureExpense} zł`);
        }

        return {
            date: period.date,
            futureIncome,
            futureExpense
        };
    });

    console.log('💰 WSZYSTKIE WYNIKI:', periodTotals);
    console.log('📊 === KONIEC DEBUG ===');

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
    console.log('🔄 Obliczam limity na nowo...');
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

export function checkAnomalies() {
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
    
    if (last30.length === 0) return [];
    
    const amounts = last30.map(e => e.amount || 0);
    const avg = amounts.reduce((a,b) => a+b, 0) / amounts.length;
    const sortedAmounts = [...amounts].sort((a,b) => a-b);
    const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
    
    const threshold = Math.max(avg * 2, median * 3);
    
    return expenses.filter(e => 
        e.type === 'normal' && 
        e.date >= date30str && 
        (e.amount || 0) > threshold
    );
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

export async function updateDailyEnvelope(forDate = null) {
    const targetDate = forDate || getWarsawDateString();
    console.log('📅 Aktualizowanie inteligentnej koperty dla daty:', targetDate);

    const expenses = getExpenses();

    // Oblicz dzisiejsze wydatki
    const todayExpenses = expenses.filter(exp =>
        exp.date === targetDate && exp.type === 'normal'
    );
    const todayExpensesSum = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const existing = getDailyEnvelope();

    // Sprawdź czy koperta została już dziś przeliczona
    if (existing && existing.date === targetDate && existing.calculatedDate === targetDate) {
        console.log('✅ Koperta była już dziś przeliczona - tylko aktualizuję wydatki');
        console.log('💸 Wydano dzisiaj:', todayExpensesSum.toFixed(2), 'PLN');

        const updatedEnvelope = {
            ...existing,
            spent: todayExpensesSum
        };

        await saveDailyEnvelope(targetDate, updatedEnvelope);
        return updatedEnvelope;
    }

    // PEŁNE PRZELICZENIE - tylko raz dziennie
    console.log('🔄 Pełne przeliczenie koperty dnia');

    const incomes = getIncomes();

    let sumIncomeBeforeToday = 0;
    let sumExpenseBeforeToday = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date < targetDate) {
            sumIncomeBeforeToday += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date < targetDate) {
            sumExpenseBeforeToday += exp.amount || 0;
        }
    });

    const availableBeforeToday = sumIncomeBeforeToday - sumExpenseBeforeToday;
    const toSpendBeforeToday = availableBeforeToday;

    const { periods } = calculateSpendingPeriods();
    const envelopePeriodIndex = getEnvelopePeriod();
    const selectedPeriod = periods[envelopePeriodIndex] || periods[0];

    const todayIncomes = incomes.filter(inc =>
        inc.date === targetDate && inc.type === 'normal'
    );
    const todayIncomesSum = todayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    console.log('🧠 === INTELIGENTNA KOPERTA DNIA V6 ===');
    console.log('💰 Dostępne środki PRZED dzisiejszym dniem:', availableBeforeToday.toFixed(2), 'PLN');
    console.log('💵 Do wydania PRZED dzisiejszym dniem:', toSpendBeforeToday.toFixed(2), 'PLN');
    console.log('📅 Wybrany okres koperty:', selectedPeriod?.name || 'brak');
    console.log('📅 Data końcowa wybranego okresu:', selectedPeriod?.date || 'brak');
    console.log('📅 Czas do końca okresu:', selectedPeriod?.timeFormatted || '0 dni');
    console.log('📅 Pełne dni kalendarzowe (dla obliczeń):', selectedPeriod?.calendarDays || 0, 'dni');
    console.log('⏱️  Dokładny czas pozostały:', selectedPeriod?.totalDays?.toFixed(3) || 0, 'dni');
    console.log('💵 Dzisiejsze wpływy:', todayIncomesSum.toFixed(2), 'PLN');
    console.log('💸 Dzisiejskie wydatki:', todayExpensesSum.toFixed(2), 'PLN');

    let smartLimit = 0;

    // ZMIANA: Używamy calendarDays (pełne dni kalendarzowe) zamiast daysLeft dla obliczeń
    if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
        console.log('⚠️ Brak czasu do końca okresu (wpływ był w przeszłości)!');
        smartLimit = 0;
    } else {
        // Dla obliczeń koperty: używamy minimum 1 dzień (gdy wpływ jest dzisiaj, liczmy dzisiejszy dzień)
        const daysForCalculation = Math.max(1, selectedPeriod.calendarDays);
        console.log('⏱️  Dni do obliczeń:', daysForCalculation, 'dni');
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const date30str = getWarsawDateString(d30);

        const historicalExpenses = expenses.filter(e =>
            e.type === 'normal' &&
            e.date >= date30str &&
            e.date < targetDate
        );

        const totalAvailableToday = toSpendBeforeToday + todayIncomesSum;

        console.log('💰 Całkowite środki do wydania dziś:', totalAvailableToday.toFixed(2), 'PLN');

        // ZMIANA: Używamy daysForCalculation (minimum 1 dzień) dla obliczeń
        const dailyLimit = totalAvailableToday / daysForCalculation;
        console.log('📊 Limit dzienny dla wybranego okresu:', dailyLimit.toFixed(2), 'zł');

        if (dailyLimit <= 0) {
            console.log('⚠️ Brak środków do wydania - koperta = 0');
            smartLimit = 0;
        } else if (historicalExpenses.length >= 5) {
            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
            const median = amounts[Math.floor(amounts.length / 2)];

            let calculatedLimit;
            if (median > dailyLimit * 1.5) {
                calculatedLimit = dailyLimit * 0.9;
                console.log('📊 Mediana zbyt wysoka - używam 90% limitu');
            } else if (median < dailyLimit * 0.3) {
                calculatedLimit = dailyLimit * 0.7;
                console.log('📊 Mediana zbyt niska - używam 70% limitu');
            } else {
                calculatedLimit = (median * 0.4 + dailyLimit * 0.6);
                console.log('📊 Używam ważonej średniej: 40% mediana + 60% limit');
            }

            smartLimit = Math.max(0, Math.min(calculatedLimit, dailyLimit, totalAvailableToday));

            console.log('📊 Mediana wydatków (30 dni):', median.toFixed(2), 'zł');
            console.log('📊 Obliczony limit:', calculatedLimit.toFixed(2), 'zł');
            console.log('💰 Inteligentna kwota koperty (ograniczona do limitu):', smartLimit.toFixed(2), 'zł');
        } else {
            smartLimit = Math.max(0, Math.min(dailyLimit * 0.8, totalAvailableToday));

            console.log('⚠️ Niewystarczająca historia wydatków (< 5 transakcji)');
            console.log('📊 Limit dzienny:', dailyLimit.toFixed(2), 'zł');
            console.log('📊 Używam 80% limitu (zachowawczo)');
            console.log('💰 Kwota koperty:', smartLimit.toFixed(2), 'zł');
        }
    }

    // Informacja o okresie do zapisu - ZMIANA: dodajemy pola czasu
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

    console.log('✅ KOŃCOWA KOPERTA DNIA:', smartLimit.toFixed(2), 'zł');

    // Ustaw timestamp na północ dzisiejszego dnia (00:00:00)
    const midnightTimestamp = new Date(targetDate + 'T00:00:00+01:00').toISOString();

    const envelope = {
        date: targetDate,
        baseAmount: smartLimit,
        additionalFunds: 0,
        totalAmount: smartLimit,
        spent: todayExpensesSum,
        period: periodInfo,
        calculatedDate: targetDate,
        calculatedAt: midnightTimestamp
    };

    console.log('✅ Zapisywanie inteligentnej koperty z datą północy:', envelope);
    await saveDailyEnvelope(targetDate, envelope);

    return envelope;
}

export function getEnvelopeCalculationInfo() {
    const envelope = getDailyEnvelope();
    const { periods } = calculateSpendingPeriods();
    const envelopePeriodIndex = getEnvelopePeriod();
    const selectedPeriod = periods[envelopePeriodIndex] || periods[0];

    if (!envelope) {
        // ZMIANA: Używamy calendarDays zamiast daysLeft
        if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
            return {
                description: 'Brak wybranego okresu',
                formula: 'Wybierz okres w ustawieniach'
            };
        }
        return null;
    }

    const expenses = getExpenses();
    const today = getWarsawDateString();

    const incomes = getIncomes();
    let sumIncomeBeforeToday = 0;
    let sumExpenseBeforeToday = 0;

    incomes.forEach(inc => {
        if (inc.type === 'normal' && inc.date < today) {
            sumIncomeBeforeToday += inc.amount || 0;
        }
    });

    expenses.forEach(exp => {
        if (exp.type === 'normal' && exp.date < today) {
            sumExpenseBeforeToday += exp.amount || 0;
        }
    });

    const availableBeforeToday = sumIncomeBeforeToday - sumExpenseBeforeToday;
    const toSpendBeforeToday = availableBeforeToday;

    const todayIncomes = incomes.filter(inc =>
        inc.date === today && inc.type === 'normal'
    );
    const todayIncomesSum = todayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const date30str = getWarsawDateString(d30);

    const historicalExpenses = expenses.filter(e =>
        e.type === 'normal' &&
        e.date >= date30str &&
        e.date < today
    );

    let description = '';
    let formula = '';

    // ZMIANA: Używamy calendarDays zamiast daysLeft dla obliczeń
    if (!selectedPeriod || selectedPeriod.calendarDays < 0) {
        description = 'Brak wybranego okresu';
        formula = 'Wybierz okres w ustawieniach';
    } else {
        const totalAvailableToday = toSpendBeforeToday + todayIncomesSum;

        // Dla obliczeń: używamy minimum 1 dzień (gdy wpływ jest dzisiaj, liczmy dzisiejszy dzień)
        const daysForCalculation = Math.max(1, selectedPeriod.calendarDays);
        const dailyLimit = totalAvailableToday / daysForCalculation;
        const limitSource = `${selectedPeriod.name} (${selectedPeriod.timeFormatted})`;

        if (dailyLimit <= 0) {
            description = 'Brak środków do wydania';
            formula = 'Dostępne środki: 0 zł';
        } else if (historicalExpenses.length >= 5) {
            const amounts = historicalExpenses.map(e => e.amount || 0).sort((a,b) => a-b);
            const median = amounts[Math.floor(amounts.length / 2)];

            if (median > dailyLimit * 1.5) {
                description = `Algorytm inteligentny - mediana zbyt wysoka (${historicalExpenses.length} transakcji)`;
                formula = `90% limitu (${limitSource}): ${dailyLimit.toFixed(2)} zł × 0.9 = ${(dailyLimit * 0.9).toFixed(2)} zł`;
            } else if (median < dailyLimit * 0.3) {
                description = `Algorytm inteligentny - mediana zbyt niska (${historicalExpenses.length} transakcji)`;
                formula = `70% limitu (${limitSource}): ${dailyLimit.toFixed(2)} zł × 0.7 = ${(dailyLimit * 0.7).toFixed(2)} zł`;
            } else {
                description = `Algorytm inteligentny (${historicalExpenses.length} transakcji z 30 dni)`;
                formula = `40% mediany ${median.toFixed(2)} zł + 60% limitu (${limitSource}) ${dailyLimit.toFixed(2)} zł, max ${dailyLimit.toFixed(2)} zł`;
            }
        } else {
            description = `Algorytm zachowawczy (za mało historii: ${historicalExpenses.length}/5 transakcji)`;
            formula = `80% limitu (${limitSource}): ${dailyLimit.toFixed(2)} zł × 0.8 = ${(dailyLimit * 0.8).toFixed(2)} zł`;
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
        console.log('⚠️ Brak limitu w cache, obliczam bezpośrednio:', targetDaily.toFixed(2), 'zł');
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