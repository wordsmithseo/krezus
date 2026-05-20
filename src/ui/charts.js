/**
 * Generyczne komponenty wykresów — zwracają HTML string.
 * RingGauge, Sparkline, BarChart, DailyChart.
 */

import { escapeHTML } from '@utils/sanitizer.js';

/**
 * Kolor pierścienia wg procentu wypełnienia.
 * < 60%  → akcent, 60–85% → amber (warning), > 85% → danger.
 */
function gaugeColor(pct) {
  if (pct > 0.85) return 'var(--danger)';
  if (pct > 0.60) return 'oklch(0.65 0.15 50)';
  return 'var(--accent)';
}

/**
 * RingGauge — SVG donut z animowanym stroke-dashoffset.
 *
 * @param {number} value   - aktualna wartość
 * @param {number} max     - maksymalna wartość (100% = max)
 * @param {object} opts
 * @param {number}  opts.size       - rozmiar SVG w px (domyślnie 200)
 * @param {number}  opts.stroke     - grubość pierścienia (domyślnie 14)
 * @param {string}  opts.label      - główna etykieta w środku (np. "120,50 zł")
 * @param {string}  opts.sublabel   - podnapisy pod etykietą
 * @param {string}  opts.color      - nadpisanie koloru pierścienia
 * @param {string}  opts.id         - id elementu circle fill (do JS-owych aktualizacji)
 * @returns {string} HTML string
 */
export function ringGaugeHTML(value, max, opts = {}) {
  const size    = opts.size   ?? 200;
  const stroke  = opts.stroke ?? 14;
  const cx      = size / 2;
  const cy      = size / 2;
  const r       = cx - stroke / 2 - 2;
  const circ    = 2 * Math.PI * r;
  const pct     = max > 0 ? Math.min(value / max, 1) : 0;
  const filled  = circ * pct;
  const color   = opts.color ?? gaugeColor(pct);
  const fillId  = opts.id ?? '';
  const idAttr  = fillId ? ` id="${fillId}"` : '';

  const labelEl = opts.label
    ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" dominant-baseline="middle"
         font-family="var(--font-mono)" font-size="${Math.round(size * 0.11)}" font-weight="500"
         fill="var(--ink-1)" font-feature-settings="'tnum' 1">${opts.label}</text>`
    : '';
  const sublabelEl = opts.sublabel
    ? `<text x="${cx}" y="${cy + Math.round(size * 0.12)}" text-anchor="middle" dominant-baseline="middle"
         font-family="var(--font-sans)" font-size="${Math.round(size * 0.07)}" font-weight="400"
         fill="var(--ink-3)">${opts.sublabel}</text>`
    : '';

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
  <circle class="gauge-track"
    cx="${cx}" cy="${cy}" r="${r}"
    fill="none" stroke="var(--surface-sunken)" stroke-width="${stroke}"
    transform="rotate(-90 ${cx} ${cy})"/>
  <circle class="gauge-fill-svg"${idAttr}
    cx="${cx}" cy="${cy}" r="${r}"
    fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
    stroke-dasharray="${filled.toFixed(2)} ${circ.toFixed(2)}"
    style="transition: stroke-dasharray 600ms cubic-bezier(.2,.8,.2,1), stroke 300ms ease;"
    transform="rotate(-90 ${cx} ${cy})"/>
  ${labelEl}
  ${sublabelEl}
</svg>`;
}

/**
 * Aktualizuje istniejący pierścień w DOM (bez pełnego re-renderu).
 * Używaj gdy chcesz animować zmianę wartości.
 *
 * @param {SVGCircleElement} circleEl - element circle fill
 * @param {number} value
 * @param {number} max
 * @param {string} [colorOverride]
 */
export function updateRingGauge(circleEl, value, max, colorOverride) {
  if (!circleEl) return;
  const r     = parseFloat(circleEl.getAttribute('r')) || 86;
  const circ  = 2 * Math.PI * r;
  const pct   = max > 0 ? Math.min(value / max, 1) : 0;
  circleEl.style.strokeDasharray = `${(circ * pct).toFixed(2)} ${circ.toFixed(2)}`;
  circleEl.style.stroke = colorOverride ?? gaugeColor(pct);
}

