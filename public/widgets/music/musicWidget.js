let lastText = "";

// Подключение к локальному WebSocket-серверу
const ws = new WebSocket("ws://127.0.0.1:3000/ws/music");

// Когда получаем новое сообщение
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)

    if (data.type === "PING") return; // игнорируем пинги

    const { title, artist, cover, background_color } = data;
    console.log("Track received in widget:", title, artist, cover, background_color);
    const fullText = `${artist} — ${title}`;
    if (fullText === lastText) return; // не обновляем если та же песня
    lastText = fullText;

    // === Обложка ===
    const coverEl = document.getElementById("cover");
    if (cover && coverEl) {
      coverEl.src = cover;
      coverEl.style.display = "block";
    } else if (coverEl) {
      coverEl.style.display = "none";
    }

    // === Фон ===
    const widgetEl = document.getElementById("widget");
    if (widgetEl && background_color?.includes("hsl")) {
      const color = background_color.match(/hsl\(.+\)/)?.[0];
      if (color) {
        widgetEl.style.setProperty("--widget-bg-color", color);
      }
    }

    // === Бегущая строка ===
    const titleEl = document.querySelector(".title");
    const artistEl = document.querySelector(".artist");
    const wrapper = document.querySelector(".text-wrapper");

    if (!titleEl || !artistEl || !wrapper ) return;

    function updateText(artist, title) {
      titleEl.textContent = title;
      artistEl.textContent = artist;

    }

    updateText(artist, title);

  } catch (e) {
    console.error("Invalid WS message", e);
  }
};

// Пинг для поддержки соединения (чтобы Node/WS не обрубил)
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "PING" }));
  }
}, 20000);
