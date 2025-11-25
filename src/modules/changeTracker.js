// src/modules/changeTracker.js
import { getLogs } from './logger.js';
import { getUserId } from './auth.js';

const LAST_SEEN_KEY = 'krezus_last_seen_timestamp';
const READ_NOTIFICATIONS_KEY = 'krezus_read_notifications';
const SESSION_START_KEY = 'krezus_session_start';

/**
 * Pobiera timestamp ostatniej wizyty użytkownika
 */
export function getLastSeenTimestamp() {
    const userId = getUserId();
    if (!userId) return null;

    const key = `${LAST_SEEN_KEY}_${userId}`;
    const timestamp = localStorage.getItem(key);
    return timestamp ? new Date(timestamp) : null;
}

/**
 * Aktualizuje timestamp ostatniej wizyty
 */
export function updateLastSeenTimestamp() {
    const userId = getUserId();
    if (!userId) return;

    const key = `${LAST_SEEN_KEY}_${userId}`;
    const now = new Date().toISOString();
    localStorage.setItem(key, now);
    console.log('🕐 Zaktualizowano ostatnią wizytę:', now);
}

/**
 * Inicjalizuje sesję - zapisuje timestamp startu sesji
 */
export function initializeSession() {
    const userId = getUserId();
    if (!userId) return;

    const key = `${SESSION_START_KEY}_${userId}`;
    const now = new Date().toISOString();
    sessionStorage.setItem(key, now);
    console.log('🚀 Zainicjalizowano sesję:', now);
}

/**
 * Pobiera timestamp startu obecnej sesji
 */
function getSessionStart() {
    const userId = getUserId();
    if (!userId) return null;

    const key = `${SESSION_START_KEY}_${userId}`;
    const timestamp = sessionStorage.getItem(key);
    return timestamp ? new Date(timestamp) : null;
}

/**
 * Zapisuje że powiadomienia zostały odczytane
 */
export function markNotificationsAsRead(notificationIds) {
    const userId = getUserId();
    if (!userId) return;

    const key = `${READ_NOTIFICATIONS_KEY}_${userId}`;
    const existing = localStorage.getItem(key);
    const readIds = existing ? JSON.parse(existing) : [];

    const newReadIds = [...new Set([...readIds, ...notificationIds])];
    localStorage.setItem(key, JSON.stringify(newReadIds));

    console.log(`✅ Oznaczono ${notificationIds.length} powiadomień jako odczytane`);
}

/**
 * Pobiera listę odczytanych powiadomień
 */
