const RECONNECT_DELAY = 2000;

const loadedAnimations = new Set();

let ws = null;
let lastText = "";
let reconnectTimer = null;
let hideTimer = null;
let currentSettings = {};

const root = document.documentElement;
const widgetEl = document.getElementById("widget");

function connect() {
  if(reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  console.log("Connecting to music WS...");
  ws = new WebSocket(`ws://127.0.0.1:3000/ws/music`);

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

async function handleMessage(data) {
  if (data.type === "PONG") return;
  
  if (data.type === "SETTINGS_UPDATE" && data.payload) {
    currentSettings = data.payload;
    applySettings(data.payload);
    return;
  }

  if (data.type === "TRACK_UPDATE") {
    const track = data.payload;

    if(!track.title || !track.artist) {
      console.warn("⚠️ Received track with missing title or artist", track);
      return;
    }

    if (currentSettings.hideOnPause) {
      if (track.playState === "paused" || track.playState === "stopped") {
        scheduleHide();
      } else if (track.playState === "playing") {
        showWidget();
      }
    }

    const fullText = `${track.artist} - ${track.title}`;
    const isSameText = fullText === lastText;

    if (isSameText) {
      console.log("🔄 Same track text, checking for delayed cover/background...");
      
      // if (track.cover !== undefined) {
      //   console.log("🖼️ Updating cover for existing track");
      //   updateCover(track.cover);
      // }
      
      if (track.background_color) {
        const currentColor = widgetEl.style.getPropertyValue("--widget-bg-color").trim();
        if (track.background_color !== currentColor) {
          console.log("🎨 Updating background color:", track.background_color);
          widgetEl.style.setProperty("--widget-bg-color", track.background_color);
        }
      }
      return; 
    }


    lastText = fullText;
    console.log("🎵 NEW TRACK:", track.title, "by", track.artist);

    const animationDuration = getAnimationDuration();
    const animated = await applyTrackChangeAnimation();

    if(animated){
      setTimeout(() => {
        updateTrackData(track);
      }, animationDuration)
    }else{
      updateTrackData(track);
    }

    // updateCover(track.cover);

    if(track.background_color) {
      // console.log("🎨 Updating widget background color to:", track.background_color);
      widgetEl.style.setProperty("--widget-bg-color", track.background_color);
    }

    // updateText(track.artist, track.title);

    if (track.playState) {
      console.log("▶️ Play state:", track.playState);
    }
  }
}

async function loadAnimationCSS(animationId) {
  if (!animationId || animationId === 'none' || animationId === 'undefined') {
    console.log('[Animation] No valid animation requested.');
    return false;
  }
  
  if (loadedAnimations.has(animationId)) {
    console.log(`[Animation] "${animationId}" already loaded.`);
    return true;
  }

  try {
    console.log(`[Animation] Fetching available animations from server...`);
    const response = await fetch('http://127.0.0.1:3000/api/content/music?contentType=animations');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Animation] Server responded with packs:', data.packs);

    let targetItem = null;
    for (const pack of data.packs) {
      const item = pack.items.find(i => i.id === animationId);
      if (item) {
        targetItem = { ...item, packId: pack.id };
        break;
      }
    }

    if (!targetItem) {
      console.warn(`⚠️ Animation "${animationId}" not found in any loaded pack.`);
      return false;
    }

    const cssUrl = `http://127.0.0.1:3000/content/music/animations/${targetItem.packId}/${targetItem.file}`;
    console.log(`[Animation] Found "${animationId}". Loading CSS from: ${cssUrl}`);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    
    link.onload = () => {
      console.log(`✅ Successfully loaded and applied CSS for "${animationId}"`);
    };
    link.onerror = () => {
      console.error(`❌ Failed to load CSS file for "${animationId}" from ${cssUrl}`);
    };
    
    document.head.appendChild(link);
    loadedAnimations.add(animationId);
    return true;

  } catch (e) {
    console.error('❌ Critical error loading animation:', e);
    return false;
  }
}

function updateTrackData(track) {
  updateCover(track.cover);
  updateText(track.artist, track.title);
  
  if (track.background_color) {
    widgetEl.style.setProperty("--widget-bg-color", track.background_color);
  }
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    widgetEl.classList.add('is-hidden');
    console.log("🙈 Widget hidden (paused)");
  }, 5000); // 5 секунд
}

