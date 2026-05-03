(async () => {
  // Prevent duplicate bridge scripts
  if (window.CLARITY_AI_LOADED) return;
  window.CLARITY_AI_LOADED = true;

  try {
    // This script acts as a bridge to load the ESM content script
    const src = chrome.runtime.getURL('content.js');
    await import(src);
    console.log('Clarity AI: Content script loaded successfully via ESM loader.');
  } catch (err) {
    // Some pages might block ESM imports via CSP. 
    // In that case, the user HAS to refresh or we need a non-ESM build.
    console.error('Clarity AI: Failed to load content script:', err);
  }
})();
