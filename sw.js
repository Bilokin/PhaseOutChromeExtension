chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason == chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.openOptionsPage();
  }
  
  // Initialize with extension disabled for all tabs
  chrome.storage.local.set({ extensionEnabledForTabs: {} });
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    // Unregister scripts for the closed tab
    await chrome.userScripts.unregister({ids:[
      `phaseout-${tabId}-constants`,
      `phaseout-${tabId}-face-api`, 
      `phaseout-${tabId}-user-script`
    ]});
    console.log('Cleaned up scripts for closed tab:', tabId);
    
    // Remove tab from storage
    chrome.storage.local.get(['extensionEnabledForTabs'], (result) => {
      if (result.extensionEnabledForTabs && result.extensionEnabledForTabs[tabId]) {
        delete result.extensionEnabledForTabs[tabId];
        chrome.storage.local.set({ extensionEnabledForTabs: result.extensionEnabledForTabs });
      }
    });
  } catch (error) {
    // Ignore errors for non-existent scripts
    if (error.message.includes('Nonexistent script ID')) {
      console.log('No scripts to clean up for closed tab:', tabId);
    } else {
      console.error('Error cleaning up tab:', error);
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  // Get the URL for the weights folder

  // Generate a URL for a web-accessible resource
  const imagesResourceUrl = chrome.runtime.getURL("images/");
  const weightsResourceUrl = chrome.runtime.getURL("weights/");



  await chrome.userScripts.register([
    {
      id: 'constants',
      matches: ['<all_urls>'],
      js: [{ code: `const IMAGES_URL = "${imagesResourceUrl}";
                    const WEIGHTS_URL = "${weightsResourceUrl}";` }]
    },
    {
      id: 'face-api',
      matches: ['<all_urls>'],
      js: [{ file: 'face-api.min.js' }]
    },
    {
      id: 'user-script',
      matches: ['<all_urls>'],
      js: [{ file: 'user_script.js' }]
    }
  ]);

});


// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') {
    // Get the tab ID from sender.tab.id (for popup messages)
    let tabId;
    
    // First try to get tab ID from sender.tab.id (for popup messages)
    if (sender.tab && sender.tab.id) {
      tabId = sender.tab.id;
    } 
    // If that fails, try to get it from storage
    else {
      chrome.storage.local.get(['activeTabId'], (result) => {
        tabId = result.activeTabId;
        if (!tabId) {
          console.error('No valid tab ID found for toggleExtension');
          sendResponse({status: 'error', message: 'No valid tab ID'});
          return true;
        }
        
        toggleExtension(tabId)
          .then(() => sendResponse({status: 'success'}))
          .catch(error => sendResponse({status: 'error', message: error.message}));
        return true;
      });
      // Return true to keep the message channel open for async response
      return true;
    }
    
    if (!tabId) {
      console.error('No valid tab ID found for toggleExtension');
      sendResponse({status: 'error', message: 'No valid tab ID'});
      return true;
    }
    
    toggleExtension(tabId)
      .then(() => sendResponse({status: 'success'}))
      .catch(error => sendResponse({status: 'error', message: error.message}));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'enableExtensionForTab') {
    // Make sure we have a valid tab ID
    const tabId = request.tabId;
    if (!tabId) {
      console.error('No valid tab ID found for enableExtensionForTab');
      sendResponse({status: 'error', message: 'No valid tab ID'});
      return true;
    }
    
    enableExtensionForTab(tabId)
      .then(() => sendResponse({status: 'success'}))
      .catch(error => sendResponse({status: 'error', message: error.message}));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'disableExtensionForTab') {
    // Make sure we have a valid tab ID
    const tabId = request.tabId;
    if (!tabId) {
      console.error('No valid tab ID found for disableExtensionForTab');
      sendResponse({status: 'error', message: 'No valid tab ID'});
      return true;
    }
    
    disableExtensionForTab(tabId)
      .then(() => sendResponse({status: 'success'}))
      .catch(error => sendResponse({status: 'error', message: error.message}));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getSampleImages') {
    // Get sample images from storage
    chrome.storage.local.get(['sampleImages'], (result) => {
      sendResponse({sampleImages: result.sampleImages || []});
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'isExtensionEnabledForTab') {
    const tabId = request.tabId;
    if (!tabId) {
      console.error('No valid tab ID found for isExtensionEnabledForTab');
      sendResponse({status: 'error', message: 'No valid tab ID'});
      return true;
    }
    
    chrome.storage.local.get(['extensionEnabledForTabs'], (result) => {
      const enabledForTabs = result.extensionEnabledForTabs || {};
      sendResponse({enabled: enabledForTabs[tabId] === true});
    });
    return true; // Keep message channel open for async response
  }
});

