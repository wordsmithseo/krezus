// src/utils/countdownTimer.js
import { calculateRemainingTime } from './dateHelpers.js';

/**
 * Timer interval ID - przechowuje referencję do interwału
 */
let countdownInterval = null;

/**
 * Uruchamia auto-aktualizację countdown timerów
 * Aktualizuje wszystkie elementy z klasą 'countdown-timer' co sekundę
 */
export function startCountdownTimers() {
  // Zatrzymaj poprzedni interval jeśli istnieje
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Funkcja aktualizująca wszystkie timery
  const updateTimers = () => {
    const timers = document.querySelectorAll('.countdown-timer');

    timers.forEach(timer => {
      const endDate = timer.getAttribute('data-end-date');
      if (!endDate) return;

      // Oblicz pozostały czas
      const timeInfo = calculateRemainingTime(endDate);

      // Jeśli czas minął, pokaż 00:00:00
      if (timeInfo.calendarDays < 0 || (timeInfo.days === 0 && timeInfo.hours === 0 && timeInfo.minutes === 0 && timeInfo.seconds === 0)) {
        timer.textContent = '00:00:00';
        return;
      }

      // Jeśli zostało >= 1 dzień, nie aktualizuj (będzie wyświetlane jako liczba dni)
      if (timeInfo.countdownFormat) {
        timer.textContent = timeInfo.countdownFormat;
      } else {
        // Jeśli countdownFormat jest null (>= 1 dzień), wyświetl liczbę dni
        timer.textContent = timeInfo.formatted;
      }
    });
  };

  // Pierwsza aktualizacja od razu
  updateTimers();

  // Aktualizuj co sekundę
  countdownInterval = setInterval(updateTimers, 1000);
}

/**
 * Zatrzymuje auto-aktualizację countdown timerów
 */
export function stopCountdownTimers() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}
