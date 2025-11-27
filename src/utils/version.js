/**
 * Automatic Version Management
 * Reads version from package.json and displays it in the app header
 */

/**
 * Get version from package.json
 * @returns {Promise<string>} Version string
 */
async function getAppVersion() {
  try {
    const response = await fetch('/package.json');
    const packageData = await response.json();
    return packageData.version || '1.0.0';
  } catch (error) {
    console.error('Failed to load version:', error);
    return '1.0.0';
  }
}

/**
 * Display version in the app header
 */
export async function displayAppVersion() {
  const version = await getAppVersion();
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
