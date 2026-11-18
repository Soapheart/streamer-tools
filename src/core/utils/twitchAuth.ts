import { BrowserWindow } from "electron";
import { AccessToken } from "@twurple/auth";
import * as crypto from "crypto";

// Генерация случайной строки для code_verifier
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Генерация code_challenge из code_verifier (SHA256 + base64url)
function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function getInitialTokenPKCE(
  clientId: string,
  scopes: string[]
): Promise<AccessToken> {
  const cleanClientId = clientId.trim();
  const redirectUri = "http://localhost";

  // 1. Генерируем PKCE параметры
  const codeVerifier = generateRandomString(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return new Promise((resolve, reject) => {
    let isResolved = false;

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
    // 🔥 PKCE параметры
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    authWindow.loadURL(authUrl.toString());

    // 2. Перехватываем редирект
    authWindow.webContents.on("will-redirect", (event, url) => {
      const urlObj = new URL(url);

      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        // 🔥 Отменяем загрузку страницы, чтобы не было ERR_CONNECTION_REFUSED
        event.preventDefault();

        const code = urlObj.searchParams.get("code");
        const error = urlObj.searchParams.get("error");

        if (error) {
          isResolved = true;
          authWindow.close();
          return reject(new Error(`Twitch OAuth Error: ${error} - ${urlObj.searchParams.get("error_description")}`));
        }

        if (code) {
          isResolved = true;
          authWindow.close(); // Закрываем окно, код у нас

          // 3. Обмениваем code + codeVerifier на токен (БЕЗ client_secret!)
          fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: cleanClientId,
              code,
              grant_type: "authorization_code",
              redirect_uri: redirectUri,
              code_verifier: codeVerifier, // 🔥 Вот где магия PKCE
            }),
          })
            .then(async (response) => {
              if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Token exchange failed (${response.status}): ${errorData}`);
              }
              return response.json();
            })
            .then((tokenData) => {
              const parsedScope = typeof tokenData.scope === 'string' 
                ? tokenData.scope.split(' ') 
                : (tokenData.scope || scopes);

              resolve({
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token ?? null,
                scope: parsedScope,
                expiresIn: tokenData.expires_in ?? null,
                obtainmentTimestamp: Date.now(),
              });
            })
            .catch(reject);
        }
      }
    });

    authWindow.on("closed", () => {
      if (!isResolved) {
        reject(new Error("Auth window closed by user"));
      }
    });
  });
}