const RECONNECT_DELAY = 2000;

let ws = null;
let lastText = "";
let reconnectTimer = null;

const root = document.documentElement;

const widgetEl = document.getElementById("widget");

function connect() {
  if(reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  console.log("Connecting to music WS...");
  ws = new WebSocket("ws://127.0.0.1:3000/ws/music");

  ws.onopen = () => {
    console.log("Connected to music WS");
    sendPing();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (e) {
      console.error("Invalid WS message", e);
    }
  };

  ws.onerror = (e) => {
    console.error("Music WS error", e);
    ws.close();
  };

  ws.onclose = () => {
    console.log("WS closed, reconnecting...");
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  };
}

function handleMessage(data) {
  if (data.type === "PONG") return;
  
  if (data.type === "SETTINGS_UPDATE" && data.payload) {
    // console.log("⚙️ Received settings update:", data.payload);
    applySettings(data.payload);
    return;
  }

  if (data.type === "TRACK_UPDATE") {
    const track = data.payload;

    if(!track.title || !track.artist) {
      console.warn("⚠️ Received track with missing title or artist", track);
      return;
    }

    const fullText = `${track.artist} — ${track.title}`;
    const isSameText = fullText === lastText;

    // ✅ ИСПРАВЛЕНИЕ: Если текст совпадает, всё равно проверяем обложку и цвет
    if (isSameText) {
      console.log("🔄 Same track text, checking for delayed cover/background...");
      
      // Обновляем обложку, если она пришла
      if (track.cover !== undefined) {
        console.log("🖼️ Updating cover for existing track");
        updateCover(track.cover);
      }
      
      // Обновляем цвет фона, если он изменился
      if (track.background_color) {
        const currentColor = widgetEl.style.getPropertyValue("--widget-bg-color").trim();
        if (track.background_color !== currentColor) {
          console.log("🎨 Updating background color:", track.background_color);
          widgetEl.style.setProperty("--widget-bg-color", track.background_color);
        }
      }
      
      return; // Текст актуален, дальше не идем
    }

    // Полное обновление при смене трека
    lastText = fullText;
    console.log("🎵 NEW TRACK:", track.title, "by", track.artist);

    updateCover(track.cover);

    if(track.background_color) {
      console.log("🎨 Updating widget background color to:", track.background_color);
      widgetEl.style.setProperty("--widget-bg-color", track.background_color);
    }

    updateText(track.artist, track.title);

    if (track.playState) {
      console.log("▶️ Play state:", track.playState);
    }
  }
}

function applySettings(settings) {
  console.log("Applying settings in widget:", settings);
  // console.log("Received settings:", settings.font);

  const { colors, font, effects } = settings.theme;

  console.log("🎨 Applying theme:", settings.theme);

  // Применяем цвета из темы
  if (colors) {
    if(colors.background) {
      root.style.setProperty("--widget-bg-color", colors.background);
    }
    if (colors.text) {
      root.style.setProperty("--text-color", colors.text);
    }

    if (colors.textSecondary) {
      root.style.setProperty("--text-secondary-color", colors.textSecondary);
    }

    if (colors.accent) {
      root.style.setProperty("--accent-color", colors.accent);
    }
  }

  // Применяем шрифты
  if (font) {
    if (font.family) {
      root.style.setProperty("--font-family", font.family);
    }

    if (font.weight) {
      root.style.setProperty("--font-weight", font.weight);
    }

    if(font.size) {
      root.style.setProperty("--font-size", `${font.size}px`);
    }
  }

  // Применяем эффекты
  if (effects) {
    if (effects.borderRadius !== undefined) {
      root.style.setProperty("--border-radius", `${effects.borderRadius}px`);
    }
    if (effects.shadow !== undefined) {
      root.style.setProperty("--shadow", effects.shadow ? "0 4px 12px rgba(0,0,0,0.3)" : "none");
    }
  }

  // Применяем остальные настройки (не часть темы)
  if (settings.showCover !== undefined) {
    const coverEl = document.getElementById("cover");
    if (coverEl) {
      coverEl.style.display = settings.showCover ? "block" : "none";
    }
  }
}

function updateCover(coverUrl) {
  console.log("🖼️ Updating cover:", coverUrl ? `${coverUrl.substring(0, 50)}...` : "null");
  const coverEl = document.getElementById("cover");
  if (!coverEl) return;

  // ✅ ИСПРАВЛЕНИЕ: Принудительный сброс перед установкой новой обложки
  coverEl.style.opacity = "0"; // Скрываем старую
  
  if(coverUrl) {
    // Создаем временное изображение для проверки загрузки
    const tempImg = new Image();
    
    tempImg.onload = () => {
      console.log("✅ Cover loaded successfully");
      coverEl.src = coverUrl;
      coverEl.style.opacity = "1"; // Показываем новую
    };
    
    tempImg.onerror = () => {
      console.error("❌ Failed to load cover, using fallback");
      coverEl.src = "./empty-album-art.svg";
      coverEl.style.opacity = "1";
    };
    
    tempImg.src = coverUrl;
  } else {
    coverEl.src = "./empty-album-art.svg";
    coverEl.style.opacity = "1";
  }
}

function updateText(artist, title) {
  const titleEl = document.querySelector(".title");
  const artistEl = document.querySelector(".artist");
  if (titleEl) titleEl.textContent = title;
  if (artistEl) artistEl.textContent = artist;
}

function sendPing() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "PING", payload: "Ping from OBS Widget" }));
  }
}

connect();

setInterval(sendPing, 20000);

window.addEventListener("beforeunload", () => {
  console.log('Cleaning up...');
  if(reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
});