// Toggle extension state for a specific tab
async function toggleExtension(tabId) {
  try {
    // Get current state for this specific tab
    const result = await chrome.storage.local.get(['extensionEnabledForTabs']);
    const enabledForTabs = result.extensionEnabledForTabs || {};
    
    // Toggle the state for this specific tab only
    const newEnabledState = !enabledForTabs[tabId];
    
    // Update storage with the new state for this tab
    enabledForTabs[tabId] = newEnabledState;
    await chrome.storage.local.set({ extensionEnabledForTabs: enabledForTabs });
    
    if (newEnabledState) {
      await enableExtensionForTab(tabId);
    } else {
      await disableExtensionForTab(tabId);
    }
    
    console.log(`Extension toggled to ${newEnabledState} for tab:`, tabId);
  } catch (error) {
    console.error('Error toggling extension:', error);
    throw error;
  }
}

// Enable extension for a specific tab
async function enableExtensionForTab(tabId) {
  try {
    // Get the URL for the weights folder
    const imagesResourceUrl = chrome.runtime.getURL("images/");
    const weightsResourceUrl = chrome.runtime.getURL("weights/");

    console.log('enableExtensionForTab');

    // First, get sample images from storage to inject into user script
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['sampleImages'], resolve);
    });

    const sampleImages = result.sampleImages || [];

    // Create a code string that will be injected to make sample images available in user script context
    let sampleImagesCode = '';
    if (sampleImages.length > 0) {
      // Make sure each image has proper structure with label and imageUrl
      const processedImages = sampleImages.map(img => ({
        label: img.name || 'Unknown',
        imageUrl: img.imageUrl || ''
      })).filter(img => img.label && img.imageUrl);

      sampleImagesCode = `
        window.sampleImages = ${JSON.stringify(processedImages)};
      `;
    } else {
      // If no stored images, provide default images
      sampleImagesCode = `
        window.sampleImages = [
          { label: 'Penny', imageUrl: '${imagesResourceUrl}person1.jpg' },
          { label: 'Penny', imageUrl: '${imagesResourceUrl}person1a.jpg' },
          { label: 'Penny', imageUrl: '${imagesResourceUrl}person1b.jpg' },
          { label: 'Sheldon', imageUrl: '${imagesResourceUrl}person2.jpg' }
        ];
      `;
    }

    // Register content scripts for this specific tab only using userScripts API
    await chrome.userScripts.register([
      {
        id: `phaseout-${tabId}-constants`,
        matches: ["<all_urls>"],
        js: [{ code: `const IMAGES_URL = "${imagesResourceUrl}"; const WEIGHTS_URL = "${weightsResourceUrl}";` }]
      },
      {
        id: `phaseout-${tabId}-face-api`,
        matches: ["<all_urls>"],
        js: [{ file: 'face-api.min.js' }]
      },
      {
        id: `phaseout-${tabId}-user-script`,
        matches: ["<all_urls>"],
        js: [
          { file: 'user_script.js' },
          { code: sampleImagesCode }
        ]
      }
    ]);

    console.log('Extension enabled for tab:', tabId);
  } catch (error) {
    console.error('Error enabling extension:', error);
    throw error;
  }
}

// Disable extension for a specific tab
async function disableExtensionForTab(tabId) {
  try {
    // Unregister the content scripts for this specific tab only
    await chrome.userScripts.unregister({ids:[
      `phaseout-${tabId}-constants`,
      `phaseout-${tabId}-face-api`, 
      `phaseout-${tabId}-user-script`
    ]});
    console.log('Extension disabled for tab:', tabId);
  } catch (error) {
    // Ignore errors for non-existent scripts - this is expected when no scripts were registered
    if (error.message.includes('Nonexistent script ID')) {
      console.log('No scripts to unregister for tab:', tabId);
    } else {
      console.error('Error disabling extension:', error);
    }
  }
}
