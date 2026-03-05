import { AppSettings, PartialSettings } from '../../shared/types';

export interface StoragePort {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: PartialSettings): Promise<void>;
  subscribe(callback: (settings: AppSettings) => void): () => void;
}