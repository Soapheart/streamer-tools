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
  system: {
    getStartWithSystem: () => Promise<boolean>;
    setStartWithSystem: (enabled: boolean) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};