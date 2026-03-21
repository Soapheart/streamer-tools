import { AppSettings, PartialSettings } from '../../shared/types';

export interface ElectronAPI {
  openExternal: (url: string) => Promise<void>;
  settings: {
    get: () => Promise<AppSettings>;
    save: (settings: PartialSettings) => Promise<void>;
    subscribe: (callback: (settings: AppSettings) => void) => () => void;
  };
  widget: {
    updateSettings: (widget: string, settings: unknown) => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};