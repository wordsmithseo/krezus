// src/ui/renderSavings.js
import { getSavings } from '../modules/dataManager.js';
import { calculateAvailableFunds, suggestSavingsTransfer } from '../modules/budgetCalculator.js';
import { Fmt } from '../utils/fmt.js';
import { userChipHTML } from './chips.js';
import { escapeHTML } from '../utils/sanitizer.js';

let _getBudgetUsersCache = () => [];
export function setSavingsDeps({ getBudgetUsersCache }) {
  _getBudgetUsersCache = getBudgetUsersCache;
}

function userById(userId) {
  return _getBudgetUsersCache().find(u => u.id === userId) ?? { name: userId ?? '?' };
}

function statHTML(label, value, sub, unit = '', extraClass = '') {
  return `
    <div class="stat-card${extraClass}">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}${unit ? `<span class="stat-unit">${unit}</span>` : ''}</div>
      ${sub ? `<div style="font-size:11px;color:var(--ink-3);margin-top:4px">${sub}</div>` : ''}
    </div>`;
}


function historyRowHTML(h) {
  const user = userById(h.userId);
  const diff = (h.toAmount ?? 0) - (h.fromAmount ?? 0);
  const positive = diff >= 0;
  const diffColor = positive ? 'var(--success)' : 'var(--danger)';
  const diffSign = positive ? '+' : '−';
  const eid = escapeHTML(h.id);
  return `
    <tr>
      <td>
        <div style="font-weight:500">${escapeHTML(Fmt.relativeDate(h.date))}</div>
        <div class="text-muted" style="font-size:11px">${escapeHTML(Fmt.dateLong(h.date))}</div>
      </td>
      <td>${userChipHTML(user)}</td>
      <td>${escapeHTML(h.note ?? '')}</td>
      <td class="amount text-muted">${Fmt.zl(h.fromAmount ?? 0)}</td>
      <td class="amount" style="font-weight:500">${Fmt.zl(h.toAmount ?? 0)}</td>
      <td class="amount" style="color:${diffColor};font-weight:500">${diffSign}${Fmt.zl(Math.abs(diff))}</td>
      <td class="row-actions">
        <button class="btn ghost icon-only sm" title="Usuń wpis"
          data-action="delete-savings-history" data-entry-id="${eid}">✕</button>
      </td>
    </tr>`;
}

function goalCardHTML(goal) {
  const pct       = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : null;
  const remaining = goal.target > 0 ? Math.max(0, goal.target - goal.current) : null;
  const completed = pct !== null && pct >= 100;
  const gid       = escapeHTML(goal.id);
  const gcolor    = escapeHTML(goal.color);

  const progressHTML = pct !== null ? `
    <div class="goal-progress">
      <div class="progress" style="height:6px">
        <div style="width:${pct.toFixed(1)}%;background:${gcolor};border-radius:inherit"></div>
      </div>
      <div class="goal-progress-mini" style="margin-top:6px">
        <span>${Fmt.zl(goal.current)} zł</span>
        <span style="flex:1;text-align:right;color:var(--ink-3)">cel: ${Fmt.zl(goal.target)} zł</span>
      </div>
    </div>` : `
    <div class="goal-progress-mini">
      <span style="font-size:13px;font-weight:500">${Fmt.zl(goal.current)} zł</span>
      <span style="color:var(--ink-3);font-size:12px;margin-left:6px">odłożone</span>
    </div>`;

  const suggestion = suggestSavingsTransfer(goal);

  const infoItems = [
    ...(pct !== null ? [
      { label: 'Zebrane', value: `${Fmt.zl(goal.current)} zł` },
      { label: 'Cel', value: `${Fmt.zl(goal.target)} zł` },
      { label: 'Pozostało', value: `${Fmt.zl(remaining)} zł` },
      { label: 'Postęp', value: `${pct.toFixed(0)}%` },
    ] : []),
    ...(goal.deadline ? [{ label: 'Termin', value: Fmt.dateLong(goal.deadline) }] : []),
    ...(suggestion ? [
      {
        label: 'Sugerowany przelew',
        value: `${Fmt.zl(suggestion.amount)} zł/mies.`,
        sub: suggestion.basedOnDeadline
          ? `by zdążyć do terminu${suggestion.canAfford === false ? ' ⚠️' : ''}`
          : `~20% typowej nadwyżki`,
      },
      ...(suggestion.day ? [{
        label: 'Najlepszy moment',
        value: `${suggestion.day}. dnia mies.`,
        sub: `po typowym wpływie`,
      }] : []),
    ] : []),
  ].map(i => `
    <div class="goal-info-item">
      <div class="label">${escapeHTML(i.label)}</div>
      <div class="value">${escapeHTML(i.value)}</div>
      ${i.sub ? `<div style="font-size:10px;color:var(--ink-3);margin-top:1px">${escapeHTML(i.sub)}</div>` : ''}
    </div>`).join('');

  const last5 = (goal.history ?? []).slice(0, 5);
  const contributionsHTML = last5.length ? `
    <div class="contributions-list">
      ${last5.map(h => {
        const diff = (h.toAmount ?? 0) - (h.fromAmount ?? 0);
        const pos  = diff >= 0;
        return `
          <div class="contribution-item">
            <div class="contribution-info">
              <span class="contribution-type">${pos ? '➕' : '➖'}</span>
              <div>
                <div style="font-size:12px;font-weight:500">${escapeHTML(h.note || (pos ? 'Wpłata' : 'Wypłata'))}</div>
                <div class="contribution-date">${escapeHTML(Fmt.relativeDate(h.date))}</div>
              </div>
            </div>
            <div class="contribution-right">
              <span class="contribution-amount" style="color:${pos ? 'var(--success)' : 'var(--danger)'}">
                ${pos ? '+' : ''}${Fmt.zl(diff)} zł
              </span>
            </div>
          </div>`;
      }).join('')}
    </div>` : '';

  const collapsedInfo = pct !== null ? `
    <div class="goal-collapsed-info">
      <div class="collapsed-amounts">
        <span class="collapsed-current">${Fmt.zl(goal.current)}</span>
        <span class="collapsed-separator">/</span>
        <span class="collapsed-target">${Fmt.zl(goal.target)} zł</span>
      </div>
      <span class="collapsed-progress">${pct.toFixed(0)}%</span>
    </div>` : `
    <div class="goal-collapsed-info">
      <span class="collapsed-stat">${Fmt.zl(goal.current)} zł</span>
    </div>`;

  return `
    <div class="savings-goal-card${completed ? ' completed' : ''}" data-goal-id="${gid}">
      <div class="goal-header-collapsible" data-action="toggle-savings-goal" data-goal-id="${gid}">
        <div class="goal-collapse-left">
          <div class="goal-icon" style="background:color-mix(in srgb,${gcolor} 14%,var(--surface-2))">${escapeHTML(goal.icon)}</div>
          <div class="goal-name">${escapeHTML(goal.name)}</div>
          ${completed ? '<span class="goal-completed-badge">✓ Osiągnięty</span>' : ''}
        </div>
        ${collapsedInfo}
      </div>
      <div class="goal-actions-bar">
        <button class="btn sm accent" data-action="savings-goal-deposit" data-goal-id="${gid}" data-mode="add">+ Wpłać</button>
        <button class="btn sm ghost" data-action="savings-goal-deposit" data-goal-id="${gid}" data-mode="sub">− Wypłać</button>
        <button class="btn sm ghost" data-action="edit-savings-goal" data-goal-id="${gid}">Edytuj</button>
        <span style="margin-left:auto;display:flex;gap:6px">
          <button class="btn sm ghost" data-action="close-savings-goal" data-goal-id="${gid}"
            title="Przenieś kwotę do dostępnych środków i usuń cel">↩ Zamknij cel</button>
          <button class="btn sm ghost" style="color:var(--danger)" data-action="delete-savings-goal" data-goal-id="${gid}"
            title="Usuń cel i całą historię wpłat">Usuń</button>
        </span>
      </div>
      <div class="goal-expandable-content">
        ${progressHTML}
        ${infoItems ? `<div class="goal-info" style="margin-top:12px">${infoItems}</div>` : ''}
        ${contributionsHTML}
      </div>
    </div>`;
}