/**
 * Sparkline — area + line, viewBox 240×h, preserveAspectRatio none.
 *
 * @param {number[]} data    - tablica wartości (min 2)
 * @param {object}  opts
 * @param {number}   opts.height  - wysokość SVG (domyślnie 48)
 * @param {string}   opts.color   - kolor linii i wypełnienia (domyślnie var(--accent))
 * @param {number}   opts.width   - szerokość viewBox (domyślnie 240)
 * @returns {string} HTML string
 */
export function sparklineHTML(data, opts = {}) {
  const w      = opts.width  ?? 240;
  const h      = opts.height ?? 48;
  const color  = opts.color  ?? 'var(--accent)';

  if (!data || data.length < 2) {
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"></svg>`;
  }

  const max  = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts  = data.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 4) - 2;
    return [x, y];
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
  <path d="${areaPath}" fill="${color}" opacity="0.08"/>
  <path d="${linePath}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;
}

/**
 * BarChart — lista poziomych pasków z emoji ikoną kategorii.
 *
 * @param {{ label: string, value: number, color?: string, icon?: string }[]} items
 * @param {number} total - suma wszystkich wartości (do % z całości)
 * @returns {string} HTML string
 */
export function barChartHTML(items, total) {
  if (!items || items.length === 0) return '';
  const maxVal = Math.max(...items.map(it => it.value), 1);
  const sum    = total > 0 ? total : maxVal;

  return items.map((it, i) => {
    const pct     = (it.value / maxVal * 100).toFixed(1);
    const share   = (it.value / sum * 100).toFixed(1);
    const color   = it.color ?? 'var(--accent)';
    const iconBg  = `color-mix(in srgb, ${color} 14%, transparent)`;
    const iconEl  = it.icon
      ? `<div class="bar-chart-icon" style="background:${iconBg};color:${color}">${escapeHTML(it.icon)}</div>`
      : '';
    const amount  = it.value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `<div class="bar-chart-item">
  <div class="bar-chart-rank">#${i + 1}</div>
  ${iconEl}
  <div class="bar-chart-body">
    <div class="bar-chart-label-row">
      <span class="bar-chart-label">${escapeHTML(it.label)}</span>
      <span class="bar-chart-amount">${amount} zł</span>
    </div>
    <div class="bar-chart-track"><div class="bar-chart-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="bar-chart-meta">${share}% wydatków</div>
  </div>
</div>`;
  }).join('');
}

/**
 * DailyChart — pionowe słupki z weekend highlight i CSS tooltip.
 *
 * @param {{ date: string, value: number }[]} data - tablica {date: 'YYYY-MM-DD', value}
 * @param {object} opts
 * @param {number}  opts.height  - wysokość kontenera w px (domyślnie 88)
 * @returns {string} HTML string (div.daily-chart)
 */
export function dailyChartHTML(data, opts = {}) {
  const h = opts.height ?? 88;
  if (!data || data.length === 0) return `<div class="daily-chart" style="height:${h}px"></div>`;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  const bars = data.map(d => {
    const barH    = d.value > 0 ? Math.max(Math.round((d.value / maxVal) * h), 2) : 0;
    const dayObj  = new Date(d.date + 'T12:00:00');
    const isWeekend = [0, 6].includes(dayObj.getDay());
    const label   = dayObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const amount  = d.value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tip     = `${label}: ${amount} zł`;
    const weekendCls = isWeekend ? ' weekend' : '';

    return `<div class="daily-bar" data-tip="${escapeHTML(tip)}">
  <div class="daily-bar-fill${weekendCls}" style="height:${barH}px"></div>
</div>`;
  }).join('');

  return `<div class="daily-chart" style="height:${h}px">${bars}</div>`;
}
