chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason == chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.openOptionsPage();
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
      id: 'weights-script',
      matches: ['<all_urls>'],
      js: [{ file: 'weights_base64.js' }]
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
  if (request.action === 'enableExtensionForTab') {
    enableExtensionForTab(request.tabId)
      .then(() => sendResponse({status: 'success'}))
      .catch(error => sendResponse({status: 'error', message: error.message}));
    return true; // Keep message channel open for async response
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'disableExtensionForTab') {
    disableExtensionForTab(request.tabId)
      .then(() => sendResponse({status: 'success'}))
      .catch(error => sendResponse({status: 'error', message: error.message}));
    return true; // Keep message channel open for async response
  }
});

// Enable extension for a specific tab
async function enableExtensionForTab(tabId) {
  try {
    await chrome.storage.local.set({ extensionEnabled: true, activeTabId: tabId });
    // Get the URL for the weights folder
    const imagesResourceUrl = chrome.runtime.getURL("images/");
    const weightsResourceUrl = chrome.runtime.getURL("weights/");
    console.log('enableExtensionForTab');
    
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
        js: [{ file: 'user_script.js' }]
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
    await chrome.storage.local.set({ extensionEnabled: false, activeTabId: tabId });
    // Unregister the content scripts for this specific tab only
    await chrome.userScripts.unregister({ids:[
      `phaseout-${tabId}-constants`,
      `phaseout-${tabId}-face-api`, 
      `phaseout-${tabId}-user-script`
    ]});
    console.log('Extension disabled for tab:', tabId);
  } catch (error) {
    console.error('Error disabling extension:', error);
  }
}