function getReadNotifications() {
    const userId = getUserId();
    if (!userId) return [];

    const key = `${READ_NOTIFICATIONS_KEY}_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

/**
 * Pobiera zmiany które zaszły od ostatniej wizyty
 */
export async function getChangesSinceLastVisit() {
    try {
        const lastSeen = getLastSeenTimestamp();

        // Jeśli brak ostatniej wizyty, nie pokazuj powiadomień (pierwsza wizyta)
        if (!lastSeen) {
            console.log('ℹ️ Brak poprzedniej wizyty - pomijam powiadomienia');
            return [];
        }

        // Pobierz timestamp startu tej sesji
        const sessionStart = getSessionStart();

        // Pobierz listę już odczytanych powiadomień
        const readNotifications = getReadNotifications();

        // Pobierz wszystkie logi
        const allLogs = await getLogs();

        // Filtruj logi od ostatniej wizyty
        const newLogs = allLogs.filter(log => {
            const logTimestamp = new Date(log.timestamp);

            // Pomiń logi starsze niż ostatnia wizyta
            if (logTimestamp <= lastSeen) return false;

            // Pomiń logi z bieżącej sesji (własne akcje)
            if (sessionStart && logTimestamp >= sessionStart) return false;

            // Pomiń już odczytane powiadomienia
            if (readNotifications.includes(log.id)) return false;

            return true;
        });

        // Filtruj tylko istotne akcje (pomiń logowanie, wylogowanie, itp.)
        const relevantActions = [
            'EXPENSE_ADD',
            'EXPENSE_EDIT',
            'EXPENSE_DELETE',
            'EXPENSE_REALISE',
            'INCOME_ADD',
            'INCOME_EDIT',
            'INCOME_DELETE',
            'INCOME_REALISE',
            'CORRECTION_ADD',
            'CATEGORY_ADD',
            'CATEGORY_DELETE',
            'CATEGORY_EDIT',
            'SETTINGS_UPDATE',
            'BUDGET_USER_ADD',
            'BUDGET_USER_EDIT',
            'BUDGET_USER_DELETE',
            'AUTO_REALISE',
            'PURPOSE_BUDGET_ADD',
            'PURPOSE_BUDGET_EDIT',
            'PURPOSE_BUDGET_DELETE',
            'SAVINGS_GOAL_ADD',
            'SAVINGS_GOAL_EDIT',
            'SAVINGS_GOAL_DELETE',
            'SAVINGS_CONTRIBUTION_ADD',
            'SAVINGS_CONTRIBUTION_REMOVE',
            'SAVINGS_SUGGESTION_REJECT'
        ];

        const relevantChanges = newLogs.filter(log =>
            relevantActions.includes(log.action)
        );

        console.log(`📋 Znaleziono ${relevantChanges.length} nowych zmian od ostatniej wizyty`);

        return relevantChanges;
    } catch (error) {
        console.error('❌ Błąd pobierania zmian:', error);
        return [];
    }
}

/**
 * Sprawdza czy są nowe zmiany
 */
export async function hasNewChanges() {
    const changes = await getChangesSinceLastVisit();
    return changes.length > 0;
}

/**
 * Grupuje zmiany według typu akcji
 */
export function groupChangesByType(changes) {
    const groups = {
        expenses: [],
        incomes: [],
        corrections: [],
        categories: [],
        settings: [],
        users: [],
        savings: [],
        auto: []
    };

    changes.forEach(change => {
        if (change.action.startsWith('EXPENSE_')) {
            groups.expenses.push(change);
        } else if (change.action.startsWith('INCOME_')) {
            groups.incomes.push(change);
        } else if (change.action === 'CORRECTION_ADD') {
            groups.corrections.push(change);
        } else if (change.action.startsWith('CATEGORY_')) {
            groups.categories.push(change);
        } else if (change.action === 'SETTINGS_UPDATE') {
            groups.settings.push(change);
        } else if (change.action.startsWith('BUDGET_USER_')) {
            groups.users.push(change);
        } else if (change.action.startsWith('SAVINGS_')) {
            groups.savings.push(change);
        } else if (change.action === 'AUTO_REALISE') {
            groups.auto.push(change);
        }
    });

    return groups;
}

/**
 * Formatuje pojedynczą zmianę do wyświetlenia
 */
export function formatChange(change) {
    const actionLabels = {
        'EXPENSE_ADD': '💸 Dodano wydatek',
        'EXPENSE_EDIT': '✏️ Edytowano wydatek',
        'EXPENSE_DELETE': '🗑️ Usunięto wydatek',
        'EXPENSE_REALISE': '✅ Zrealizowano planowany wydatek',
        'INCOME_ADD': '💰 Dodano przychód',
        'INCOME_EDIT': '✏️ Edytowano przychód',
        'INCOME_DELETE': '🗑️ Usunięto przychód',
        'INCOME_REALISE': '✅ Zrealizowano planowany przychód',
        'CORRECTION_ADD': '🔧 Dodano korektę środków',
        'CATEGORY_ADD': '🏷️ Dodano kategorię',
        'CATEGORY_DELETE': '🗑️ Usunięto kategorię',
        'CATEGORY_EDIT': '✏️ Edytowano kategorię',
        'SETTINGS_UPDATE': '⚙️ Zaktualizowano ustawienia',
        'BUDGET_USER_ADD': '👤 Dodano użytkownika',
        'BUDGET_USER_EDIT': '✏️ Edytowano użytkownika',
        'BUDGET_USER_DELETE': '🗑️ Usunięto użytkownika',
        'AUTO_REALISE': '🤖 Automatyczna realizacja transakcji',
        'PURPOSE_BUDGET_ADD': '🎯 Dodano budżet celowy',
        'PURPOSE_BUDGET_EDIT': '✏️ Edytowano budżet celowy',
        'PURPOSE_BUDGET_DELETE': '🗑️ Usunięto budżet celowy',
        'SAVINGS_GOAL_ADD': '🎯 Dodano cel oszczędzania',
        'SAVINGS_GOAL_EDIT': '✏️ Edytowano cel oszczędzania',
        'SAVINGS_GOAL_DELETE': '🗑️ Usunięto cel oszczędzania',
        'SAVINGS_CONTRIBUTION_ADD': '💰 Zaakceptowano wpłatę na cel',
        'SAVINGS_CONTRIBUTION_REMOVE': '↩️ Wycofano wpłatę z celu',
        'SAVINGS_SUGGESTION_REJECT': '❌ Odrzucono sugestię oszczędzania'
    };

    return {
        label: actionLabels[change.action] || change.action,
        timestamp: `${change.date} ${change.time}`,
        user: change.budgetUser || 'System',
        details: change.details,
        isAutomatic: change.isSystemAction || change.budgetUser === 'System'
    };
}
