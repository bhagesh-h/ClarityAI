import React, { useState, useEffect } from 'react';
import { useClarityStore } from './store';
import { ProviderConfig } from './types';
import { getProvider } from './providers';
import { CheckCircle2, AlertCircle, Settings, Shield, Zap, ExternalLink, Play, Linkedin, Github, Loader2, Globe, Cpu } from 'lucide-react';

export default function App() {
  const { config, saveConfig, loadPersistedConfig, getFromVault } = useClarityStore();
  const [localConfig, setLocalConfig] = useState<ProviderConfig>({
    id: 'default',
    name: 'Default Google',
    providerType: 'google',
    apiKey: '',
    modelName: 'gemini-3-flash-preview',
  });
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [showSetup, setShowSetup] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    loadPersistedConfig().then(() => setHasInitialized(true));
  }, []);

  // Sync localConfig when the store config changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      // Auto-skip setup ONLY on initial cold start if we have a config
      if (!hasInitialized && (config.apiKey || config.providerType === 'ollama')) {
        setShowSetup(false);
      }
    }
  }, [config, hasInitialized]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Verifying...' });
    
    try {
      let test;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        test = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'TEST_CONNECTION', payload: localConfig }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, message: chrome.runtime.lastError.message });
            } else {
              resolve(response);
            }
          });
        });
      } else {
        const provider = getProvider(localConfig.providerType);
        test = await provider.testConnection(localConfig);
      }

      if (!test.success) {
        setStatus({ type: 'error', message: test.message });
        return;
      }

      await saveConfig(localConfig);
      setStatus({ type: 'success', message: 'Configuration verified and saved.' });
      
      // Delay to let the user see success message, then the useEffect will handle the switch
      setTimeout(() => {
        setShowSetup(false);
        setStatus({ type: 'idle' });
      }, 1200);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to initialize builder.' });
    }
  };

  const triggerOnActiveTab = async () => {
    if (!config || (!config.apiKey && config.providerType !== 'ollama')) {
      setShowSetup(true);
      setStatus({ type: 'error', message: 'Please configure your provider first.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Activating engine...' });

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id) {
          try {
            // 1. Try simple messaging first
            await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_WIDGET' });
            setStatus({ type: 'idle' });
            window.close();
          } catch (err: any) {
            // Check if context is invalidated
            if (err.message?.includes('Extension context invalidated')) {
              setStatus({ type: 'error', message: "Extension updated. Please refresh page." });
              return;
            }

            // 2. Fallback: Direct call
            try {
               const results = await chrome.scripting.executeScript({
                 target: { tabId: tab.id },
                 func: () => {
                    if ((window as any).triggerClarity) {
                      (window as any).triggerClarity();
                      return true;
                    }
                    return false;
                 }
               });
               
               if (results && results[0]?.result === true) {
                 window.close();
               } else {
                 setStatus({ type: 'error', message: "Content script not ready. Refresh the page." });
               }
            } catch (injectErr) {
              console.error("Activation failed", injectErr);
              setStatus({ type: 'error', message: "Cannot run on this page." });
            }
          }
        }
      } catch (queryErr) {
        console.error("Tab query failed", queryErr);
        setStatus({ type: 'error', message: "Failed to find active tab." });
      }
    } else {
      // Development mode
      console.log("Clarity: Dev mode activation");
      const trigger = (window as any).triggerClarity || (window as any).window?.triggerClarity;
      if (trigger) {
        try {
          trigger();
          setStatus({ type: 'success', message: 'Analysis started.' });
          setTimeout(() => setStatus({ type: 'idle' }), 2000);
        } catch (e: any) {
          setStatus({ type: 'error', message: e.message });
        }
      } else {
        setStatus({ type: 'error', message: "Synthesis engine not ready. Wait a moment." });
      }
    }
  };

  if (!showSetup) {
    return (
      <div id="popup-root" className="w-[360px] h-[520px] bg-[#0F0F0F] text-[#E5E5E5] flex flex-col items-center justify-center p-8 text-center overflow-hidden border border-white/5">
        <img 
          src="/icon.svg" 
          className="w-14 h-14 rounded-2xl shadow-2xl shadow-blue-600/30 mb-5 animate-in slide-in-from-bottom" 
          alt="Clarity AI"
        />
        <h1 className="text-xl font-display font-medium text-white mb-1 tracking-tight">Clarity<span className="text-blue-500 ml-0.5">AI</span></h1>
        <p className="text-zinc-300 text-[11px] mb-8 px-4 leading-relaxed">Synthesis engine initialized.</p>
        
        <div className="w-full space-y-2.5 max-w-[240px]">
          <button 
            onClick={triggerOnActiveTab}
            disabled={status.type === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-xl shadow-blue-600/20 text-sm active:scale-[0.98]"
          >
            {status.type === 'loading' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            Analyze Current Tab
          </button>
          
          <button 
            onClick={() => setShowSetup(true)}
            className="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 rounded-xl transition-all text-[10px] font-semibold uppercase tracking-widest border border-white/5 active:scale-[0.98]"
          >
            Settings
          </button>
        </div>

        {status.type !== 'idle' && (
          <div className={`mt-4 p-2.5 rounded-lg flex items-center gap-2 animate-in fade-in duration-300 w-full max-w-[240px] ${
            status.type === 'success' ? 'bg-green-500/5 text-green-400 border border-green-500/10' : 
            status.type === 'error' ? 'bg-red-500/5 text-red-400 border border-red-500/10' :
            'bg-blue-500/5 text-blue-400 border border-blue-500/10'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={12} /> : status.type === 'error' ? <AlertCircle size={12} /> : <Loader2 size={12} className="animate-spin" />}
            <span className="text-[9px] font-bold uppercase tracking-tight">{status.message}</span>
          </div>
        )}
        
        <footer className="mt-12 flex flex-col items-center gap-3">
          <div className="flex flex-col gap-1.5 opacity-80 items-center">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-200">v1.2.8 • PRO</span>
            <a href="#" className="text-[9px] flex items-center justify-center gap-1 hover:text-blue-400 text-zinc-300">
              Developer Docs <ExternalLink size={8} />
            </a>
          </div>
          
          <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5 w-full">
            <div className="flex items-center gap-3">
              <a href="https://www.linkedin.com/in/bhagesh-hunakunti/" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-blue-400 transition-colors">
                <Linkedin size={14} />
              </a>
              <a href="https://github.com/bhagesh-h" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white transition-colors">
                <Github size={14} />
              </a>
            </div>
            <p className="text-[9px] text-zinc-300 font-medium uppercase tracking-tight">
              © {new Date().getFullYear()} Created by BHAGESH
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div id="popup-root" className="w-[360px] h-[520px] bg-[#0F0F0F] text-[#E5E5E5] font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col border border-white/5">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <img src="/icon.svg" className="w-8 h-8 rounded-lg shadow-lg shadow-blue-600/20" alt="" />
            <h1 className="text-xl font-display font-medium tracking-tight text-white">Clarity<span className="text-blue-500 ml-0.5">AI</span></h1>
          </div>
          <p className="text-gray-500 text-[10px] font-medium leading-relaxed uppercase tracking-wider">Engine Configuration</p>
        </header>

        <form onSubmit={handleSave} className="space-y-5 bg-[#171717]/50 p-5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Settings size={14} />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">Engine Config</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Network</label>
              <select 
                value={localConfig.providerType}
                onChange={(e) => {
                  const type = e.target.value as any;
                  
                  // 1. Try to load from vault first
                  const vaulted = getFromVault(type);
                  if (vaulted) {
                    setLocalConfig(vaulted);
                    return;
                  }

                  // 2. Fallback to defaults
                  let defaultModel = '';
                  let defaultUrl = '';
                  
                  if (type === 'google') defaultModel = 'gemini-3-flash-preview';
                  if (type === 'openai') {
                    defaultModel = 'gpt-4o';
                    defaultUrl = 'https://api.openai.com/v1';
                  }
                  if (type === 'anthropic') defaultModel = 'claude-3-5-sonnet-20240620';
                  if (type === 'openrouter') defaultModel = 'meta-llama/llama-3.1-8b-instruct';
                  if (type === 'ollama') {
                    defaultModel = 'llama3';
                    defaultUrl = 'http://localhost:11434';
                  }

                  setLocalConfig({
                    ...localConfig, 
                    providerType: type,
                    apiKey: '', // Clear key for new setup
                    modelName: defaultModel || localConfig.modelName,
                    baseUrl: defaultUrl || ''
                  });
                }}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="google">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="custom">Custom (OpenAI Compatible)</option>
              </select>
            </div>

            {(localConfig.providerType === 'ollama' || localConfig.providerType === 'custom' || localConfig.providerType === 'openai') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Base URL</label>
                  {(localConfig.providerType === 'ollama') && <span className="text-[8px] text-blue-500 font-bold uppercase">Local Required</span>}
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={localConfig.baseUrl || ''}
                    onChange={(e) => setLocalConfig({...localConfig, baseUrl: e.target.value})}
                    placeholder={localConfig.providerType === 'ollama' ? "http://localhost:11434" : "https://api.openai.com/v1"}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono"
                  />
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Model variant</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={localConfig.modelName}
                  onChange={(e) => setLocalConfig({...localConfig, modelName: e.target.value})}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono"
                />
                <Cpu size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
            </div>

            {localConfig.providerType !== 'ollama' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Access Token</label>
                <input 
                  type="password" 
                  value={localConfig.apiKey}
                  onChange={(e) => setLocalConfig({...localConfig, apiKey: e.target.value})}
                  placeholder="Paste key here..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-[9px] text-gray-600 mt-1 italic">
                  {localConfig.providerType === 'google' && 'Obtain keys from Google AI Studio.'}
                  {localConfig.providerType === 'openai' && 'Obtain keys from OpenAI Dashboard.'}
                  {localConfig.providerType === 'anthropic' && 'Obtain keys from Anthropic Console.'}
                  {localConfig.providerType === 'openrouter' && 'Obtain keys from openrouter.ai.'}
                  {localConfig.providerType === 'custom' && 'Provide authentication token for your custom endpoint.'}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={status.type === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Zap size={14} />
              {status.type === 'loading' ? 'Authenticating...' : 'Validate & Save'}
            </button>
          </div>

          {status.type !== 'idle' && (
            <div className={`p-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 ${
              status.type === 'success' ? 'bg-green-500/5 text-green-400 border border-green-500/20' : 'bg-red-500/5 text-red-400 border border-red-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="text-[10px] font-semibold">{status.message}</span>
            </div>
          )}
        </form>

        <footer className="mt-8 flex flex-col items-center gap-4 pb-2">
          <div className="flex items-center justify-center gap-4 text-zinc-300 text-[10px] font-medium tracking-tight">
             <button 
                onClick={() => setShowSetup(false)}
                className="hover:text-blue-500 transition-colors uppercase tracking-widest text-zinc-200"
             >
                Back
              </button>
              <span className="opacity-30">|</span>
              <span className="opacity-80 tracking-wider text-zinc-300">SECURE ENDPOINT</span>
          </div>

          <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5 w-full">
            <div className="flex items-center gap-3">
              <a href="https://www.linkedin.com/in/bhagesh-hunakunti/" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-blue-400 transition-colors">
                <Linkedin size={14} />
              </a>
              <a href="https://github.com/bhagesh-h" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white transition-colors">
                <Github size={14} />
              </a>
            </div>
            <p className="text-[9px] text-zinc-300 font-medium uppercase tracking-tight text-center">
              © {new Date().getFullYear()} Created by BHAGESH
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
