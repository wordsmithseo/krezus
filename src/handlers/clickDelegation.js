// src/handlers/clickDelegation.js
// System event delegation - bezpieczna alternatywa dla inline onclick

/**
 * Inicjalizuje system event delegation dla całej aplikacji
 * Obsługuje wszystkie akcje poprzez data-action attributes
 */
export function initClickDelegation(handlers) {
  // Event delegation na poziomie document
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const handler = handlers[action];

    if (!handler) {
      console.warn(`⚠️ Brak handlera dla akcji: ${action}`);
      return;
    }

    // Wywołaj handler z danymi z data-* attributes
    try {
      await handler(target, e);
    } catch (error) {
      console.error(`❌ Błąd w handlerze ${action}:`, error);
    }
  });

  console.log('✅ Event delegation zainicjalizowany');
}

/**
 * Helper do pobierania danych z data-* attributes
 */
export function getDataAttributes(element) {
  return {
    id: element.dataset.id,
    name: element.dataset.name,
    categoryId: element.dataset.categoryId,
    expenseId: element.dataset.expenseId,
    incomeId: element.dataset.incomeId,
    budgetId: element.dataset.budgetId,
    page: element.dataset.page ? parseInt(element.dataset.page, 10) : null,
    description: element.dataset.description,
    source: element.dataset.source
  };
}