function showWidget() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  widgetEl.classList.remove('is-hidden');
  console.log("👁️ Widget shown (playing)");
}

function getAnimationDuration() {
  const duration = getComputedStyle(widgetEl).getPropertyValue('--animation-duration').trim();
  
  if (duration.endsWith('ms')) {
    return parseFloat(duration);
  } else if (duration.endsWith('s')) {
    return parseFloat(duration) * 1000;
  }
  
  return 400; // Fallback
}

async function applyTrackChangeAnimation() {
  const animation = currentSettings.trackChangeAnimation || 'none';
  if (animation === 'none') return false;
  
  const loaded = await loadAnimationCSS(animation);
  if(!loaded) return false;

  const duration = getAnimationDuration();
  
  widgetEl.classList.add(`exit-${animation}`);
  
  setTimeout(() => {
    widgetEl.classList.remove(`exit-${animation}`);
    widgetEl.classList.add(`enter-${animation}`);
    
    setTimeout(() => {
      widgetEl.classList.remove(`enter-${animation}`);
    }, duration);
  }, duration);
  
  return true;
}



function applySettings(settings) {
  console.log("Applying settings in widget:", settings);

  const { colors, font, effects, animationDuration } = settings.theme;

  console.log("🎨 Applying theme:", settings.theme);

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
  if (animationDuration !== undefined) {
    root.style.setProperty('--animation-duration', `${animationDuration}ms`);
    console.log(`⏱️ Animation duration set to ${animationDuration}ms`);
  }

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

  if (effects) {
    if (effects.borderRadius !== undefined) {
      root.style.setProperty("--border-radius", `${effects.borderRadius}px`);
    }
    if (effects.shadow !== undefined) {
      root.style.setProperty("--shadow", effects.shadow ? "0 4px 12px rgba(0,0,0,0.3)" : "none");
    }
  }

  if (!settings.hideOnPause) {
      widgetEl.classList.remove('is-hidden');
  }

  // Показывать обложку
  if (settings.showCover !== undefined) {
    const coverEl = document.getElementById("cover");
    if (coverEl) {
      coverEl.style.display = settings.showCover ? "block" : "none";
    }
  }

  // 🆕 Бегущая строка
  if (settings.marqueeEnabled !== undefined) {
    updateMarqueeState();
  }
}

// 🆕 Обновление состояния marquee
function updateMarqueeState() {
  const titleEl = document.querySelector(".title");
  const artistEl = document.querySelector(".artist");
  
  // 🔥 Безопасное чтение настройки с fallback (по умолчанию true, если не задано)
  const isMarqueeEnabled = currentSettings.marqueeEnabled ?? true;

  function checkAndApply(el) {
    if (!el) return;

    el.classList.remove('marquee');

    void el.offsetWidth;

    const needsMarquee = isMarqueeEnabled && el.scrollWidth > el.clientWidth;
    if(needsMarquee){
      el.style.maxWidth = 'none';
      const realWidth = el.scrollWidth;
      el.style.setProperty('--marquee-width', `${realWidth}px`);
      el.style.maxWidth = '';
      el.classList.add('marquee');
    }

  }
  checkAndApply(titleEl);
  checkAndApply(artistEl);
}

function updateCover(coverUrl) {
  console.log("🖼️ Updating cover:", coverUrl ? `${coverUrl.substring(0, 50)}...` : "null");
  const coverEl = document.getElementById("cover");
  if (!coverEl) return;

  coverEl.style.opacity = "0";
  
  if(coverUrl) {
    const tempImg = new Image();
    
    tempImg.onload = () => {
      console.log("✅ Cover loaded successfully");
      coverEl.src = coverUrl;
      coverEl.style.opacity = "1";
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
  
  // 🆕 Обновляем marquee после изменения текста
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateMarqueeState();
    });
  });
}

function sendPing() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "PING", payload: "Ping from OBS Widget" }));
  }
}

if (currentSettings.animationDuration) {
  root.style.setProperty('--animation-duration', `${currentSettings.animationDuration}ms`);
}

connect();

setInterval(sendPing, 20000);

window.addEventListener("beforeunload", () => {
  console.log('Cleaning up...');
  if(reconnectTimer) clearTimeout(reconnectTimer);
  if(hideTimer) clearTimeout(hideTimer);
  if (ws) ws.close();
});