// public/widgets/chat/chatWidget.js
const RECONNECT_DELAY = 2000;
const MAX_MESSAGES = 50;
let ws = null;
let pingInterval = null;

function connect() {
  console.log("[ChatWidget] Connecting to ws://127.0.0.1:3000/ws/chat ...");

  ws = new WebSocket("ws://127.0.0.1:3000/ws/chat");

  ws.onopen = () => {
    console.log("[ChatWidget] ✅ Connected successfully!");
    // Запускаем периодический PING, чтобы соединение не разрывалось
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 30000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "PONG") {
        return; // Игнорируем ответ на пинг
      }

      if (data.type === "CHAT_MESSAGE") {
        renderMessage(data.payload);
      }
    } catch (e) {
      console.error("[ChatWidget] Parse error:", e);
    }
  };

  ws.onerror = (e) => {
    console.error("[ChatWidget] WS error:", e);
  };

  ws.onclose = () => {
    console.log("[ChatWidget] ❌ Disconnected, retrying in 2s...");
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(connect, RECONNECT_DELAY);
  };
}

function renderMessage(msg) {
  const container = document.getElementById("chat-container");
  if (!container) {
    console.error("[ChatWidget] ERROR: #chat-container not found in HTML!");
    return;
  }

  const el = document.createElement("div");
  el.className = "chat-message";

  const safeMsg = msg.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  el.innerHTML =
    '<span class="username" style="color:' + msg.color + '">' +
    msg.username +
    '</span>: <span class="text">' + safeMsg + '</span>';

  container.appendChild(el);

  while (container.children.length > MAX_MESSAGES) {
    container.removeChild(container.firstChild);
  }
}

connect();