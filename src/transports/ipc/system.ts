// src/transports/ipc/system.ts
import { ipcMain, shell } from "electron";
import { isStartWithSystemEnabled, setStartWithSystem } from "../../core/services/autostart";

export function registerSystemHandlers() {
  ipcMain.handle("open-external", async (_event, url: string) => {
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

  ipcMain.handle("get-system-info", async () => {
    const platform = process.platform;
    const supportedMethods: string[] = ["extension", "auto"];
    if (platform === "win32") supportedMethods.push("winrt");
    else if (platform === "linux") supportedMethods.push("mpris");
    return { platform, supportedMethods };
  });

  ipcMain.handle("system:get-start-with-system", async () => {
    return await isStartWithSystemEnabled();
  });

  ipcMain.handle("system:set-start-with-system", async (_event, enabled: boolean) => {
    await setStartWithSystem(enabled);
    return await isStartWithSystemEnabled();
  });
}