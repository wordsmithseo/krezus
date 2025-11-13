// src/utils/animateNumber.js - Animacja liczb w stylu kasyna

/**
 * Animuje liczbę od wartości początkowej do końcowej w stylu maszyny do gier
 * @param {HTMLElement} element - Element, w którym wyświetlana jest liczba
 * @param {number} targetValue - Docelowa wartość
 * @param {number} duration - Czas trwania animacji w milisekundach (domyślnie 1500ms)
 * @param {number} decimals - Liczba miejsc po przecinku (domyślnie 2)
 * @param {number} startValue - Wartość początkowa (domyślnie 0)
 */
export function animateNumber(element, targetValue, duration = 1500, decimals = 2, startValue = 0) {
  if (!element) return;

  // Jeśli wartość docelowa jest taka sama jak obecna, nie animuj
  const currentText = element.textContent.replace(/[^\d.-]/g, '');
  const currentValue = parseFloat(currentText) || startValue;

  if (Math.abs(currentValue - targetValue) < 0.01) {
    element.textContent = targetValue.toFixed(decimals);
    return;
  }

  const startTime = performance.now();
  const valueDiff = targetValue - startValue;

  // Funkcja easing - efekt przyspieszenia i zwolnienia
  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3);
  };

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Użyj easing dla płynniejszej animacji
    const easedProgress = easeOutCubic(progress);

    // Oblicz bieżącą wartość
    const currentValue = startValue + (valueDiff * easedProgress);

    // Zaktualizuj tekst
    element.textContent = currentValue.toFixed(decimals);

    // Kontynuuj animację jeśli nie dotarliśmy do końca
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Upewnij się, że końcowa wartość jest dokładna
      element.textContent = targetValue.toFixed(decimals);
      element.classList.remove('animating-number');
    }
  }

  // Dodaj klasę CSS dla dodatkowych efektów
  element.classList.add('animating-number');

  // Rozpocznij animację
  requestAnimationFrame(update);
}

/**
 * Animuje wszystkie liczby w kontenerze
 * @param {string} selector - Selektor CSS do znalezienia elementów
 * @param {number} duration - Czas trwania animacji
 */
export function animateAllNumbers(selector, duration = 1500) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    const value = parseFloat(el.dataset.value || el.textContent);
    if (!isNaN(value)) {
      animateNumber(el, value, duration);
    }
  });
}
