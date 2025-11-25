// src/components/notificationsModal.js
import { sanitizeHTML } from '../utils/sanitizer.js';
import { getChangesSinceLastVisit, groupChangesByType, formatChange, updateLastSeenTimestamp, markNotificationsAsRead } from '../modules/changeTracker.js';

/**
 * Pokazuje modal z powiadomieniami o zmianach
 */
export async function showNotificationsModal() {
    console.log('🔔 Pokazywanie modalu powiadomień');

    const changes = await getChangesSinceLastVisit();

    if (changes.length === 0) {
        console.log('ℹ️ Brak nowych zmian do wyświetlenia');
        return;
    }

    // Zapisz ID powiadomień do późniejszego oznaczenia jako odczytane
    window.currentNotificationIds = changes.map(c => c.id);

    const groups = groupChangesByType(changes);

    // Utwórz modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content notifications-modal">
            <div class="modal-header">
                <h2>🔔 Nowe aktywności (${changes.length})</h2>
                <button class="btn-close" onclick="window.closeNotificationsModal()">✕</button>
            </div>
            <div class="modal-body notifications-body">
                <p class="notifications-intro">
                    Oto co się wydarzyło, gdy Cię nie było:
                </p>

                ${renderChangeGroups(groups)}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary mt-20" onclick="window.closeNotificationsModal()">
                    ✅ Rozumiem, zamknij
                </button>
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
 * Renderuje grupy zmian
 */
function renderChangeGroups(groups) {
    let html = '';

    // Automatyczne realizacje
    if (groups.auto.length > 0) {
        html += renderChangeGroup('🤖 Automatyczne realizacje', groups.auto, 'auto');
    }

    // Wydatki
    if (groups.expenses.length > 0) {
        html += renderChangeGroup('💸 Wydatki', groups.expenses, 'expenses');
    }

    // Przychody
    if (groups.incomes.length > 0) {
        html += renderChangeGroup('💰 Przychody', groups.incomes, 'incomes');
    }

    // Oszczędzanie
    if (groups.savings.length > 0) {
        html += renderChangeGroup('🎯 Oszczędzanie', groups.savings, 'savings');
    }

    // Korekty
    if (groups.corrections.length > 0) {
        html += renderChangeGroup('🔧 Korekty środków', groups.corrections, 'corrections');
    }

    // Kategorie
    if (groups.categories.length > 0) {
        html += renderChangeGroup('🏷️ Kategorie', groups.categories, 'categories');
    }

    // Użytkownicy
    if (groups.users.length > 0) {
        html += renderChangeGroup('👤 Użytkownicy', groups.users, 'users');
    }

    // Ustawienia
    if (groups.settings.length > 0) {
        html += renderChangeGroup('⚙️ Ustawienia', groups.settings, 'settings');
    }

    return html;
}

/**
 * Renderuje pojedynczą grupę zmian
 */
function renderChangeGroup(title, changes, type) {
    return `
        <div class="notifications-group">
            <h3 class="notifications-group-title">${sanitizeHTML(title)}</h3>
            <div class="notifications-list">
                ${changes.map(change => renderChangeItem(change)).join('')}
            </div>
        </div>
    `;
}

/**
 * Renderuje pojedynczą zmianę
 */
function renderChangeItem(change) {
    const formatted = formatChange(change);

    // Buduj szczegóły zmiany
    let detailsHtml = '';
    if (formatted.details) {
        const detailsArray = [];

        if (formatted.details.amount !== undefined) {
            detailsArray.push(`Kwota: <strong>${formatted.details.amount} zł</strong>`);
        }
        if (formatted.details.category) {
            detailsArray.push(`Kategoria: ${sanitizeHTML(formatted.details.category)}`);
        }
        if (formatted.details.description) {
            detailsArray.push(`Opis: ${sanitizeHTML(formatted.details.description)}`);
        }
        if (formatted.details.source) {
            detailsArray.push(`Źródło: ${sanitizeHTML(formatted.details.source)}`);
        }
        if (formatted.details.name) {
            detailsArray.push(`Nazwa: ${sanitizeHTML(formatted.details.name)}`);
        }
        if (formatted.details.targetAmount !== undefined) {
            detailsArray.push(`Cel: ${formatted.details.targetAmount} zł`);
        }
        if (formatted.details.goalName) {
            detailsArray.push(`Cel oszczędzania: ${sanitizeHTML(formatted.details.goalName)}`);
        }
        if (formatted.details.oldAmount !== undefined && formatted.details.newAmount !== undefined) {
            detailsArray.push(`${formatted.details.oldAmount} zł → ${formatted.details.newAmount} zł`);
        }
        if (formatted.details.date) {
            detailsArray.push(`Data: ${formatted.details.date}`);
        }
        if (formatted.details.reason) {
            detailsArray.push(`Powód: ${sanitizeHTML(formatted.details.reason)}`);
        }
        if (formatted.details.message) {
            detailsArray.push(`${sanitizeHTML(formatted.details.message)}`);
        }

        if (detailsArray.length > 0) {
            detailsHtml = `<div class="change-details">${detailsArray.join(' • ')}</div>`;
        }
    }

    const automaticBadge = formatted.isAutomatic
        ? '<span class="change-badge automatic">Automatyczne</span>'
        : '';

    return `
        <div class="notification-item">
            <div class="notification-header">
                <span class="notification-label">${sanitizeHTML(formatted.label)}</span>
                ${automaticBadge}
            </div>
            <div class="notification-meta">
                <span class="notification-user">👤 ${sanitizeHTML(formatted.user)}</span>
                <span class="notification-time">🕐 ${sanitizeHTML(formatted.timestamp)}</span>
            </div>
            ${detailsHtml}
        </div>
    `;
}

/**
 * Zamyka modal powiadomień i aktualizuje timestamp ostatniej wizyty
 */
window.closeNotificationsModal = function() {
    const modal = document.querySelector('.modal.active');
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => {
        modal.remove();
    }, 300);

    // Oznacz powiadomienia jako odczytane
    if (window.currentNotificationIds && window.currentNotificationIds.length > 0) {
        markNotificationsAsRead(window.currentNotificationIds);
        window.currentNotificationIds = [];
    }

    // Aktualizuj timestamp ostatniej wizyty
    updateLastSeenTimestamp();

    console.log('✅ Modal powiadomień zamknięty');
};

/**
 * Funkcja pomocnicza do ręcznego wyświetlenia powiadomień (dla testowania)
 */
window.showNotifications = showNotificationsModal;
