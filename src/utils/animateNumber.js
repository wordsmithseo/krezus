// src/utils/animateNumber.js - Animacja liczb w stylu kasyna

let _initialLoadDone = false;

export function setInitialLoadDone() {
  _initialLoadDone = true;
}

export function animateNumber(element, targetValue, duration = 1500, decimals = 2, startValue = 0, formatter = null) {
  if (!element) return;

  const fmt = formatter ?? (v => v.toFixed(decimals));

  // Przy pierwszym ładowaniu — ustaw wartość natychmiast, bez animacji
  if (!_initialLoadDone) {
    element.textContent = fmt(targetValue);
    return;
  }

  // Parse current value handling PL format (space thousands, comma decimal)
  const currentText = element.textContent.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const currentValue = parseFloat(currentText) || startValue;

  if (Math.abs(currentValue - targetValue) < 0.01) {
    element.textContent = fmt(targetValue);
    return;
  }

  const startTime = performance.now();
  const valueDiff = targetValue - startValue;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easedProgress = easeOutCubic(progress);
    const currentValue = startValue + (valueDiff * easedProgress);

    element.textContent = fmt(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = fmt(targetValue);
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
