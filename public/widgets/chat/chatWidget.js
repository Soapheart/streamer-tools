// public/widgets/chat/chatWidget.js
import { parseTwitchEmotes } from "./emoteParser.js"; // Убедитесь, что расширение .js указано (требование ES modules)

const RECONNECT_DELAY = 2000;
const MAX_MESSAGES = 50;
let ws = null;
let pingInterval = null;

function connect() {
  console.log("[ChatWidget] Connecting to ws://127.0.0.1:3000/ws/chat ...");

  ws = new WebSocket("ws://127.0.0.1:3000/ws/chat");

  ws.onopen = () => {
    console.log("[ChatWidget] ✅ Connected successfully!");
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 30000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "PONG") return;
      if (data.type === "SETTINGS_UPDATE" && data.payload) {
        applySettings(data.payload);
        return;
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

function applySettings(settings) {
  const root = document.documentElement;
  const appearance = settings.appearance || settings; 

  if (appearance.font?.size !== undefined) {
    root.style.setProperty('--chat-font-size', `${appearance.font.size}px`);
  }
  if (appearance.bgTransparency !== undefined) {
    const alpha = appearance.bgTransparency / 100;
    root.style.setProperty('--chat-bg-alpha', alpha);
  }
  if (appearance.theme !== undefined) {
    root.setAttribute('data-theme', appearance.theme);
  }
  if (appearance.showBadges !== undefined) {
    root.setAttribute('data-show-badges', appearance.showBadges ? 'true' : 'false');
  }
  
  console.log("[ChatWidget] Settings applied:", appearance);
}

function renderMessage(msg) {
  const container = document.getElementById("chat-container");
  if (!container) return;

  // 🔍 ОТЛАДКА: Посмотрите в консоль браузера! 
  // Если msg.emotes равно undefined, проблема в TwitchChatService.ts (Шаг 1)
  console.log("[ChatWidget] Получено сообщение:", msg);

  const el = document.createElement("div");
  el.className = "chat-message";
  if (msg.id) el.dataset.id = msg.id;

  // 1. Бейджи
  let badgesHtml = '';
  const showBadges = document.documentElement.getAttribute('data-show-badges') === 'true';
  if (showBadges && msg.badges && Object.keys(msg.badges).length > 0) {
    for (const [badgeName, version] of Object.entries(msg.badges)) {
      let icon = '';
      switch (badgeName) {
        case 'broadcaster': icon = '🎙️'; break;
        case 'moderator': icon = '🛡️'; break;
        case 'vip': icon = '💎'; break;
        case 'subscriber': icon = '⭐'; break;
        case 'premium': icon = '👑'; break;
        case 'bits': icon = '💎'; break;
        default: icon = `[${badgeName}]`;
      }
      badgesHtml += `<span class="badge" title="${badgeName}">${icon}</span>`;
    }
  }
  
  if (badgesHtml) {
    const badgeContainer = document.createElement('span');
    badgeContainer.className = 'badges-container';
    badgeContainer.innerHTML = badgesHtml;
    el.appendChild(badgeContainer);
  }

  // 2. Имя пользователя
  const usernameEl = document.createElement("span");
  usernameEl.className = "username";
  usernameEl.style.color = msg.color || "#FFFFFF";
  usernameEl.textContent = `${msg.username}: `;
  el.appendChild(usernameEl);

  // 3. Тело сообщения с парсингом
  // Берем ИСХОДНЫЙ текст до какой-либо санитизации, чтобы индексы смайлов совпали
  const rawText = msg.text || msg.message || ""; 
  
  const chunks = parseTwitchEmotes(rawText, msg.emotes);

  const bodyEl = document.createElement("span");
  bodyEl.className = "text";

  chunks.forEach(chunk => {
    if (chunk.type === 'text') {
      // Санитизируем ТОЛЬКО текстовые части ПОСЛЕ нарезки
      const safeText = chunk.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      
      bodyEl.appendChild(document.createTextNode(safeText));
    } 
    else if (chunk.type === 'emote') {
      const img = document.createElement('img');
      img.src = chunk.url;
      img.alt = chunk.content;
      img.title = chunk.content;
      img.className = 'chat-emote';
      img.loading = 'lazy';
      bodyEl.appendChild(img);
    }
  });

  el.appendChild(bodyEl);
  container.appendChild(el);

  // Очистка старых сообщений
  while (container.children.length > 50) {
    container.removeChild(container.firstChild);
  }
}

connect();