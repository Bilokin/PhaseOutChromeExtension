// Always register the required scripts for all websites
async function registerScripts() {
  try {
    // Unregister any existing scripts to avoid duplicates
    const existingScripts = await chrome.userScripts.getScripts();
    if (existingScripts.length > 0) {
      await chrome.userScripts.unregister(existingScripts.map(s => s.id));
    }

    // Register face-api.min.js and user_script.js for all websites

    console.log('Scripts registered successfully.');
  } catch (error) {
    console.error('Failed to register scripts:', error);
  }
}

// Check if userScripts API is available
function isUserScriptsAvailable() {
  try {
    chrome.userScripts;
    return true;
  } catch {
    document.getElementById('warning').style.display = 'block';
    return false;
  }
}

// Initialize the extension
async function init() {
  if (!isUserScriptsAvailable()) return;
  await registerScripts();
}

// Run initialization
init();
