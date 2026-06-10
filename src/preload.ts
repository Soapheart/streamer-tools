// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // === Открытие внешних ссылок ===
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),


  // === Получение информации о системе и поддерживаемых методах захвата музыки ===
  getSystemInfo: ()=> ipcRenderer.invoke('get-system-info'),
  getExtensionStatus: ()=> ipcRenderer.invoke('get-extension-status'),

  // === Настройки (сохранение/загрузка) ===
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
    subscribe: (callback: (settings: unknown) => void) => {
      const listener = (_event: unknown, settings: unknown) => callback(settings);
      ipcRenderer.on('settings:updated', listener);
      return () => ipcRenderer.removeListener('settings:updated', listener);
    },
  },
  widget: {
    updateSettings: (widget: string, settings: unknown) => 
      ipcRenderer.send('widget:settings:update', { widget, settings }),
  },
});