import ElectronStore from 'electron-store';
import { AppSettings, StoreSchema } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export class ElectronStoreAdapter {
  private store: ElectronStore<StoreSchema>;

  constructor() {
    this.store = new ElectronStore<StoreSchema>({
      defaults: {
        settings: DEFAULT_SETTINGS
      },
      name: 'config'
    });
  }

  getSettings(): AppSettings {
    return structuredClone(this.store.get('settings'));
  }

  saveSettings(patch: Partial<AppSettings>): boolean {
    try {
      const current = this.store.get('settings');
      const next = { ...current, ...patch };
      this.store.set('settings', next);
      return true;
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      return false;
    }
  }

  onDidChange(callback: (newSettings: AppSettings) => void): () => void {
    const unsubscribe = this.store.onDidChange('settings', (newValue) => {
      callback(newValue as AppSettings);
    });
    return unsubscribe;
  }
}