// src/ui/renderSavingsGoals.js
import { escapeHTML } from '../utils/sanitizer.js';
import { getSavingsGoals, getSavingsContributions } from '../modules/savingsGoalManager.js';
import { calculateGoalProgress, calculateSavingsStats, getGoalContributionHistory } from '../modules/savingsGoalCalculator.js';
import { icon } from '../utils/icons.js';
import { ringGaugeHTML } from './charts.js';
import { Fmt } from '../utils/fmt.js';

let activeGoalId = null;

const GOAL_COLORS = ['#4caf7d','#4c7daf','#9c4caf','#af9c4c','#af4c7d','#4cafaf'];

function goalColor(index) {
  return GOAL_COLORS[index % GOAL_COLORS.length];
}

function relDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = Math.round((d - Date.now()) / 86400000);
  if (days < 0) return 'Po terminie';
  if (days === 0) return 'Dziś';
  if (days < 7) return `Za ${days} dni`;
  if (days < 30) return `Za ${Math.round(days / 7)} tyg.`;
  return `Za ${Math.round(days / 30)} mies.`;
}

function longDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pl-PL', { year:'numeric', month:'long', day:'numeric' });
}

export function selectSavingsGoal(goalId) {
  activeGoalId = goalId;
  renderSavingsGoals();
}

export function renderSavingsGoals() {
  const contentDiv = document.getElementById('savingsGoalsContent');
  if (!contentDiv) return;

  const goals = getSavingsGoals();

  if (goals.length === 0) {
    contentDiv.innerHTML = renderEmptyState();
    return;
  }

  const stats = calculateSavingsStats();
  const allContribs = getSavingsContributions();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTotal = allContribs
    .filter(c => (c.date || '').startsWith(thisMonth))
    .reduce((s, c) => s + (c.amount || 0), 0);

  const sortedGoals = [
    ...goals.filter(g => g.status === 'active'),
    ...goals.filter(g => g.status !== 'active'),
  ];

  if (!activeGoalId || !sortedGoals.find(g => g.id === activeGoalId)) {
    activeGoalId = sortedGoals[0]?.id || null;
  }

  const activeIdx   = sortedGoals.findIndex(g => g.id === activeGoalId);
  const activeGoal  = activeIdx >= 0 ? sortedGoals[activeIdx] : null;

  contentDiv.innerHTML = `
    ${renderHeader()}
    ${renderStatGrid(stats, monthTotal)}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px">
      ${renderGoalList(sortedGoals)}
      <div id="savingsGoalDetail">
        ${activeGoal ? renderGoalDetail(activeGoal, activeIdx) : ''}
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="row between" style="flex-wrap:wrap;gap:12px;align-items:flex-start;margin-bottom:20px">
      <p class="lead" style="margin:0">Wiele celów oszczędnościowych. Łączna kwota odłożonych środków zostaje wyłączona z dostępnego budżetu.</p>
      <button class="btn accent sm" data-action="open-add-savings-goal-modal">
        ${icon('Plus', { size: 13, strokeWidth: 2 })} Nowy cel
      </button>
    </div>
    <div class="card">
      <div class="empty-state" style="padding:60px 20px;text-align:center">
        <p style="font-size:2rem;margin:0 0 12px">🎯</p>
        <p style="font-weight:500;margin:0 0 8px">Brak celów oszczędzania</p>
        <p class="text-mute text-sm" style="max-width:360px;margin:0 auto 16px">Dodaj swój pierwszy cel, a aplikacja będzie sugerować bezpieczne kwoty do odłożenia.</p>
        <button class="btn accent sm" data-action="open-add-savings-goal-modal">
          ${icon('Plus', { size: 13, strokeWidth: 2 })} Nowy cel
        </button>
      </div>
    </div>
  `;
}

function renderHeader() {
  return `
    <div class="row between" style="flex-wrap:wrap;gap:12px;align-items:flex-start;margin-bottom:20px">
      <p class="lead" style="margin:0">Wiele celów oszczędnościowych. Łączna kwota odłożonych środków zostaje wyłączona z dostępnego budżetu.</p>
      <button class="btn accent sm" data-action="open-add-savings-goal-modal">
        ${icon('Plus', { size: 13, strokeWidth: 2 })} Nowy cel
      </button>
    </div>
  `;
}

