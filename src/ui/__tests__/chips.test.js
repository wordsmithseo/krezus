import { describe, it, expect, vi } from 'vitest';

vi.mock('@utils/sanitizer.js', () => ({
  escapeHTML: (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  sanitizeHTML: (s) => s,
}));

import { avatarHTML, userChipHTML, catBadgeHTML } from '../chips.js';

// ─── avatarHTML ──────────────────────────────────────────────────────────────

describe('avatarHTML', () => {
  it('returns a div with class avatar', () => {
    const html = avatarHTML({ name: 'Jan Kowalski' });
    expect(html).toContain('class="avatar"');
  });

  it('renders two initials for two-word name', () => {
    const html = avatarHTML({ name: 'Jan Kowalski' });
    expect(html).toContain('JK');
  });

  it('renders one initial for single-word name', () => {
    const html = avatarHTML({ name: 'Admin' });
    expect(html).toContain('>A<');
  });

  it('uses sm class when sm=true', () => {
    const html = avatarHTML({ name: 'Anna Nowak' }, true);
    expect(html).toContain('class="avatar sm"');
  });

  it('falls back to userName when name is missing', () => {
    const html = avatarHTML({ userName: 'Basia' });
    expect(html).toContain('>B<');
  });

  it('falls back to "?" for empty user object', () => {
    const html = avatarHTML({});
    expect(html).toContain('>?<');
  });

  it('includes title attribute with name', () => {
    const html = avatarHTML({ name: 'Sławek' });
    expect(html).toContain('title="Sławek"');
  });

  it('escapes HTML in name', () => {
    const html = avatarHTML({ name: '<img>' });
    expect(html).not.toContain('<img>');
  });

  it('uses id for color hashing when provided', () => {
    // Same name but different id → potentially different color bucket
    // Just verify it doesn't throw and returns valid HTML
    const html = avatarHTML({ id: 'uid-123', name: 'Test User' });
    expect(html).toContain('style="background:');
  });

  it('produces deterministic output for same input', () => {
    const user = { name: 'Maria Nowak' };
    expect(avatarHTML(user)).toBe(avatarHTML(user));
  });
});

// ─── userChipHTML ────────────────────────────────────────────────────────────

describe('userChipHTML', () => {
  it('returns span with class user-chip', () => {
    const html = userChipHTML({ name: 'Anna Brzezina' });
    expect(html).toContain('class="user-chip"');
  });

  it('contains an avatar.sm inside', () => {
    const html = userChipHTML({ name: 'Ola' });
    expect(html).toContain('avatar sm');
  });

  it('contains the user name in a span', () => {
    const html = userChipHTML({ name: 'Piotr Wiśniewski' });
    expect(html).toContain('<span>Piotr Wiśniewski</span>');
  });

  it('falls back to "?" for null user', () => {
    const html = userChipHTML(null);
    expect(html).toContain('?');
  });

  it('escapes HTML in name', () => {
    const html = userChipHTML({ name: '<b>hack</b>' });
    expect(html).not.toContain('<b>');
  });
});

// ─── catBadgeHTML ────────────────────────────────────────────────────────────

describe('catBadgeHTML', () => {
  it('returns span with class cat-badge', () => {
    const html = catBadgeHTML({ name: 'Jedzenie' });
    expect(html).toContain('class="cat-badge"');
  });

  it('adds sm class when sm=true', () => {
    const html = catBadgeHTML({ name: 'Jedzenie' }, true);
    expect(html).toContain('class="cat-badge sm"');
  });

  it('renders icon span when icon provided', () => {
    const html = catBadgeHTML({ name: 'Jedzenie', icon: '🍕' });
    expect(html).toContain('cat-emoji');
    expect(html).toContain('🍕');
  });

  it('omits icon span when icon not provided', () => {
    const html = catBadgeHTML({ name: 'Jedzenie' });
    expect(html).not.toContain('cat-emoji');
  });

  it('renders category name', () => {
    const html = catBadgeHTML({ name: 'Transport' });
    expect(html).toContain('Transport');
  });

  it('applies custom color via CSS custom properties', () => {
    const html = catBadgeHTML({ name: 'Jedzenie', color: 'red' });
    expect(html).toContain('--cat-color:red');
  });

  it('falls back to --ink-3 when color not provided', () => {
    const html = catBadgeHTML({ name: 'Misc' });
    expect(html).toContain('--cat-color:var(--ink-3)');
  });

  it('handles empty name gracefully', () => {
    const html = catBadgeHTML({ name: '' });
    expect(html).toContain('class="cat-badge"');
  });

  it('escapes HTML in name', () => {
    const html = catBadgeHTML({ name: '<script>x</script>' });
    expect(html).not.toContain('<script>');
  });
});
