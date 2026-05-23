import packageJson from '../../package.json';
import { showSuccessMessage } from './errorHandler.js';
import { icon } from './icons.js';
import { escapeHTML } from './sanitizer.js';

const VERSION_STORAGE_KEY = 'krezus_last_version';
const DISMISSED_KEY = 'krezus_dismissed_update';
const DISMISS_TTL_MS = 4 * 60 * 60 * 1000; // 4h per device
const POLL_INTERVAL = 5 * 60 * 1000;
let pollTimer = null;

function getAppVersion() {
  return packageJson.version || '1.0.0';
}

export function displayAppVersion() {
  const version = getAppVersion();
  const text = `v${version}`;
  ['appVersion', 'appVersion2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
}

export function checkForUpdate() {
  const currentVersion = getAppVersion();
  const lastVersion = localStorage.getItem(VERSION_STORAGE_KEY);

  if (lastVersion && lastVersion !== currentVersion) {
    showSuccessMessage(`Zaktualizowano do v${currentVersion}`);
  }

  localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
}

async function fetchRemoteVersion() {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version || null;
  } catch {
    return null;
  }
}

function isVersionDismissed(version) {
  try {
    const data = JSON.parse(localStorage.getItem(DISMISSED_KEY) || 'null');
    return data && data.version === version && Date.now() < data.expires;
  } catch {
    return false;
  }
}

function saveDismissed(version) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({
    version,
    expires: Date.now() + DISMISS_TTL_MS,
  }));
}

function showUpdateModal(newVersion) {
  if (document.getElementById('versionUpdateModal')) return;

  const modal = document.createElement('div');
  modal.id = 'versionUpdateModal';
  modal.className = 'modal active';
  modal.style.zIndex = '10002';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:400px">
      <div class="modal-header">
        <div style="
          width:36px;height:36px;border-radius:var(--radius-sm);
          background:var(--accent-soft);color:var(--accent);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        ">${icon('RefreshCw', { size: 18 })}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600;color:var(--ink-1)">Dostępna aktualizacja</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:2px">wersja <strong style="color:var(--accent)">${escapeHTML(newVersion)}</strong></div>
        </div>
      </div>
      <div class="modal-body">
        <p style="margin:0;line-height:1.6;color:var(--ink-2);font-size:14px">
          Wdrożono nową wersję Krezusa. Odśwież stronę, żeby załadować aktualizację — zajmie to tylko chwilę.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="versionUpdateDismiss">Później</button>
        <button class="btn btn-primary" id="versionUpdateRefresh">
          ${icon('RefreshCw', { size: 14 })} Odśwież teraz
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const dismiss = () => {
    saveDismissed(newVersion);
    modal.remove();
  };

  modal.querySelector('#versionUpdateRefresh').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now());
    window.location.href = url.toString();
  });

  modal.querySelector('#versionUpdateDismiss').addEventListener('click', dismiss);

  modal.addEventListener('click', (e) => { if (e.target === modal) dismiss(); });

  const onEsc = (e) => { if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onEsc); } };
  document.addEventListener('keydown', onEsc);
}

export function stopVersionPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function startVersionPolling() {
  if (import.meta.env.DEV) return;

  const currentVersion = getAppVersion();
  let checking = false;

  const check = async () => {
    if (checking) return;
    checking = true;
    try {
      const remote = await fetchRemoteVersion();
      if (remote && remote !== currentVersion && !isVersionDismissed(remote)) {
        showUpdateModal(remote);
      }
    } finally {
      checking = false;
    }
  };

  const onVisible = () => {
    if (!document.hidden) check();
  };

  document.addEventListener('visibilitychange', onVisible);

  setTimeout(check, 10_000);
  pollTimer = setInterval(check, POLL_INTERVAL);
}

export function initVersion() {
  displayAppVersion();
}
