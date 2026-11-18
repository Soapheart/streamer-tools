// src/transports/ipc/twitchConnection.ts
import { ipcMain } from "electron";
import { ElectronStoreAdapter } from "../../adapters/storage/ElectronStoreAdapter";
import { getInitialTokenPKCE } from "../../core/utils/twitchAuth";
import { TwitchApiService } from "../../core/services/twitchApiService";
import { TwitchChatService } from "../../adapters/sources/TwitchChatService";
import { TWITCH_CLIENT_ID, TWITCH_SCOPES } from "../../shared/constants";

export interface TwitchServiceRef {
  current: TwitchApiService | null;
}

export function registerTwitchHandlers(
  storage: ElectronStoreAdapter,
  serviceRef: TwitchServiceRef,
  chatService: TwitchChatService
) {
  ipcMain.handle("twitch:auth", async () => {
    try {
      console.log("🔐 Starting Twitch OAuth flow (PKCE)...");

      const token = await getInitialTokenPKCE(TWITCH_CLIENT_ID, TWITCH_SCOPES);

      const userResponse = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token.accessToken}`,
        },
      });
      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user: ${userResponse.statusText}`);
      }
      const { data } = await userResponse.json();
      const broadcasterId = data[0].id;
      const broadcasterName = data[0].display_name;
      console.log(`✅ Auth successful: ${broadcasterName} (${broadcasterId})`);

      const service = new TwitchApiService();
      await service.initialize(
        {
          clientId: TWITCH_CLIENT_ID,
          redirectUri: "http://localhost",
          broadcasterId,
        },
        token
      );
      await service.startEventSub();
      service.on("redemption", (r) => {
        console.log("🎁 Redemption:", r.userDisplayName, r.rewardTitle);
      });

      serviceRef.current = service;
      
      // 1. Передаём провайдер в чат
      chatService.setAuthProvider(service.getAuthProvider());

      // 2. 🔥 АВТОМАТИЧЕСКИ обновляем настройки чата, чтобы использовать канал авторизованного аккаунта
      const currentSettings = storage.getSettings() || {};
      const targetChannel = broadcasterName.toLowerCase();
      
      const updatedChatSettings = {
        ...currentSettings.chat,
        sources: {
          ...currentSettings.chat?.sources,
          twitch: [
            {
              id: currentSettings.chat?.sources?.twitch?.[0]?.id || "twitch-default",
              enabled: true,
              channel: targetChannel, // 🔥 Автозаполнение канала
              token: "", // Токен больше не нужен
            },
          ],
        },
      };

      // 3. Сохраняем обновлённые настройки (это автоматически вызовет storage.onDidChange в main.ts и подключит чат)
      await storage.saveSettings({
        ...currentSettings,
        chat: updatedChatSettings,
        twitch: {
          clientId: TWITCH_CLIENT_ID,
          broadcasterId,
          broadcasterName,
          token: {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken ?? null,
            scope: token.scope,
            expiresIn: token.expiresIn ?? null,
            obtainmentTimestamp: token.obtainmentTimestamp,
          },
        },
      });

      return { success: true, broadcasterName, broadcasterId };
    } catch (error: any) {
      console.error("❌ Twitch auth failed:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("twitch:logout", async () => {
    try {
      if (serviceRef.current) {
        await serviceRef.current.stopEventSub();
        serviceRef.current = null;
      }

      chatService.setAuthProvider(null);
      chatService.disconnect(); // Отключаем чат при логауте

      const currentSettings = storage.getSettings() || {};
      await storage.saveSettings({
        ...currentSettings,
        twitch: undefined,
      });
      console.log("🔌 Twitch disconnected");
      return { success: true };
    } catch (e: any) {
      console.error("❌ Twitch logout failed:", e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("twitch:get-status", () => {
    const settings = storage.getSettings();
    const t = settings?.twitch;
    return {
      connected: !!t?.token && !!serviceRef.current,
      broadcasterName: t?.broadcasterName ?? null,
      broadcasterId: t?.broadcasterId ?? null,
    };
  });
  
  ipcMain.handle("twitch:get-chat-status", () => {
    return chatService.getStatus();
  });
}