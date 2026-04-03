import { create } from 'zustand';
import { AppSettings, PartialSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { DashboardState } from '../types';

// Дефолтные настройки
const defaultSettings: AppSettings = DEFAULT_SETTINGS

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