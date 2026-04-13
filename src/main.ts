import * as path from 'path';
import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import express from 'express';
import cors from 'cors';
import http from 'http';

//Адаптер для работы с electron-store и транспорты для IPC
import { registerSettingsHandlers } from './transports/ipc/settings';
import { ElectronStoreAdapter } from './adapters/storage/ElectronStoreAdapter';
import { WidgetAdapter } from './core/ports/WidgetPort';
import { MusicWidgetAdapter } from './adapters/widgets/MusicWidgetAdapter';
// import { ChatWidgetAdapter } from './adapters/widgets/ChatWidgetAdapter';
import { AuctionWidgetAdapter } from './adapters/widgets/AuctionWidgetAdapter';
import { WebSocketServer } from 'ws';
import { WSGateway } from './core/wsGateway';
import { fileURLToPath } from 'url';

let storage: ElectronStoreAdapter;

// === Реестр виджетов ===
const musicAdapter = new MusicWidgetAdapter();
const widgetAdapters: WidgetAdapter[] = [
  musicAdapter,
  // new ChatWidgetAdapter(),
  // new AuctionWidgetAdapter(),
];

// === Конфигурация для загрузки UI ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const widgetsPath = path.join(process.cwd(), 'public', 'widgets');
  widgetApp.use('/widgets', express.static(widgetsPath));

  const server = http.createServer(widgetApp);
  const wss = new WebSocketServer({ server });
  const wsGateway = new WSGateway(wss);

  widgetAdapters.forEach(adapter => {
    console.log(`🔌 Setting up widget adapter: ${adapter.path}`);
    wsGateway.register(adapter);
  });

  wsGateway.start();


  const PORT = 3000;
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Widget server running at http://127.0.0.1:${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Widget server error:', err);
  });

  return { server, wss };
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
    mainWindow.loadFile(path.join(__dirname, `../renderer/$
      {MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(() => {

  // Инициализация хранилища
  storage = new ElectronStoreAdapter();

  try{
    const currentSettings = storage.getSettings();
    if (currentSettings?.music) {
      // console.log('Initializing settings')
      musicAdapter.initialize(currentSettings.music);
    }
  } catch (error) {
    console.error('Failed to load settings on startup:', error);
  }

  registerSettingsHandlers(storage, musicAdapter);
  createWindow();

  startWidgetServer();

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

ipcMain.on('widget:settings:update', (_event, {widget, settings}) => {
  console.log('Received widget settings update:', { widget, settings });
  if( widget === 'music'){
    // musicAdapter.broadcastSettings(settings);
  }
})

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