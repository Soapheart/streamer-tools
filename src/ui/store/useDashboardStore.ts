import { create } from 'zustand';
import { AppSettings, PartialSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { DashboardState } from '../types';

// Дефолтные настройки
const defaultSettings: AppSettings = DEFAULT_SETTINGS;

const startupCategory: keyof AppSettings = 'music';
const categories: Array<keyof AppSettings> = ['music', 'chat', 'auction'];

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
  if (!categories.includes(category as keyof AppSettings) || !window.electronAPI?.widget?.updateSettings) {
    return;
  }
  window.electronAPI.widget.updateSettings(category as typeof categories[number], settings);
}, 300);

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeCategory: startupCategory,
  settings: defaultSettings,
  sidebarCollapsed: false,
  setActiveCategory: (category) => set({ activeCategory: category }),
  
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
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
      
      // 🔄 Миграция: если twitch — не массив, преобразуем из старой объектной структуры
      if (saved?.chat?.sources?.twitch && !Array.isArray(saved.chat.sources.twitch)) {
        const oldTwitch = saved.chat.sources.twitch as any;
        console.warn('🔄 Миграция: twitch был объектом, преобразуем в массив');
        saved.chat.sources.twitch = [{
          id: 'migrated-twitch-1',
          enabled: oldTwitch.enabled ?? true,
          channel: oldTwitch.channel || '',
          token: oldTwitch.token || ''
        }];
      }
      
      // 🔄 Миграция: если sources вообще нет или неполный
      if (!saved?.chat?.sources) {
        saved = {
          ...saved,
          chat: {
            ...saved?.chat,
            sources: { twitch: [], youtube: [], vk: [] }
          }
        };
      }
      
      // 🔄 Миграция: если filters нет (старая версия без фильтрации)
      if (saved?.chat && !saved.chat.filters) {
        saved.chat.filters = DEFAULT_SETTINGS.chat.filters;
      }
      
      const mergedSettings = deepMerge(defaultSettings, saved || {});
      get().loadSettings(mergedSettings);
      
      // 🔄 Сохраняем мигрированные данные обратно в storage, чтобы больше не мигрировать
      get()._saveToStorage(mergedSettings);
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