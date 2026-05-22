import packageJson from '../../package.json';
import { showConfirmModal } from '../components/confirmModal.js';
import { icon } from './icons.js';
import { escapeHTML } from './sanitizer.js';

const VERSION_STORAGE_KEY = 'krezus_last_version';
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
    showConfirmModal(
      'Krezus zaktualizowany',
      `Aplikacja została zaktualizowana do wersji ${currentVersion}.`,
      { confirmText: 'OK', cancelText: 'Zamknij', type: 'info' }
    );
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

function showUpdateModal(newVersion) {
  if (document.getElementById('versionUpdateModal')) return;

  const modal = document.createElement('div');
  modal.id = 'versionUpdateModal';
  modal.className = 'modal active';
  modal.style.zIndex = '10002';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px;">
      <div class="modal-header">
        ${icon('RefreshCw', { size: 18 })}
        <h2>Dostępna aktualizacja</h2>
      </div>
      <div class="modal-body">
        <p style="margin:0; line-height:1.6;">
          Wdrożono nową wersję aplikacji <strong>v${escapeHTML(newVersion)}</strong>.
          Odśwież stronę, żeby załadować aktualizację.
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

  modal.querySelector('#versionUpdateRefresh').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now());
    window.location.href = url.toString();
  });

  modal.querySelector('#versionUpdateDismiss').addEventListener('click', () => {
    modal.remove();
  });
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
      if (remote && remote !== currentVersion) {
        stopVersionPolling();
        document.removeEventListener('visibilitychange', onVisible);
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
