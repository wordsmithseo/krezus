import { describe, it, expect, vi } from 'vitest';

vi.mock('@utils/sanitizer.js', () => ({
  escapeHTML: (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  sanitizeHTML: (s) => s,
}));

import { ringGaugeHTML, sparklineHTML, barChartHTML, dailyChartHTML, updateRingGauge } from '../charts.js';

// ─── ringGaugeHTML ───────────────────────────────────────────────────────────

describe('ringGaugeHTML', () => {
  it('returns an SVG string', () => {
    const html = ringGaugeHTML(50, 100);
    expect(html).toContain('<svg');
    expect(html).toContain('</svg>');
  });

  it('defaults to size 200', () => {
    const html = ringGaugeHTML(0, 100);
    expect(html).toContain('viewBox="0 0 200 200"');
  });

  it('respects custom size', () => {
    const html = ringGaugeHTML(0, 100, { size: 120 });
    expect(html).toContain('viewBox="0 0 120 120"');
  });

  it('uses accent color below 60%', () => {
    const html = ringGaugeHTML(50, 100);
    expect(html).toContain('var(--accent)');
  });

  it('uses warning color between 60% and 85%', () => {
    const html = ringGaugeHTML(70, 100);
    expect(html).toContain('oklch(0.65 0.15 50)');
  });

  it('uses danger color above 85%', () => {
    const html = ringGaugeHTML(90, 100);
    expect(html).toContain('var(--danger)');
  });

  it('uses custom color when provided', () => {
    const html = ringGaugeHTML(50, 100, { color: 'red' });
    expect(html).toContain('stroke="red"');
    expect(html).not.toContain('var(--accent)');
  });

  it('renders label text when provided', () => {
    const html = ringGaugeHTML(50, 100, { label: '50,00 zł' });
    expect(html).toContain('50,00 zł');
  });

  it('renders sublabel text when provided', () => {
    const html = ringGaugeHTML(50, 100, { sublabel: 'pozostało' });
    expect(html).toContain('pozostało');
  });

  it('omits label elements when not provided', () => {
    const html = ringGaugeHTML(50, 100);
    expect(html).not.toContain('<text');
  });

  it('adds id attribute when opts.id provided', () => {
    const html = ringGaugeHTML(50, 100, { id: 'myGauge' });
    expect(html).toContain('id="myGauge"');
  });

  it('handles zero max gracefully (pct = 0)', () => {
    const html = ringGaugeHTML(10, 0);
    expect(html).toContain('stroke-dasharray="0.00');
  });

  it('clamps value > max to 100%', () => {
    const htmlFull  = ringGaugeHTML(100, 100);
    const htmlOver  = ringGaugeHTML(200, 100);
    // Both should produce same dasharray (full circle)
    const extract = h => h.match(/stroke-dasharray="([^"]+)"/)?.[1];
    expect(extract(htmlOver)).toBe(extract(htmlFull));
  });
});

// ─── sparklineHTML ───────────────────────────────────────────────────────────

describe('sparklineHTML', () => {
  it('returns empty SVG for empty data', () => {
    const html = sparklineHTML([]);
    expect(html).toContain('<svg');
    expect(html).not.toContain('<path');
  });

  it('returns empty SVG for single point', () => {
    const html = sparklineHTML([42]);
    expect(html).not.toContain('<path');
  });

  it('returns two paths for valid data', () => {
    const html = sparklineHTML([10, 20, 30]);
    const pathCount = (html.match(/<path/g) || []).length;
    expect(pathCount).toBe(2);
  });

  it('respects custom height', () => {
    const html = sparklineHTML([10, 20], { height: 64 });
    expect(html).toContain('viewBox="0 0 240 64"');
  });

  it('respects custom color', () => {
    const html = sparklineHTML([10, 20], { color: 'red' });
    expect(html).toContain('stroke="red"');
  });

  it('defaults to 240 width', () => {
    const html = sparklineHTML([10, 20]);
    expect(html).toContain('viewBox="0 0 240');
  });
});

// ─── barChartHTML ────────────────────────────────────────────────────────────

describe('barChartHTML', () => {
  it('returns empty string for empty items', () => {
    expect(barChartHTML([], 100)).toBe('');
    expect(barChartHTML(null, 100)).toBe('');
  });

  it('renders rank numbers', () => {
    const html = barChartHTML([{ label: 'A', value: 100 }], 100);
    expect(html).toContain('#1');
  });

  it('renders label and amount', () => {
    const html = barChartHTML([{ label: 'Jedzenie', value: 250 }], 250);
    expect(html).toContain('Jedzenie');
    expect(html).toContain('250');
  });

  it('renders icon when provided', () => {
    const html = barChartHTML([{ label: 'A', value: 10, icon: '🍕' }], 10);
    expect(html).toContain('🍕');
  });

  it('skips icon element when not provided', () => {
    const html = barChartHTML([{ label: 'A', value: 10 }], 10);
    expect(html).not.toContain('bar-chart-icon');
  });

  it('renders correct number of items', () => {
    const items = [
      { label: 'A', value: 100 },
      { label: 'B', value: 50 },
      { label: 'C', value: 25 },
    ];
    const html = barChartHTML(items, 175);
    expect(html).toContain('#1');
    expect(html).toContain('#2');
    expect(html).toContain('#3');
  });

  it('escapes HTML in label', () => {
    const html = barChartHTML([{ label: '<script>', value: 1 }], 1);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ─── dailyChartHTML ──────────────────────────────────────────────────────────

describe('dailyChartHTML', () => {
  it('returns empty div for empty data', () => {
    const html = dailyChartHTML([]);
    expect(html).toContain('class="daily-chart"');
    expect(html).not.toContain('daily-bar');
  });

  it('returns empty div for null', () => {
    const html = dailyChartHTML(null);
    expect(html).toContain('class="daily-chart"');
  });

  it('renders one bar per data point', () => {
    const data = [
      { date: '2026-01-06', value: 100 },
      { date: '2026-01-07', value: 200 },
      { date: '2026-01-08', value: 50 },
    ];
    const html = dailyChartHTML(data);
    const bars = (html.match(/class="daily-bar"/g) || []).length;
    expect(bars).toBe(3);
  });

  it('marks weekend bars with weekend class', () => {
    // 2026-01-03 = Saturday, 2026-01-04 = Sunday
    const data = [
      { date: '2026-01-03', value: 100 },
      { date: '2026-01-04', value: 100 },
      { date: '2026-01-05', value: 100 }, // Monday
    ];
    const html = dailyChartHTML(data);
    const weekendBars = (html.match(/weekend/g) || []).length;
    expect(weekendBars).toBe(2);
  });

  it('zero-value bars get height 0', () => {
    const data = [{ date: '2026-01-05', value: 0 }];
    const html = dailyChartHTML(data);
    expect(html).toContain('height:0px');
  });

  it('respects custom height option', () => {
    const html = dailyChartHTML([{ date: '2026-01-05', value: 10 }], { height: 200 });
    expect(html).toContain('style="height:200px"');
  });

  it('includes tooltip text with date and amount', () => {
    const data = [{ date: '2026-01-05', value: 123.45 }];
    const html = dailyChartHTML(data);
    expect(html).toContain('data-tip=');
    expect(html).toContain('123,45');
  });
});
