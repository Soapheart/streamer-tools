import * as path from "path";
import { app, BrowserWindow, Menu, ipcMain, shell } from "electron";
import { fileURLToPath } from "url";
import { ChildProcess, spawn } from "child_process";

//Адаптер для работы с electron-store и транспорты для IPC
import { ElectronStoreAdapter } from "./adapters/storage/ElectronStoreAdapter";
import { WidgetAdapter } from "./core/ports/WidgetPort";
import { MusicWidgetAdapter } from "./adapters/widgets/MusicWidgetAdapter";
import { ChatWidgetAdapter } from "./adapters/widgets/ChatWidgetAdapter";
import { TwitchChatService } from "./adapters/sources/TwitchChatService";
import { startWidgetServer } from "./server";
// import { AuctionWidgetAdapter } from './adapters/widgets/AuctionWidgetAdapter';

// Сервисы и утилиты
import { TwitchApiService } from "./core/services/twitchApiService";

// IPC регистраторы
import { registerSettingsHandlers } from "./transports/ipc/settings";
import { registerTwitchHandlers, TwitchServiceRef } from "./transports/ipc/twitchConnection";
import { registerSystemHandlers } from "./transports/ipc/system";
import { ChatWidgetConfig } from "./shared/types";
import { TWITCH_CLIENT_ID } from "./shared/constants";


// Дочерний процесс для прослушивания медиа-событий
let mediaListenerProcess: ChildProcess | null = null;
let storage: ElectronStoreAdapter;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// === Реестр виджетов ===
const musicAdapter = new MusicWidgetAdapter();
const chatAdapter = new ChatWidgetAdapter();
const twitchService = new TwitchChatService((msg) => {
  chatAdapter.broadcastMessage(msg);
});
let currentTwitchChannel = "";
// Multiple channel to-do
// let activeTwitchConnections: Array<{channel: string, token:string}> = [];

const widgetAdapters: WidgetAdapter[] = [
  musicAdapter,
  chatAdapter,
];

// Ссылка на сервис — IPC-модуль будет её заполнять
const twitchServiceRef: TwitchServiceRef = { current: null };

// === Конфигурация для загрузки UI ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Функции инициализации

function startMediaListener() {
  if (process.platform !== "win32") {
    console.log("⚠️ MediaListener only works on Windows, skipping...");
    return;
  }

  // Определяем путь к exe в зависимости от режима
  let exePath: string;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    exePath = path.join(
      process.cwd(),
      "sidecar",
      "WinMediaListener",
      "bin",
      "Release",
      "net8.0-windows10.0.22621.0",
      "win-x64",
      "publish",
      "WinMediaListener.exe",
    );
  } else {
    exePath = path.join(process.resourcesPath, "WinMediaListener.exe");
  }

  try {
    mediaListenerProcess = spawn(exePath, [], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    mediaListenerProcess.stdout?.on("data", (data) => {
      console.log(`[MediaListener] ${data.toString().trim()}`);
    });

    mediaListenerProcess.stderr?.on("data", (data) => {
      console.error(`[MediaListener Error] ${data.toString().trim()}`);
    });
    mediaListenerProcess.on("close", (code) => {
      console.log(`[MediaListener] exited with code ${code}`);
    });
  } catch (error) {
    console.error("Failed to start MediaListener:", error);
  }
}








function syncTwitchConnection(chatSettings: ChatWidgetConfig | undefined) {
  if (!chatSettings) return;

  const twitchSource = chatSettings.sources?.twitch?.[0];
  const newChannel = twitchSource?.enabled ? twitchSource.channel.trim().toLowerCase() : "";

  // 🔥 СТРОГАЯ ЗАЩИТА ОТ ДУБЛЕЙ: Если канал тот же самый, выходим немедленно
  if (newChannel === currentTwitchChannel) {
    console.log(`[Twitch] syncTwitchConnection: Channel "${newChannel}" is already active. Skipping.`);
    return;
  }

  console.log(`[Twitch] 🔄 Channel changed from "${currentTwitchChannel}" to "${newChannel}". Reconnecting...`);
  
  // Гарантированно разрываем старое соединение перед созданием нового
  twitchService.disconnect();
  currentTwitchChannel = newChannel;

  if (newChannel) {
    console.log(`[Twitch] 🚀 Connecting to channel: "${newChannel}"`);
    twitchService.connect(newChannel);
  } else {
    console.log("[Twitch] ⛔ Twitch chat is disabled or no channel specified. Disconnected.");
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.on("close", (e) => {
   if(!isQuitting && storage?.getSettings()?.system?.minimizeOnClose) {
    e.preventDefault();
    mainWindow?.hide();
   }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Загрузка UI
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

// === Обеспечение единственного экземпляра приложения ===
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(async () => {
    console.log("🚀 App is ready, creating window...");
    createWindow();
    startWidgetServer(widgetAdapters);
    startMediaListener();


    // Инициализация хранилища
    console.log("📦 Initializing storage...");
    storage = new ElectronStoreAdapter();

    console.log("🔧 Registering IPC handlers...");
    try {
      registerSettingsHandlers(storage, musicAdapter);
      registerTwitchHandlers(storage, twitchServiceRef, twitchService);
      registerSystemHandlers();
      console.log("✅ IPC handlers registered successfully!");
    } catch (error) {
      console.error("❌ FAILED to register IPC handlers:", error);
    }

    storage.onDidChange((newSettings) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send("settings:updated", newSettings);
      });
      syncTwitchConnection(newSettings?.chat);
    });
    // Начальная загрузка настроек
    try {
      const settings = storage.getSettings();
      if (settings?.music) {
        musicAdapter.initialize(settings.music);
      }
      if (settings?.chat) {
        chatAdapter.broadcastSettings(settings.chat);
        syncTwitchConnection(settings.chat);
      }
      // Авто-подключение Twitch API, если есть сохраненный токен
      if (settings?.twitch?.token && settings?.twitch?.broadcasterId) {
        try{
          console.log("🔄 Auto-connecting to Twitch API...");
          const service = new TwitchApiService();
          await service.initialize(
            {
              clientId: TWITCH_CLIENT_ID,
              redirectUri: "http://localhost",
              broadcasterId: settings.twitch.broadcasterId,
            },
            settings.twitch.token
          );
          await service.startEventSub();
          twitchServiceRef.current = service;

          twitchService.setAuthProvider(service.getAuthProvider());

          console.log(`🔄 Twitch auto-connected:  ${settings.twitch.broadcasterName}`);
        }catch(e){
          console.error("⚠️ Twitch auto-connect failed, user needs to re-auth:", e);
        }
      }
    } catch (error) {
      console.error("Failed to load settings on startup:", error);
    }
    ipcMain.on("widget:settings:update", (_event, { widget, settings }) => {
      console.log("Received widget settings update:", { widget, settings });
      if (widget === "music") {
        musicAdapter.broadcastSettings(settings);
      } else if (widget === "chat") {
        chatAdapter.broadcastSettings(settings);
        syncTwitchConnection(settings);
      }
    });
  });
  
}

app.on("before-quit", () => {
  isQuitting = true;
  if (mediaListenerProcess) {
    mediaListenerProcess.kill();
  }
  twitchService.disconnect();
  if(twitchServiceRef.current){
    twitchServiceRef.current.stopEventSub();
  }
});

// To do
ipcMain.handle("get-extension-status", () => {
  return musicAdapter.getExtensionStatus();
});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
