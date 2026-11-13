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

import { TwitchApiService } from "./core/services/twichApiService";
import { getInitialToken } from "./core/utils/twitchAuth";
import { StaticAuthProvider } from "@twurple/auth";
import { ApiClient } from "@twurple/api";

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


let twitchApiService: TwitchApiService | null = null;

// === Реестр виджетов ===
const musicAdapter = new MusicWidgetAdapter();
const chatAdapter = new ChatWidgetAdapter();

const twitchService = new TwitchChatService((msg) => {
  chatAdapter.broadcastMessage(msg);
});
let currentTwitchChannel = "";
let currentTwitchToken = "";
// Multiple channel to-do
// let activeTwitchConnections: Array<{channel: string, token:string}> = [];

const widgetAdapters: WidgetAdapter[] = [
  musicAdapter,
  chatAdapter,
  // AuctionWidgetAdapter(),
];

// === Конфигурация для загрузки UI ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function syncTwitchConnection(chatSettings: ChatWidgetConfig) {

  // Multiple channel to-do
  // const newConnections = (chatSettings.sources?.twitch || []).filter(src => src.enabled && src.channel.trim()).map(src=> ({channel: src.channel.trim(), token: src.token}));

  const twitchSource = chatSettings.sources?.twitch[0];
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

    // === ОБРАБОТЧИК РУЧНОЙ АВТОРИЗАЦИИ (КНОПКА В UI) ===
  ipcMain.handle("twitch:auth", async () => {
    try {
      const clientId = "".trim();
      const clientSecret = "".trim(); 

      console.log("🔐 Starting Twitch OAuth flow...");
      
      // 1. Получаем токен (redirectUri жестко зашит в twitchAuth.ts как 'http://localhost')
      const token = await getInitialToken(
        clientId,
        clientSecret,
        ["channel:manage:redemptions", "channel:read:redemptions"]
      );

      // 2. ПРЯМОЙ ЗАПРОС к Twitch API для получения данных текущего пользователя
      console.log("🔍 Fetching current user data from Twitch API...");
      const userResponse = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          "Client-Id": clientId,
          "Authorization": `Bearer ${token.accessToken}`,
        },
      });
      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
      }
      const userData = await userResponse.json();
      const currentUser = userData.data[0];
      const broadcasterId = currentUser.id;
      const broadcasterName = currentUser.login;
      console.log(`✅ Auth successful! User: ${broadcasterName} (ID: ${broadcasterId})`);

      // 3. Инициализируем сервис
      twitchApiService = new TwitchApiService();
      await twitchApiService.initialize(
        {
          clientId,
          clientSecret,
          redirectUri: "http://localhost",
          broadcasterId,
        },
        token
      );

      await twitchApiService.startEventSub();

      // 4. Слушаем события
      twitchApiService.on("redemption", (redemption) => {
        console.log("🎁 Received redemption event:", redemption.userDisplayName, redemption.rewardTitle);
      });

      // 5. Сохраняем всё в хранилище (объединяем с текущими настройками, чтобы не затереть остальное)
      const currentSettings = storage.getSettings() || {};

      const twitchSettingsToSave = {
        clientId,
        clientSecret,
        broadcasterId,
        broadcasterName,
        token: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken ?? null,
          scope: token.scope,
          expiresIn: token.expiresIn ?? null,
          obtainmentTimestamp: token.obtainmentTimestamp,
        }
      };

      await storage.saveSettings({
        ...currentSettings,
        twitch: twitchSettingsToSave,
      });

      return { success: true, broadcasterName, broadcasterId };
    } catch (error: any) {
      console.error("❌ Twitch authentication failed:", error);
      return { success: false, error: error.message };
    }
  });

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

ipcMain.handle("twitch:create-test-reward", async () => {
  try {
    if (!twitchApiService) {
      throw new Error("Twitch API service not initialized. Please login first.");
    }
    
    const reward = await twitchApiService.createRaffleReward("Тестовая награда", 100);
    console.log("✅ Reward created with ID:", reward.id);
    return { success: true, rewardId: reward.id };
  } catch (error: any) {
    console.error("❌ Failed to create reward:", error);
    return { success: false, error: error.message };
  }
});

// === Удаление тестовой награды ===
ipcMain.handle("twitch:delete-reward", async (_event, rewardId: string) => {
  try {
    if (!twitchApiService) {
      throw new Error("Twitch API service not initialized.");
    }
    await twitchApiService.deleteReward(rewardId);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to delete reward:", error);
    return { success: false, error: error.message };
  }
});

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
