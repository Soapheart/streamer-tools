import Store from 'electron-store';
import { StoragePort } from '../../core/ports/StoragePort';
import { UserSettings } from '../../shared/types';

// Схема валидации (опционально, но рекомендуется)
const schema = {
  music: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', default: true },
      showCover: { type: 'boolean', default: true },
      showProgress: { type: 'boolean', default: true },
      theme: { 
        type: 'string', 
        enum: ['dynamic', 'dark', 'light', 'transparent'],
        default: 'dynamic'
      },
      fontSize: { type: 'number', minimum: 10, maximum: 24, default: 14 },
      position: {
        type: 'string',
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        default: 'bottom-right'
      },
      integrations: {
        type: 'object',
        properties: {
          yandexMusic: { type: 'boolean', default: true },
          vkMusic: { type: 'boolean', default: false },
        },
        default: { yandexMusic: true, vkMusic: false }
      }
    },
    default: {}
  }
} as const;

const store = new Store<{ music: UserSettings['music'] }>({ 
  schema,
  name: 'user-settings',
  watch: true // Автоматически отслеживает изменения
});

export class ElectronStoreAdapter implements StoragePort {
  async getSettings(): Promise<UserSettings> {
    return {
      music: store.get('music'),
    } as UserSettings;
  }

  async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    if (settings.music) {
      // Merge с существующими настройками
      const current = store.get('music');
      store.set('music', { ...current, ...settings.music });
    }
  }

  subscribe(callback: (settings: UserSettings) => void): () => void {
    // Подписка на изменения в store
    const unsubscribe = store.onDidChange('music', (newValue) => {
      if (newValue) {
        callback({ music: newValue as UserSettings['music'] });
      }
    });
    
    // Возвращаем функцию отписки
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }
}