window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'FETCH_IMAGE') {
    try {
      // Send message to service worker
      const response = await chrome.runtime.sendMessage({
        action: 'fetchImage',
        url: event.data.url
      });
      
      window.postMessage({
        type: 'FETCH_IMAGE_RESPONSE',
        requestId: event.data.requestId,
        dataUrl: response.dataUrl,
        error: response.error
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'FETCH_IMAGE_RESPONSE',
        requestId: event.data.requestId,
        error: error.message
      }, '*');
    }
  }
});