function renderStatGrid(stats, monthTotal) {
  return `
    <div class="card" style="margin-bottom:20px">
      <div class="stat-grid" style="margin-bottom:0;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">
        <div class="stat">
          <div class="label">Łącznie odłożone</div>
          <div class="value num">${Fmt.zl(stats.totalCurrentAmount)}<span class="unit">zł</span></div>
          <div class="sub">z ${Fmt.zl(stats.totalTargetAmount)} zł</div>
        </div>
        <div class="stat">
          <div class="label">Cele aktywne</div>
          <div class="value">${stats.activeGoals}</div>
          <div class="sub">${stats.completedGoals} osiągniętych</div>
        </div>
        <div class="stat">
          <div class="label">Postęp ogólny</div>
          <div class="value">${Math.round(stats.progressPercentage)}<span class="unit">%</span></div>
        </div>
        <div class="stat">
          <div class="label">Wpłaty w tym mies.</div>
          <div class="value num">${Fmt.zl(monthTotal)}<span class="unit">zł</span></div>
        </div>
      </div>
    </div>
  `;
}

function renderGoalList(sortedGoals) {
  const items = sortedGoals.map((goal, i) => {
    const color = goalColor(i);
    const progress = calculateGoalProgress(goal.id);
    const pct = Math.min(progress.percentage, 100);
    const isActive = goal.id === activeGoalId;
    const btnStyle = isActive
      ? `background:var(--surface-2);border-left:3px solid ${color};`
      : `background:transparent;border-left:3px solid transparent;`;

    return `
      <button
        style="width:100%;padding:12px 18px;border-top:none;border-right:none;border-bottom:1px solid var(--line);${btnStyle}display:flex;gap:12px;align-items:center;text-align:left;cursor:pointer"
        data-action="select-savings-goal"
        data-goal-id="${escapeHTML(goal.id)}"
      >
        <div style="width:36px;height:36px;border-radius:10px;background:${color};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${escapeHTML(goal.icon || '🎯')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(goal.name)}</div>
          <div class="text-mute" style="font-size:11px">${escapeHTML(relDate(goal.targetDate))}</div>
        </div>
        <div style="flex-shrink:0;text-align:right">
          <div class="num" style="font-size:12px;font-weight:500">${Math.round(pct)}%</div>
          <div class="progress" style="width:60px;margin-top:4px;height:4px">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:inherit;transition:width 400ms ease"></div>
          </div>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="card flush">
      <div class="card-header" style="padding:14px 18px">
        <h3>Twoje cele <span class="tag" style="font-weight:400;font-size:12px">${sortedGoals.length}</span></h3>
      </div>
      <div>${items}</div>
    </div>
  `;
}

function renderGoalDetail(goal, goalIndex) {
  const color = goalColor(goalIndex);
  const progress = calculateGoalProgress(goal.id);
  const pct = Math.min(progress.percentage, 100);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const iconEdit  = icon('Edit',  { size: 13, strokeWidth: 1.5 });
  const iconTrash = icon('Trash', { size: 13, strokeWidth: 1.5 });
  const iconPlus  = icon('Plus',  { size: 13, strokeWidth: 2 });

  const ring = ringGaugeHTML(goal.currentAmount, goal.targetAmount, {
    size: 180,
    color,
    label: `${Math.round(pct)}%`,
    sublabel: 'celu',
  });

  return `
    <div class="card">
      <!-- Top row -->
      <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">
        <div style="width:56px;height:56px;border-radius:14px;background:${color};display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${escapeHTML(goal.icon || '🎯')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:20px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(goal.name)}</div>
          ${goal.targetDate ? `<div class="text-mute text-sm">Termin: <strong>${escapeHTML(longDate(goal.targetDate))}</strong> · ${escapeHTML(relDate(goal.targetDate))}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn sm" data-action="edit-savings-goal" data-id="${escapeHTML(goal.id)}">${iconEdit} Edytuj</button>
          <button class="btn sm" style="color:var(--danger);border-color:color-mix(in srgb,var(--danger) 30%,var(--line))" data-action="delete-savings-goal" data-id="${escapeHTML(goal.id)}">${iconTrash}</button>
        </div>
      </div>

      <!-- Ring + Metrics -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin-bottom:20px">
        ${ring}
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="stat">
            <div class="label">Odłożone</div>
            <div class="value num" style="color:var(--success)">${Fmt.zl(goal.currentAmount)}<span class="unit">zł</span></div>
          </div>
          <div class="stat">
            <div class="label">Cel</div>
            <div class="value num">${Fmt.zl(goal.targetAmount)}<span class="unit">zł</span></div>
          </div>
          <div class="stat">
            <div class="label">Pozostało</div>
            <div class="value num">${Fmt.zl(remaining)}<span class="unit">zł</span></div>
          </div>
          ${goal.status === 'active' ? `
            <button class="btn accent sm" style="margin-top:6px" data-action="open-deposit-modal" data-goal-id="${escapeHTML(goal.id)}">
              ${iconPlus} Wpłać na ten cel
            </button>
          ` : ''}
        </div>
      </div>

      <hr class="divider"/>

      <!-- Historia wpłat -->
      <h3 style="margin-bottom:12px">Historia wpłat</h3>
      ${renderContributionHistory(goal.id)}

      <hr class="divider"/>

      <!-- Sugestie -->
      <h3 style="margin-bottom:12px">Sugestie</h3>
      ${renderSuggestions(goal)}
    </div>
  `;
}

function renderContributionHistory(goalId) {
  const history = getGoalContributionHistory(goalId);
  if (history.length === 0) {
    return '<p class="text-mute text-sm" style="margin-bottom:12px">Brak historii wpłat.</p>';
  }
  const sorted = [...history].sort((a, b) =>
    (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))
  );
  const shown = sorted.slice(0, 5);
  return `
    <table class="table" style="font-size:13px;margin-bottom:12px">
      <thead><tr>
        <th>Data</th>
        <th class="amount">Kwota</th>
      </tr></thead>
      <tbody>
        ${shown.map(c => `
          <tr>
            <td>${escapeHTML(c.date || '—')}</td>
            <td class="amount" style="color:var(--success);font-weight:500">+${Fmt.zl(c.amount || 0)} zł</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${history.length > 5 ? `<p class="text-mute text-sm">… i ${history.length - 5} wcześniejszych wpłat.</p>` : ''}
  `;
}

function renderSuggestions(goal) {
  const history = getGoalContributionHistory(goal.id);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const rows = [];

  if (remaining === 0) {
    return '<p class="text-mute text-sm">Cel osiągnięty! 🎉</p>';
  }

  // Przy obecnym tempie
  if (history.length >= 2) {
    const oldest = [...history].sort((a, b) => a.date.localeCompare(b.date))[0];
    const monthsSince = Math.max(1, (Date.now() - new Date(oldest.date)) / (1000 * 60 * 60 * 24 * 30));
    const totalPaid = history.reduce((s, c) => s + (c.amount || 0), 0);
    const monthlyRate = totalPaid / monthsSince;
    if (monthlyRate > 0) {
      const monthsLeft = Math.ceil(remaining / monthlyRate);
      rows.push({ emoji: '🎯', text: `Przy obecnym tempie cel osiągniesz za ok. ${monthsLeft} ${monthsLeft === 1 ? 'miesiąc' : 'miesięcy'}.` });
    }
  }

  // Aby zdążyć przed terminem
  if (goal.targetDate) {
    const months = Math.max(1, (new Date(goal.targetDate) - Date.now()) / (1000 * 60 * 60 * 24 * 30));
    const requiredMonthly = remaining / months;
    rows.push({ emoji: '💡', text: `Aby zdążyć przed ${longDate(goal.targetDate)}, wpłacaj co miesiąc ok. ${Fmt.zl(requiredMonthly)} zł.` });
  }

  if (rows.length === 0) {
    return '<p class="text-mute text-sm">Brak sugestii — dodaj wpłaty, by zobaczyć tempo oszczędzania.</p>';
  }

  return `<div style="display:flex;flex-direction:column;gap:8px">
    ${rows.map(r => `
      <div style="display:flex;gap:10px;padding:12px;background:var(--surface-2);border-radius:10px">
        <span style="font-size:18px;flex-shrink:0">${r.emoji}</span>
        <span style="font-size:13px;color:var(--ink-2)">${escapeHTML(r.text)}</span>
      </div>
    `).join('')}
  </div>`;
}

export { showSuccessMessage as showSavingsSuccessMessage, showErrorMessage as showSavingsErrorMessage } from '../utils/errorHandler.js';
