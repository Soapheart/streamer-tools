import { ipcMain } from 'electron';
import { StoragePort } from '../../core/ports/StoragePort';
import { PartialSettings } from '../../shared/types';

export function registerSettingsHandlers(storage: StoragePort) {
  ipcMain.handle('settings:get', async () => {
    console.log('📂 Loading settings');
    return await storage.getSettings();
  });

  ipcMain.handle('settings:save', async (_event, settings: PartialSettings) => {
    console.log('💾 Saving settings');
    await storage.saveSettings(settings);
  });

  // Для push-уведомлений об изменениях (опционально)
  ipcMain.on('settings:subscribe', (event) => {
    const unsubscribe = storage.subscribe((settings) => {
      event.sender.send('settings:updated', settings);
    });
    
    // Cleanup при закрытии окна
    event.sender.once('destroyed', unsubscribe);
  });
}