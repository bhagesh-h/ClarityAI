import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Only load the widget in non-extension environments (like the AI Studio preview)
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
  import('./content/index.ts');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
