import { BrowserWindow } from "electron";
import { AccessToken } from "@twurple/auth";

export async function getInitialToken(
  clientId: string,
  clientSecret: string,
  scopes: string[]
): Promise<AccessToken> {
  const cleanClientId = clientId.trim();
  const cleanClientSecret = clientSecret.trim();
  const redirectUri = "http://localhost";

  return new Promise((resolve, reject) => {
    let isResolved = false; // 🔥 Флаг для предотвращения гонки состояний

    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
    authUrl.searchParams.append("client_id", cleanClientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", scopes.join(" "));

    authWindow.loadURL(authUrl.toString());

    authWindow.webContents.on("will-redirect", async (event, url) => {
      const urlObj = new URL(url);

      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        event.preventDefault();

        const code = urlObj.searchParams.get("code");
        const error = urlObj.searchParams.get("error");

        if (error) {
          isResolved = true;
          authWindow.close();
          return reject(new Error(`Twitch OAuth Error: ${error} - ${urlObj.searchParams.get("error_description")}`));
        }

        if (code) {
          try {
            console.log("🔄 Exchanging code for token...");
            const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: cleanClientId,
                client_secret: cleanClientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
              }),
            });

            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.text();
              throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorData}`);
            }

            const tokenData = await tokenResponse.json();
            const parsedScope = typeof tokenData.scope === 'string' 
              ? tokenData.scope.split(' ') 
              : (tokenData.scope || scopes);

            const token: AccessToken = {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token ?? null,
              scope: parsedScope,
              expiresIn: tokenData.expires_in ?? null,
              obtainmentTimestamp: Date.now(),
            };

            // 🔥 Успех! Сначала помечаем как resolved, потом закрываем окно
            isResolved = true;
            authWindow.close(); 
            resolve(token);
            
          } catch (error) {
            isResolved = true;
            authWindow.close();
            reject(error);
          }
        }
      }
    });

    authWindow.on("closed", () => {
      // 🔥 Отклоняем Promise ТОЛЬКО если пользователь закрыл окно вручную ДО получения токена
      if (!isResolved) {
        reject(new Error("Auth window closed by user"));
      }
    });
  });
}