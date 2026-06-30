import { ipcMain } from 'electron';
import { ElectronStoreAdapter } from '../../adapters/storage/ElectronStoreAdapter';
import { MusicWidgetAdapter } from '../../adapters/widgets/MusicWidgetAdapter';
import { AppSettings } from '../../shared/types';
// import { ca } from 'zod/locales';

export function registerSettingsHandlers(
  storage: ElectronStoreAdapter,
  musicAdapter?: MusicWidgetAdapter
) {
  ipcMain.handle('settings:get', async () => {
    try {
      return await storage.getSettings();
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      throw error;
    }
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
}