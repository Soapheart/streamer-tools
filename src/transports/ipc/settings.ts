import { ipcMain } from 'electron';
import { ElectronStoreAdapter } from '../../adapters/storage/ElectronStoreAdapter';
import { MusicWidgetAdapter } from '../../adapters/widgets/MusicWidgetAdapter';
import { AppSettings } from '../../shared/types';

export function registerSettingsHandlers(
  storage: ElectronStoreAdapter,
  musicAdapter?: MusicWidgetAdapter
) {
  ipcMain.handle('get-settings', () => {
    return storage.getSettings();
  });

  ipcMain.handle('settings:save', (_event, settings: Partial<AppSettings>) => {
    try{
      storage.saveSettings(settings);

      if(musicAdapter && settings.music) {
        musicAdapter.broadcastSettings(settings.music);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error };
    }
  });

  ipcMain.on('settings:subscribe', (event) => {
    const unsubscribe = storage.onDidChange((newSettings) => {
      event.sender.send('settings:updated', newSettings);
    });
    event.sender.once('closed', () => {
      unsubscribe();
    });
  });
}