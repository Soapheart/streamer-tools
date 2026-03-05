import * as path from 'path';
import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import express from 'express';
import cors from 'cors';
import http from 'http';

//Адаптер для работы с electron-store и транспорты для IPC
import { ElectronStoreAdapter } from './adapters/storage/ElectronStoreAdapter';
import { registerSettingsHandlers } from './transports/ipc/settings';


let storage: ElectronStoreAdapter;


// Инициализация Express сервера для виджетов OBS
function startWidgetServer() {
  const widgetApp = express();
  widgetApp.use(cors());

  // Health check endpoint
  widgetApp.get('/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({ status: 'ok', service: 'streamer-tools-widget' });
  });

  // Раздача статических файлов для виджетов
  widgetApp.use('/widgets', express.static(path.join(__dirname, '../../public/widgets')));

  const server = http.createServer(widgetApp);
  const PORT = 3000;

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Widget server running at http://127.0.0.1:${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Widget server error:', err);
  });

  return server;
}

function createWindow() {
  Menu.setApplicationMenu(null); 
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Загрузка UI
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(() => {
  createWindow();
  startWidgetServer();


  // Инициализация хранилища
  storage = new ElectronStoreAdapter();
  registerSettingsHandlers(storage)

  // === Обработчик открытия внешних ссылок ===
  ipcMain.handle('open-external', async (_event, url: string) => {
      // Разрешаем https и локальные адреса для разработки
    const isAllowed = url.startsWith('https://') || 
                      url.startsWith('http://localhost') || 
                      url.startsWith('http://127.0.0.1');
    if (isAllowed){
      await shell.openExternal(url);
    } else {
      console.warn('Blocked non-https URL:', url);
      throw new Error('Only HTTPS and localhost URLs are allowed');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});