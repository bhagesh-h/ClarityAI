import { getProvider } from './providers';
import { GenerateRequest } from './types';

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if ((window as any).triggerClarity) {
          (window as any).triggerClarity();
        } else {
          console.log("Clarity AI: Content script not ready yet.");
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GENERATE_AI') {
    const request = message.payload as GenerateRequest;
    const provider = getProvider(request.config.providerType);
    
    provider.generate(request)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Background AI Error:', error);
        sendResponse({ success: false, error: error.message || 'AI Generation failed' });
      });
    
    return true; // Keep channel open for async response
  }

  if (message.action === 'TEST_CONNECTION') {
    const config = message.payload;
    const provider = getProvider(config.providerType);
    
    provider.testConnection(config)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ success: false, message: error.message || 'Connection test failed' });
      });
      
    return true;
  }
});
