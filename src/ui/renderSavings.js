// src/ui/renderSavings.js
import { getSavings } from '../modules/dataManager.js';
import { calculateAvailableFunds } from '../modules/budgetCalculator.js';
import { Fmt } from '../utils/fmt.js';
import { icon } from '../utils/icons.js';
import { userChipHTML } from './chips.js';
import { escapeHTML } from '../utils/sanitizer.js';

let _getBudgetUsersCache = () => [];
export function setSavingsDeps({ getBudgetUsersCache }) {
  _getBudgetUsersCache = getBudgetUsersCache;
}

function userById(userId) {
  return _getBudgetUsersCache().find(u => u.id === userId) ?? { name: userId ?? '?' };
}

function statHTML(label, value, sub, unit = '') {
  return `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}${unit ? `<span class="stat-unit">${unit}</span>` : ''}</div>
      <div class="sub">${sub}</div>
    </div>`;
}

function infoRowHTML(iconName, title, text) {
  return `
    <div style="display:flex;gap:10px;padding:12px;background:var(--surface-2);border-radius:10px">
      <div style="flex-shrink:0;color:var(--accent);margin-top:1px">${icon(iconName, { size: 14 })}</div>
      <div>
        <div style="font-size:13px;font-weight:500;margin-bottom:2px">${title}</div>
        <div style="font-size:12px;color:var(--ink-3);line-height:1.5">${text}</div>
      </div>
    </div>`;
}

function historyRowHTML(h) {
  const user = userById(h.userId);
  const diff = (h.toAmount ?? 0) - (h.fromAmount ?? 0);
  const positive = diff >= 0;
  const diffColor = positive ? 'var(--success)' : 'var(--danger)';
  const diffSign = positive ? '+' : '−';
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
    </tr>`;
}

export function renderSavingsSection() {
  const el = document.getElementById('savingsGoalsContent');
  if (!el) return;

  const { current, history } = getSavings();
  const { available, totalAvailable } = calculateAvailableFunds();
  // totalAvailable = incomes − expenses (przed odjęciem savings) = "środki całkowite"
  const totalFunds = totalAvailable;
  const sharePct = totalFunds > 0 ? Math.min((current / totalFunds) * 100, 100) : 0;
  const availableColor = available < 0 ? 'var(--danger)' : 'var(--success)';
  const shareFormatted = sharePct.toFixed(1).replace('.', ',');

  const historyRows = history.length
    ? history.map(historyRowHTML).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:32px 0;color:var(--ink-3)">
        <div style="font-size:13px;font-weight:500;margin-bottom:4px">Brak zmian</div>
        <div style="font-size:12px">Pierwsza zmiana kwoty pojawi się tutaj</div>
       </td></tr>`;

  el.innerHTML = `
    <div class="col" style="gap:20px">

      <p class="lead">
        Odłożona kwota, którą wykluczasz z dostępnych środków. Wprowadzasz jedną liczbę — system odejmuje ją od budżetu przy każdym wyliczeniu limitów.
      </p>

      <div class="stat-grid">
        ${statHTML('Odłożone', Fmt.zl(current), 'wykluczone z budżetu')}
        ${statHTML('Dostępne po odjęciu', Fmt.zl(available), 'w obliczeniach limitów')}
        ${statHTML('Środki całkowite', Fmt.zl(totalFunds), 'odłożone + dostępne')}
        ${statHTML('Udział oszczędności', shareFormatted, 'w środkach całkowitych', '%')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px;align-items:stretch">

        <div class="card" style="display:flex;flex-direction:column;justify-content:center;padding:28px;min-height:280px">
          <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">
            Aktualnie odłożone
          </div>
          <div class="num" style="font-size:clamp(36px,6vw,56px);font-weight:500;letter-spacing:-0.03em;line-height:1.05;margin-top:12px">
            ${Fmt.zl(current)}<span style="font-size:0.4em;color:var(--ink-3);font-weight:400;margin-left:6px">zł</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px;font-size:12px">
            <div style="display:flex;justify-content:space-between">
              <span style="color:var(--ink-3)">Środki całkowite</span>
              <span class="num">${Fmt.zl(totalFunds)} zł</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:var(--ink-3)">− Odłożone</span>
              <span class="num">${Fmt.zl(current)} zł</span>
            </div>
            <div class="progress" style="height:8px">
              <div style="width:${sharePct}%;background:var(--success)"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3)">
              <span>= Dostępne dla budżetu</span>
              <strong class="num" style="color:${availableColor}">${Fmt.zl(available)} zł</strong>
            </div>
          </div>

          <button class="btn accent" data-action="open-savings-modal"
            style="margin-top:20px;align-self:flex-start">
            ${icon('Edit', { size: 14 })} Zmień kwotę oszczędności
          </button>
        </div>

        <div class="card">
          <div class="card-hd">
            <h3>Jak działa moduł oszczędności</h3>
            <span class="sub">Prosta logika, bez celów</span>
          </div>
          <p style="font-size:13px;color:var(--ink-2);margin:0 0 16px">
            Oszczędności to <strong>pojedyncza kwota</strong>, którą deklarujesz jako odłożoną. System pomniejsza o nią dostępne środki przy wyliczaniu Koperty Dnia oraz limitów dziennych — tak, żeby budżet operacyjny nie obejmował tej puli.
          </p>
          <div class="col" style="gap:10px">
            ${infoRowHTML('Wallet', 'Nie zmienia środków na koncie', 'Zmiana kwoty oszczędności to tylko deklaracja księgowa — nie generuje transakcji.')}
            ${infoRowHTML('Target', 'Wpływa na limity', 'Koperta dnia i limity dzienne są wyliczane z (Dostępne − Oszczędności).')}
            ${infoRowHTML('Clock', 'Historia zmian jest zachowana', 'Każda korekta kwoty trafia do logów — wiesz kto, kiedy i o ile zmienił.')}
          </div>
        </div>

      </div>

      <div class="card flush">
        <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <h3 style="flex:1;margin:0">Historia zmian</h3>
          <span class="tag">${history.length}</span>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Użytkownik</th>
              <th>Notatka</th>
              <th class="amount">Z</th>
              <th class="amount">Na</th>
              <th class="amount">Zmiana</th>
            </tr>
          </thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>

    </div>`;
}
