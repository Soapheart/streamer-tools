// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // === Открытие внешних ссылок ===
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),


    // === Настройки — ВАЖНО: правильный синтаксис ===
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
    subscribe: (callback: (settings: unknown) => void) => {
      const listener = (_event: unknown, settings: unknown) => callback(settings);
      ipcRenderer.on('settings:updated', listener);
      ipcRenderer.send('settings:subscribe');
      return () => ipcRenderer.removeListener('settings:updated', listener);
    },
  },
});