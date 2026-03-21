import { create } from 'zustand';
import { AppSettings, PartialSettings } from '../../shared/types';

// Дефолтные настройки
const defaultSettings: AppSettings = {
  music: {
    enabled: true,
    showCover: true,
    showProgress: true,
    theme: 'dynamic',
    fontSize: 14,
    bgTransparency: 100,
    widgetHeight: 100,
    widgetWidth: 300,
    integrations: { yandexMusic: true, vkMusic: false },
  },
  chat: { enabled: true },
  auction: { enabled: true }
};

// Состояние стора
interface DashboardState {
  activeCategory: 'general' | 'music' | 'chat' | 'auction' | 'about';
  settings: AppSettings;
  setActiveCategory: (category: 'general' | 'music' | 'chat' | 'auction' | 'about') => void;
  updateSettings: <K extends keyof AppSettings>(
    category: K, 
    updates: Partial<AppSettings[K]>
  ) => void;
  loadSettings: (settings: AppSettings) => void;
    // Внутренние методы для синхронизации с Electron Store
    _saveToStorage: (settings: PartialSettings) => void;
    _loadFromStorage: () => Promise<void>;
    _subscribeToStorage: () => () => void; // Возвращает функцию отписки
}

function debounce<T extends (...args: any[]) => void>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const debouncedSendToWidget = debounce((category: string, settings: unknown) => {
  if (category === 'music' && window.electronAPI?.widget?.updateSettings) {
    window.electronAPI.widget.updateSettings('music', settings);
  }
}, 300);

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeCategory: 'general',
  settings: defaultSettings,
  
  setActiveCategory: (category) => set({ activeCategory: category }),
  
  updateSettings: (category, updates) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        [category]: { ...state.settings[category], ...updates },
      };
      // Автосохранение
      get()._saveToStorage({ [category]: updates });
      debouncedSendToWidget(category, updates);
      return { settings: newSettings };
    });
  },

  loadSettings: (settings) => set({ settings }),

  // Внутренние методы
  _saveToStorage: (settings: PartialSettings) => {
    window.electronAPI.settings.save(settings).catch(console.error);
  },
  
  _loadFromStorage: async () => {
    try {
      const saved = await window.electronAPI.settings.get();
      get().loadSettings(saved);
    } catch (error) {
      console.warn('⚠️ Could not load settings:', error);
    }
  },
  
  _subscribeToStorage: () => {
    return window.electronAPI.settings.subscribe((settings) => {
      get().loadSettings(settings);
    });
  },
}));

// Инициализация
let initialized = false;
export const initializeDashboardStore = () => {
  if (initialized) return;
  initialized = true;
  
  const store = useDashboardStore.getState();
  store._loadFromStorage();
  store._subscribeToStorage();
};