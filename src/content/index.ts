import React from 'react';
import { createRoot } from 'react-dom/client';
import Widget from '../components/Widget.tsx';
import { useClarityStore } from '../store.ts';
import { extractPageData } from './extractor.ts';
import { getProvider } from '../providers/index.ts';
import styles from '../index.css?inline';

// 0. Guard: Don't load the widget if we're in the extension popup context
const isExtensionPopup = typeof window !== 'undefined' && 
  (window.location.protocol === 'chrome-extension:' || window.location.href.includes('clarity-extension'));

if (!isExtensionPopup) {
  // 1. Create container and shadow root for the widget
  const containerId = 'clarity-ai-root';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    document.body.appendChild(container);
    
    const shadowRoot = container.attachShadow({ mode: 'open' });
    
    // Inject tailwind styles into shadow root ONLY
    const styleTag = document.createElement('style');
    styleTag.textContent = styles as unknown as string;
    shadowRoot.appendChild(styleTag);

    const innerRoot = document.createElement('div');
    innerRoot.id = 'clarity-inner-root';
    shadowRoot.appendChild(innerRoot);
    
    const root = createRoot(innerRoot);
    root.render(React.createElement(Widget));
  }
}

// 2. Handle background messages
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    const store = useClarityStore.getState();
    if (message.action === 'TOGGLE_WIDGET') {
      if (!store.isOpen) {
        store.setOpen(true);
      } else {
        // If already open, clicking icon might want to trigger analysis or just close?
        // Usually extension users expect toggle. Let's toggle.
        store.setOpen(!store.isOpen);
      }
    }
  });
}

// 3. Handle window messages for regeneration fallback
window.addEventListener('message', (event) => {
  const store = useClarityStore.getState();
  if (event.data && event.data.action === 'TOGGLE_WIDGET') {
    store.setOpen(!store.isOpen);
  }
});

async function startAnalysis() {
  const store = useClarityStore.getState();
  
  // Always ensure state is correct
  store.setOpen(true);
  store.setError(null);
  
  try {
    // Re-verify config in case it changed since initialization
    await store.loadPersistedConfig();
    
    // Get the updated state AFTER loading config
    const updatedStore = useClarityStore.getState();
    const config = updatedStore.config;
    
    // Detailed error logging to help debug "not configured" issues
    if (!config) {
      const error = "AI Provider not configured. Please open the Clarity extension and click 'Validate & Save' in settings.";
      console.error("Clarity AI:", error);
      store.setError(error);
      return;
    }

    if (!config.apiKey && config.providerType !== 'ollama') {
      const error = `API Key missing for ${config.providerType}. Please check extension settings.`;
      console.error("Clarity AI:", error);
      store.setError(error);
      return;
    }

    const pageData = await extractPageData();
    const request = {
      content: pageData.content,
      contentType: pageData.contentType,
      config: config,
      url: pageData.url,
      title: pageData.title,
      selection: pageData.selection
    };

    // Only show loading icon when query is actually sent
    store.setLoading(true);

    let result;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'GENERATE_AI', payload: request }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "AI Synthesis failed."));
          }
        });
      });
    } else {
      const provider = getProvider(config.providerType);
      result = await provider.generate(request);
    }

    store.setResult(result as any);
  } catch (err: any) {
    store.setError(err.message || "An error occurred during synthesis.");
  }
}

// Global hotkey or action simulation
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'c') { // Alt+C to activate
    startAnalysis();
  }
});

// Since we're in a preview environment, let's export a helper to trigger it
(window as any).triggerClarity = startAnalysis;
