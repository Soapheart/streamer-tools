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
    if (fullText === lastText && track.background_color === widgetEl.style.getPropertyValue("--widget-bg-color")) return; // не обновляем если та же песня и тот же цвет фона
    lastText = fullText;

    // console.log("Track received in widget:", track.title, track.artist);

    updateCover(track.cover);

    if(track.background_color) {
      console.log("Updating widget background color to:", track.background_color);
      widgetEl.style.setProperty("--widget-bg-color", track.background_color);
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


function updateText(artist, title) {
  const titleEl = document.querySelector(".title");
  const artistEl = document.querySelector(".artist");
  if (titleEl) titleEl.textContent = title;
  if (artistEl) artistEl.textContent = artist;
}

function sendPing() {
  if (ws.readyState === WebSocket.OPEN) {
    // console.log("Sending PING to music WS");
    ws.send(JSON.stringify({ type: "PING", payload: "Ping from OBS Widget" }));
  }
}

connect();

setInterval(sendPing, RECONNECT_DELAY);

window.addEventListener("beforeunload", () => {
  console.log('Чистим интервал')
  if(reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
});