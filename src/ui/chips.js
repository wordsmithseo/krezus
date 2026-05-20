/**
 * Małe komponenty UI: UserChip i CatBadge.
 * Zwracają HTML string do użycia w innerHTML.
 */

import { escapeHTML } from '@utils/sanitizer.js';

/* Paleta kolorów avatarów — deterministycznie przypisywana po nazwie użytkownika */
const AVATAR_COLORS = [
  { bg: 'oklch(0.66 0.13 60)',  fg: '#fff' },  // amber (akcent)
  { bg: 'oklch(0.55 0.12 155)', fg: '#fff' },  // zielony
  { bg: 'oklch(0.58 0.17 25)',  fg: '#fff' },  // czerwony
  { bg: 'oklch(0.6 0.1 245)',   fg: '#fff' },  // niebieski
  { bg: 'oklch(0.55 0.1 295)',  fg: '#fff' },  // fioletowy
  { bg: 'oklch(0.5 0.08 200)',  fg: '#fff' },  // teal
];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Avatar 32×32 (domyślny) lub 22×22 (.sm).
 * @param {{ id?: string, name?: string, userName?: string }} user
 * @param {boolean} sm - mały wariant
 */
export function avatarHTML(user, sm = false) {
  const name = user?.name ?? user?.userName ?? '?';
  const { bg, fg } = avatarColor(user?.id ?? name);
  const cls = sm ? 'avatar sm' : 'avatar';
  return `<div class="${cls}" style="background:${bg};color:${fg}" title="${escapeHTML(name)}">${escapeHTML(initials(name))}</div>`;
}

/**
 * UserChip — avatar.sm + nazwa 12px.
 * @param {{ id?: string, name?: string, userName?: string }} user
 */
export function userChipHTML(user) {
  const name = user?.name ?? user?.userName ?? '?';
  return `<span class="user-chip">${avatarHTML(user, true)}<span>${escapeHTML(name)}</span></span>`;
}

/**
 * CatBadge — emoji + nazwa z tinted bg z koloru kategorii.
 * @param {{ name: string, icon?: string, color?: string }} cat
 * @param {boolean} sm - mały wariant
 */
export function catBadgeHTML(cat, sm = false) {
  const color = cat?.color ?? 'var(--ink-3)';
  const bg = `color-mix(in srgb, ${color} 12%, var(--surface))`;
  const cls = `cat-badge${sm ? ' sm' : ''}`;
  const emoji = cat?.icon ? `<span class="cat-emoji">${escapeHTML(cat.icon)}</span>` : '';
  return `<span class="${cls}" style="--cat-bg:${bg};--cat-color:${color}">${emoji}<span>${escapeHTML(cat?.name ?? '')}</span></span>`;
}
