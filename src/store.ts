import { create } from 'zustand';
import { ProviderConfig, GenerateResult } from './types';

interface ClarityStore {
  isOpen: boolean;
  isLoading: boolean;
  config: ProviderConfig | null;
  vault: Record<string, ProviderConfig>;
  result: GenerateResult | null;
  error: string | null;
  
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setConfig: (config: ProviderConfig) => void;
  setResult: (result: GenerateResult) => void;
  setError: (error: string | null) => void;
  
  loadPersistedConfig: () => Promise<void>;
  saveConfig: (config: ProviderConfig) => Promise<void>;
  getFromVault: (type: string) => ProviderConfig | null;
}

export const useClarityStore = create<ClarityStore>((set, get) => ({
  isOpen: false,
  isLoading: false,
  config: null,
  vault: {},
  result: null,
  error: null,

  setOpen: (open) => set({ isOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
  setConfig: (config) => set({ config }),
  setResult: (result) => set({ result, isLoading: false, error: null }),
  setError: (error) => set({ error, isLoading: false }),

  getFromVault: (type) => {
    return get().vault[type] || null;
  },

  loadPersistedConfig: async () => {
    try {
      console.log("Clarity Store: Loading config from storage...");
      
      let persistedVault: Record<string, ProviderConfig> = {};
      let activeConfig: ProviderConfig | null = null;

      // 1. Try Chrome Storage if in Extension environment
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const result = await chrome.storage.local.get(['clarity_config', 'clarity_vault']);
          console.log("Clarity Store: Storage result", result);
          if (result.clarity_vault) {
            persistedVault = result.clarity_vault as Record<string, ProviderConfig>;
          }
          if (result.clarity_config) {
            activeConfig = result.clarity_config as ProviderConfig;
          }
        } catch (storageErr) {
          console.warn("Clarity Store: chrome.storage.local access failed", storageErr);
        }
      }

      // 2. Try LocalStorage for web/dev or fallback
      const vaultData = localStorage.getItem('clarity_vault');
      if (vaultData) {
        try {
          const parsedVault = JSON.parse(vaultData);
          persistedVault = { ...persistedVault, ...parsedVault };
        } catch (e) {}
      }

      const activeData = localStorage.getItem('clarity_config');
      if (activeData) {
        try {
          activeConfig = activeConfig || JSON.parse(activeData);
        } catch (e) {}
      }

      console.log("Clarity Store: Final Loaded Config:", activeConfig ? activeConfig.providerType : 'None');

      // If no active config but we have items in vault, pick the first one as active
      if (!activeConfig && Object.keys(persistedVault).length > 0) {
        activeConfig = Object.values(persistedVault)[0];
        console.log("Clarity Store: Picking fallback config from vault:", activeConfig.providerType);
      }
      
      set({ 
        config: activeConfig,
        vault: persistedVault
      });
    } catch (e) {
      console.error("Clarity Store: Critical failure loading config", e);
    }
  },

  saveConfig: async (config) => {
    console.log("Clarity Store: Saving config", config.providerType);
    const { vault } = get();
    const newVault = {
      ...vault,
      [config.providerType]: config
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ 
        'clarity_config': config,
        'clarity_vault': newVault
      });
    }
    
    localStorage.setItem('clarity_config', JSON.stringify(config));
    localStorage.setItem('clarity_vault', JSON.stringify(newVault));
    
    set({ config, vault: newVault });
  },
}));
