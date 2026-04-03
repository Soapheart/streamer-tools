// Подключение к локальному WebSocket-серверу
const RECONNECT_DELAY = 2000;

let ws = null;
let lastText = "";
let reconnectTimer = null;

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
    // console.log('📥 RAW:', event.data);
    try {
      const data = JSON.parse(event.data)
      handleMessage(data);
    } catch (e) {
      console.error("Invalid WS message", e);
    }
  };

  ws.onerror = (e) => {
    console.error("Music WS error", e);
    ws.close();
  }
}

function handleMessage(data) {
  // console.log("Music WS message received:", data);
  if (data.type === "PONG") return; // игнорируем пинги
  if (data.type === "SETTINGS_UPDATE" && data.payload){
    // console.log("Received settings update in widget:", data.payload);
    applySettings(data.payload);
    return;
  }

  if (data.type === "TRACK_UPDATE")
  {
    const track = data.payload;

    if(!track.title || !track.artist) {
      console.warn("Received track with missing title or artist", track);
      return;
    }

    const fullText = `${track.artist} — ${track.title}`;
    if (fullText === lastText) return; // не обновляем если та же песня
    lastText = fullText;

    console.log("Track received in widget:", track.title, track.artist);

    updateCover(track.cover);

    if(track.background_color) {
      const currentTransparency = widgetEl.style.getPropertyValue("--widget-bg-color").trim();
      updateBackground(track.background_color, getAlpha(currentTransparency));
    }

    updateText(track.artist, track.title);
  }
}

function applySettings(settings) {
  // console.log("Received settings to widget:", settings);

  if(settings.theme) {
    widgetEl.setAttribute("data-theme", settings.theme);
  }
  if(settings.fontSize){
    document.documentElement.style.setProperty("--font-size-base", `${settings.fontSize}px`);
    const titleEl = document.querySelector(".title");
    const artistEl = document.querySelector(".artist");
    if(titleEl) titleEl.style.fontSize = `${settings.fontSize}px`;
    if(artistEl) artistEl.style.fontSize = `${Math.max(10, settings.fontSize - 4)}px`;
  }
  if(settings.showCover !== undefined) {
    document.getElementById("cover").classList.toggle("hidden", !settings.showCover);
  }
  if(settings.bgTransparency !== undefined) {
    updateBackground(null, settings.bgTransparency);
  }
}

function updateCover(coverUrl) {
  console.log("Updating cover in widget:", coverUrl);
  const coverEl = document.getElementById("cover");
  if (!coverEl) return;
  if(coverUrl) {
    coverEl.src = coverUrl;
  } else {
    coverEl.src = "./empty-album-art.svg";
  }
}
// Получаем альфу
function getAlpha(color) {
  const match = color.match(/rgba?\(([^)]+)\)|hsla?\(([^)]+)\)/);
  if (!match) return null;
  const values = (match[1] || match[2]).split(',').map(v => v.trim());
  return values.length === 4 ? parseFloat(values[3]) : 1;
}

function updateBackground(color, transparency) {
  console.log("Updating background in widget:", { color, transparency });
  if (!widgetEl) return;
  if (color === null && transparency !== undefined) {
    const currentColor = widgetEl.style.getPropertyValue("--widget-bg-color").trim();
    console.log("transparency", transparency);
    const alpha = transparency;
    console.log("Current bg color:", currentColor, "New alpha:", alpha);
    if(currentColor){
      if (currentColor.startsWith("hsla")){
        console.log("Current color is already HSLA, updating alpha...");
        const newColor = currentColor.replace(/[\d.]+\)$/, `${alpha})`);
        console.log("Updating HSL color to:", newColor);
        widgetEl.style.setProperty("--widget-bg-color", newColor);
      } else if (currentColor.startsWith("rgba")){
        console.log("Current color is already RGBA, updating alpha...");
        const newColor = currentColor.replace(/[\d.]+\)$/, `${alpha})`);
        widgetEl.style.setProperty("--widget-bg-color", newColor);
      }
    }
    return;
  }
  if(!color) return;

  const alpha = transparency !== undefined ? transparency : 1;

  if (color.includes("hsl")) {
    const hsl = color.match(/hsl\(.+\)/)?.[0];
    if (hsl) {
      const hsla = `hsla(${hsl.slice(4, -1)}, ${alpha})`;
      widgetEl.style.setProperty("--widget-bg-color", hsla);
    }
  } else {
    // Парсим hex (#RRGGBB) в rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    widgetEl.style.setProperty("--widget-bg-color", rgba);
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
    // console.log("Sending PING to music WS");
    ws.send(JSON.stringify({ type: "PING" }));
  }
}

connect();

setInterval(sendPing, RECONNECT_DELAY);

window.addEventListener("beforeunload", () => {
  console.log('Чистим интервал')
  if(reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
});