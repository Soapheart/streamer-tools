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
  twitch: {
    auth: () => Promise<{success:boolean; broadcasterName?: string; broadcasterId?: string; error?:string}>;
    logout: () => Promise<{success:boolean; error?:string}>;
    getStatus: () => Promise<{connected: boolean; broadcasterName: string | null;}>;
    getChatStatus: () => Promise<{
      isConnected: boolean;
      channel: string | null;
      isAuthorized: boolean;
    }>;
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};