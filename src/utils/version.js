import packageJson from '../../package.json';
import { showConfirmModal } from '../components/confirmModal.js';

const VERSION_STORAGE_KEY = 'krezus_last_version';

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

export function initVersion() {
  displayAppVersion();
}
