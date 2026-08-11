import * as path from "path";
import { app, BrowserWindow, Menu, ipcMain, shell } from "electron";

//Адаптер для работы с electron-store и транспорты для IPC
import { registerSettingsHandlers } from "./transports/ipc/settings";
import { ElectronStoreAdapter } from "./adapters/storage/ElectronStoreAdapter";

import { WidgetAdapter } from "./core/ports/WidgetPort";
import { MusicWidgetAdapter } from "./adapters/widgets/MusicWidgetAdapter";
import { ChatWidgetAdapter } from "./adapters/widgets/ChatWidgetAdapter";
import { TwitchChatService } from "./adapters/sources/TwitchChatService";
// import { AuctionWidgetAdapter } from './adapters/widgets/AuctionWidgetAdapter';
import { startWidgetServer } from "./server";

import { fileURLToPath } from "url";
import { ChildProcess, spawn } from "child_process";
import { ChatWidgetConfig } from "./shared/types";
import {
  isStartWithSystemEnabled,
  setStartWithSystem,
} from "./core/services/autostart";

// Дочерний процесс для прослушивания медиа-событий
let mediaListenerProcess: ChildProcess | null = null;

let storage: ElectronStoreAdapter;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

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


// === Реестр виджетов ===
const musicAdapter = new MusicWidgetAdapter();
const chatAdapter = new ChatWidgetAdapter();

const twitchService = new TwitchChatService((msg) => {
  chatAdapter.broadcastMessage(msg);
});
let currentTwitchChannel = "";
let currentTwitchToken = "";

const widgetAdapters: WidgetAdapter[] = [
  musicAdapter,
  chatAdapter,
  // AuctionWidgetAdapter(),
];

// === Конфигурация для загрузки UI ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function syncTwitchConnection(chatSettings: ChatWidgetConfig) {
  const twitchSource = chatSettings.sources?.twitch;
  const newChannel = twitchSource?.enabled ? twitchSource.channel : "";
  const newToken = twitchSource?.enabled ? twitchSource.token : "";

  const isChannelChanged = newChannel !== currentTwitchChannel;
  const isTokenChanged = newToken !== currentTwitchToken;

  if (isChannelChanged || isTokenChanged) {
    console.log("[Twitch] Connection settings changed, reconnecting...");
    twitchService.disconnect();

    currentTwitchChannel = newChannel;
    currentTwitchToken = newToken;

    if (newChannel) {
      console.log(`[Twitch] Connecting to channel: "${newChannel}"`);
      twitchService.connect(newChannel, newToken);
    } else {
      console.log(
        "[Twitch] Twitch chat is disabled or no channel specified. Disconnected.",
      );
    }
  } else {
    console.log("[Twitch] Connection settings unchanged, no action taken.");
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
  app.whenReady().then(() => {
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
      console.log("✅ IPC handlers registered successfully!");
    } catch (error) {
      console.error("❌ FAILED to register IPC handlers:", error);
    }

    storage.onDidChange((newSettings) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send("settings:updated", newSettings);
      });
    });

    try {
      const currentSettings = storage.getSettings();
      if (currentSettings?.music) {
        musicAdapter.initialize(currentSettings.music);
      }
      if (currentSettings?.chat) {
        chatAdapter.broadcastSettings(currentSettings.chat);
        syncTwitchConnection(currentSettings.chat);
      }
    } catch (error) {
      console.error("Failed to load settings on startup:", error);
    }

    // === Обработчик открытия внешних ссылок ===
    ipcMain.handle("open-external", async (_event, url: string) => {
      // Разрешаем https и локальные адреса для разработки
      const isAllowed =
        url.startsWith("https://") ||
        url.startsWith("http://localhost") ||
        url.startsWith("http://127.0.0.1");
      if (isAllowed) {
        await shell.openExternal(url);
      } else {
        console.warn("Blocked non-https URL:", url);
        throw new Error("Only HTTPS and localhost URLs are allowed");
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
});

ipcMain.handle("get-system-info", async () => {
  const platform = process.platform;
  const supportedMethods: string[] = ["extension", "auto"];
  if (platform === "win32") {
    supportedMethods.push("winrt");
  } else if (platform === "linux") {
    supportedMethods.push("mpris");
  }
  return { platform, supportedMethods };
});

ipcMain.handle("get-extension-status", () => {
  return musicAdapter.getExtensionStatus();
});

ipcMain.handle("system:get-start-with-system", async () => {
  return await isStartWithSystemEnabled();
});

ipcMain.handle(
  "system:set-start-with-system",
  async (_event, enabled: boolean) => {
    await setStartWithSystem(enabled);
    return await isStartWithSystemEnabled();
  },
);

ipcMain.on("widget:settings:update", (_event, { widget, settings }) => {
  console.log("Received widget settings update:", { widget, settings });
  if (widget === "music") {
    musicAdapter.broadcastSettings(settings);
  } else if (widget === "chat") {
    chatAdapter.broadcastSettings(settings);
    const currentSettings = storage.getSettings();
    if (currentSettings?.chat) {
      syncTwitchConnection(currentSettings.chat);
    }
  }
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
