import { create } from 'zustand';
import { AppSettings, PartialSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { DashboardState } from '../types';

// Дефолтные настройки
const defaultSettings: AppSettings = DEFAULT_SETTINGS;

// === Утилита для глубокого слияния объектов ===
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target) || !isObject(target[key])) {
          (output as any)[key] = source[key];
        } else {
          (output as any)[key] = deepMerge(target[key] as any, source[key] as any);
        }
      } else {
        (output as any)[key] = source[key];
      }
    });
  }
  return output;
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
  activeCategory: 'music',
  settings: defaultSettings,
  
  setActiveCategory: (category) => set({ activeCategory: category }),
  
  updateSettings: (category, updates) => {
    set((state) => {
      const updatedCategorySettings = deepMerge(state.settings[category] || {}, updates);
      const newSettings = {
        ...state.settings,
        [category]: updatedCategorySettings,
      };
      // Автосохранение
      get()._saveToStorage(newSettings);
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
      const mergedSettings = deepMerge(defaultSettings, saved || {});
      get().loadSettings(mergedSettings);
    } catch (error) {
      console.warn('⚠️ Could not load settings:', error);
    }
  },
  
  _subscribeToStorage: () => {
    return window.electronAPI.settings.subscribe((settings) => {
      const mergedSettings = deepMerge(defaultSettings, settings || {});
      get().loadSettings(mergedSettings);
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