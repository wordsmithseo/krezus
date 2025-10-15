// src/modules/chartRenderer.js
// Ten plik jest opcjonalny - renderowanie wykresów jest już w app.js
// Możesz go pominąć lub użyć jako template do refaktoryzacji w przyszłości

/**
 * Konfiguracja domyślna dla wykresów
 */
const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 10,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 14
      },
      bodyFont: {
        size: 13
      }
    }
  }
};

/**
 * Utwórz wykres słupkowy
 */
export function createBarChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas ${canvasId} not found`);
    return null;
  }
  
  const ctx = canvas.getContext('2d');
  
  const chartOptions = {
    ...defaultChartOptions,
    ...options,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: getComputedStyle(document.documentElement)
            .getPropertyValue('--text-color').trim()
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: getComputedStyle(document.documentElement)
            .getPropertyValue('--text-color').trim()
        }
      }
    }
  };
  
  return new Chart(ctx, {
    type: 'bar',
    data: data,
    options: chartOptions
  });
}

/**
 * Utwórz wykres kołowy
 */
export function createPieChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas ${canvasId} not found`);
    return null;
  }
  
  const ctx = canvas.getContext('2d');
  
  const chartOptions = {
    ...defaultChartOptions,
    ...options
  };
  
  return new Chart(ctx, {
    type: 'pie',
    data: data,
    options: chartOptions
  });
}

/**
 * Utwórz wykres liniowy
 */
export function createLineChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas ${canvasId} not found`);
    return null;
  }
  
  const ctx = canvas.getContext('2d');
  
  const chartOptions = {
    ...defaultChartOptions,
    ...options,
    scales: {
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          color: getComputedStyle(document.documentElement)
            .getPropertyValue('--text-color').trim()
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          color: getComputedStyle(document.documentElement)
            .getPropertyValue('--text-color').trim()
        }
      }
    }
  };
  
  return new Chart(ctx, {
    type: 'line',
    data: data,
    options: chartOptions
  });
}

/**
 * Generuj paletę kolorów dla wykresów
 */
export function generateColorPalette(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360 / count) % 360;
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
}

/**
 * Zniszcz wykres (przed ponownym utworzeniem)
 */
export function destroyChart(chart) {
  if (chart && typeof chart.destroy === 'function') {
    chart.destroy();
  }
}

/**
 * Aktualizuj dane wykresu
 */
export function updateChartData(chart, newData) {
  if (!chart) return;
  
  chart.data = newData;
  chart.update();
}

// Export dla backward compatibility
export default {
  createBarChart,
  createPieChart,
  createLineChart,
  generateColorPalette,
  destroyChart,
  updateChartData
};