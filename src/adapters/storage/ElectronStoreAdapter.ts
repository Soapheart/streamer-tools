import Store from 'electron-store';
import { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export class ElectronStoreAdapter {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: DEFAULT_SETTINGS
    });
  }

  getSettings(): AppSettings {
    return this.store.store;
  }

  saveSettings(settings: Partial<AppSettings>): void {
    this.store.set(settings);
  }

  onDidChange(callback: (newSettings: AppSettings) => void): void {
    const unsubscribe = this.store.onDidChange((newValue) => {
      callback(newValue as AppSettings);
    });
    return unsubscribe;
  }
}