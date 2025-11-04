document.addEventListener('DOMContentLoaded', async function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  const refreshBtn = document.getElementById('refreshBtn');

  // Get the active tab
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  // Check if the extension is currently enabled for this tab by checking storage
  try {
    const result = await chrome.storage.local.get(['extensionEnabled', 'activeTabId']);
    const isExtensionEnabled = result.extensionEnabled === true; // Default to false (disabled) if not set
    const activeTabId = result.activeTabId;
    
    // Update UI based on current status
    updateUI(isExtensionEnabled);
    
    // Set up toggle switch event listener
    toggleSwitch.addEventListener('change', async function() {
      // Send message to service worker to toggle extension
      const response = await chrome.runtime.sendMessage({
        action: 'toggleExtension'
      });
      
      if (response && response.status === 'success') {
        // Update the storage state and UI
        const newStatus = !isExtensionEnabled;
        updateUI(newStatus);
        
        if (newStatus) {
          statusText.textContent = 'Extension is active for this tab';
          statusText.className = 'status-text active';
        } else {
          statusText.textContent = 'Extension is inactive for this tab';
          statusText.className = 'status-text inactive';
        }
      }
    });
    if (isExtensionEnabled) {
      // Send message to service worker to enable extension for current tab
      await chrome.runtime.sendMessage({
        action: 'enableExtensionForTab',
        tabId: tab.id
      });
    } else {
      await chrome.runtime.sendMessage({
        action: 'disableExtensionForTab',
        tabId: tab.id
      });
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    updateUI(false); // Default to disabled if there's an error
  }
  
  // Set up refresh button
  refreshBtn.addEventListener('click', async function() {
  await chrome.tabs.reload(tab.id);
  statusText.textContent = 'Refreshing tab and re-injecting scripts...';
  setTimeout(async () => {
    try {
      const result = await chrome.storage.local.get(['extensionEnabled', 'activeTabId']);
      updateUI(result.extensionEnabled);
    } catch (error) {
      console.error('Error after refresh:', error);
      updateUI(false);
    }
  }, 1000);
});
});





// Update UI elements based on current status
function updateUI(isActive) {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  
  // Handle case where element might not be loaded yet
  if (toggleSwitch) {
    toggleSwitch.checked = isActive;
  }
  
  if (statusText) {
    if (isActive) {
      statusText.textContent = 'Extension is active for this tab';
      statusText.className = 'status-text active';
    } else {
      statusText.textContent = 'Extension is inactive for this tab';
      statusText.className = 'status-text inactive';
    }
  }
}