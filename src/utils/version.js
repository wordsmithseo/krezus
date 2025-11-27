/**
 * Automatic Version Management
 * Reads version from package.json and displays it in the app header
 */

import packageJson from '../../package.json';

/**
 * Get version from package.json
 * @returns {string} Version string
 */
function getAppVersion() {
  return packageJson.version || '1.0.0';
}

/**
 * Display version in the app header
 */
export function displayAppVersion() {
  const version = getAppVersion();
  const versionElement = document.getElementById('appVersion');

  if (versionElement) {
    versionElement.textContent = `v${version}`;
  }
}

/**
 * Initialize version display
 */
export function initVersion() {
  // Display version immediately when app loads
  displayAppVersion();
}
