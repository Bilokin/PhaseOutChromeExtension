document.addEventListener('DOMContentLoaded', async function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  const refreshBtn = document.getElementById('refreshBtn');

  // Get the active tab
  let tab;
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    tab = tabs[0];
  } catch (error) {
    console.error('Error getting active tab:', error);
    tab = null;
  }
  
  // Check if the extension is currently enabled for this tab by checking storage
  try {
    // First check if we have a valid tab ID
    if (!tab || !tab.id) {
      console.error('No valid tab ID found');
      updateUI(false);
      return;
    }
    
    // Get current state for this specific tab
    const result = await chrome.storage.local.get(['extensionEnabledForTabs']);
    const enabledForTabs = result.extensionEnabledForTabs || {};
    const isExtensionEnabled = enabledForTabs[tab.id] === true;
    
    // Update UI based on current status
    updateUI(isExtensionEnabled);
    
    // Set up toggle switch event listener
    toggleSwitch.addEventListener('change', async function(event) {
      // Prevent immediate toggling if already processing
      if (toggleSwitch.disabled) return;
      
      // Disable the switch during processing to prevent multiple clicks
      toggleSwitch.disabled = true;
      
      try {
        // Send message to service worker to toggle extension for this specific tab
        const response = await chrome.runtime.sendMessage({
          action: 'toggleExtension',
          tabId: tab.id  // Explicitly pass the tab ID
        });
        
        if (response && response.status === 'success') {
          // Update the storage state and UI
          const newStatus = event.target.checked;
          updateUI(newStatus);
          
          if (newStatus) {
            statusText.textContent = 'Extension is active for this tab';
            statusText.className = 'status-text active';
          } else {
            statusText.textContent = 'Extension is inactive for this tab';
            statusText.className = 'status-text inactive';
          }
        } else if (response && response.status === 'error') {
          console.error('Error toggling extension:', response.message);
          // Revert UI to previous state
          updateUI(isExtensionEnabled);
        }
      } catch (error) {
        console.error('Error in toggle switch:', error);
        // Revert UI to previous state
        updateUI(isExtensionEnabled);
      } finally {
        // Re-enable the switch after processing
        toggleSwitch.disabled = false;
      }
    });
    
    // Send message to service worker to enable or disable extension for current tab
    if (tab && tab.id) {
      try {
        // Store the active tab ID in storage
        await chrome.storage.local.set({ activeTabId: tab.id });
        
        // Only send enable/disable messages if we're not already in the process of toggling
        // The service worker will handle the correct state based on storage
        if (isExtensionEnabled) {
          // Just make sure it's enabled for this tab
          await chrome.runtime.sendMessage({
            action: 'enableExtensionForTab',
            tabId: tab.id
          });
        } else {
          // Just make sure it's disabled for this tab  
          await chrome.runtime.sendMessage({
            action: 'disableExtensionForTab',
            tabId: tab.id
          });
        }
      } catch (error) {
        console.error('Error sending message to service worker:', error);
      }
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    updateUI(false); // Default to disabled if there's an error
  }
  
  // Set up refresh button
  refreshBtn.addEventListener('click', async function() {
    if (tab && tab.id) {
      await chrome.tabs.reload(tab.id);
      statusText.textContent = 'Refreshing tab and re-injecting scripts...';
      setTimeout(async () => {
        try {
          const result = await chrome.storage.local.get(['extensionEnabledForTabs']);
          const enabledForTabs = result.extensionEnabledForTabs || {};
          const isExtensionEnabled = enabledForTabs[tab.id] === true;
          updateUI(isExtensionEnabled);
        } catch (error) {
          console.error('Error after refresh:', error);
          updateUI(false);
        }
      }, 1000);
    }
  });
});

// Update UI elements based on current status
function updateUI(isActive) {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  
  // Handle case where element might not be loaded yet
  if (toggleSwitch) {
    // Use a timeout to ensure the DOM is fully updated
    setTimeout(() => {
      toggleSwitch.checked = isActive;
    }, 0);
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