export function renderSavingsSection() {
  const el = document.getElementById('savingsGoalsContent');
  if (!el) return;

  // Zapamiętaj stan collapsed przed re-renderem
  const collapsedIds = new Set(
    [...document.querySelectorAll('.savings-goal-card.collapsed')]
      .map(c => c.dataset.goalId)
      .filter(Boolean)
  );

  const { history, goals } = getSavings();
  const { available, totalAvailable } = calculateAvailableFunds();
  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalFunds = totalAvailable;
  const sharePct = totalFunds > 0 ? Math.min((totalSaved / totalFunds) * 100, 100) : 0;
  const shareFormatted = sharePct.toFixed(1).replace('.', ',');

  el.innerHTML = `
    <div class="col" style="gap:20px">

      <div class="stat-grid">
        ${statHTML('Łącznie odłożone', Fmt.zl(totalSaved), 'suma wszystkich celów')}
        ${statHTML('Dostępne po odjęciu', Fmt.zl(available), 'w obliczeniach limitów', '', available < 0 ? ' danger' : '')}
        ${statHTML('Środki całkowite', Fmt.zl(totalFunds), 'środki bez odjęcia oszczędności')}
        ${statHTML('Udział oszczędności', shareFormatted, 'w środkach całkowitych', '%')}
      </div>

      <div class="card flush">
        <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <h3 style="flex:1;margin:0">Cele oszczędnościowe</h3>
          <span class="tag">${goals.length}</span>
          <button class="btn sm accent" data-action="open-savings-goal-modal">+ Dodaj cel</button>
        </div>
        <div style="padding:${goals.length ? '12px' : '0'}">
          ${goals.length
            ? `<div class="savings-goals-list">${goals.map(goalCardHTML).join('')}</div>`
            : `<div class="savings-empty-state">
                <div style="font-size:28px;margin-bottom:8px">🎯</div>
                <div style="font-size:13px;font-weight:500;margin-bottom:4px">Brak celów</div>
                <div style="font-size:12px">Dodaj pierwszy cel — jego kwota zostanie automatycznie odjęta z budżetu operacyjnego</div>
              </div>`
          }
        </div>
      </div>

      ${history.length ? `
      <div class="card flush">
        <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <h3 style="flex:1;margin:0">Archiwum zmian</h3>
          <span class="tag">${history.length}</span>
          <span style="font-size:11px;color:var(--ink-3)">Historia sprzed migracji</span>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Data</th><th>Użytkownik</th><th>Notatka</th>
              <th class="amount">Z</th><th class="amount">Na</th><th class="amount">Zmiana</th><th></th>
            </tr>
          </thead>
          <tbody>${history.slice(0, 50).map(historyRowHTML).join('')}</tbody>
        </table>
      </div>` : ''}

    </div>`;

  // Przywróć stan collapsed po re-renderze
  if (collapsedIds.size > 0) {
    el.querySelectorAll('.savings-goal-card').forEach(card => {
      if (collapsedIds.has(card.dataset.goalId)) {
        card.classList.add('collapsed');
      }
    });
  }
}
