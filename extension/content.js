console.log("Music service content script loaded");

//Util
const getBestFromSrcset = (srcset) => {
  if (!srcset) return null;
  return srcset
    .split(",")
    .map(s => {
      const [url] = s.trim().split(" ");
      const m = url.match(/\/(\d+)x(\d+)/);
      return m ? { url, size: +m[1] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.size - a.size)[0]?.url || null;
}

const strategies = {
  yandex: {
    id: "yandexMusic",
    match: (host) => host.includes("music.yandex."),
    parse: () => {
      const playerBar = document.querySelector('[class*="PlayerBar_root__"]');
      if (!playerBar) return null;
      const titleEl = playerBar.querySelector('[class*="Meta_title__"]');
      const artistEls = playerBar.querySelectorAll('[class*="Meta_artistCaption__"]');
      if(!titleEl || artistEls.length === 0) return null;

      const title = titleEl.textContent.trim();
      const artist = Array.from(artistEls).map(artist => artist.textContent.trim()).join(', ');

      let cover = null;
      const coverEl = playerBar.querySelector('[class*="PlayerBarDesktopWithBackgroundProgressBar_cover__"]') ||
        playerBar.querySelector('[class*="PlayerBarMobile_cover__"]');
      if(coverEl){
        const srcset = coverEl.getAttribute("srcset")
        if(srcset){
          cover = getBestFromSrcset(srcset);
        }
        if(!cover){
          cover = coverEl.getAttribute("src");
        }
      }
      cover = cover || null;
      const bg = getComputedStyle(playerBar).getPropertyValue("--player-average-color-background")?.trim() || null;

      return {title, artist, cover, background_color: bg, platform: "yandexMusic"};
    }
  },

  vk: {
    id: "vkMusic",
    match: (host) => host.includes('vk.com') || host.includes('vk.ru'),
    parse: () => {
      const bar = document.querySelector('[class*="vkitAudioPlayerPlaybackBody__root"]');
      if (!bar) return null;
      const coverImg = bar.querySelector('[class*="vkuiImageBase__img"]');
      const titleEl = bar.querySelector('[class*="vkitAudioPlayerAudioInfo__title"]');
      const artistEl = bar.querySelector('[class*="vkitAudioPlayerAudioInfo__extra"]');
      if (!titleEl || !artistEl) return null;

      const title = titleEl.lastChild?.textContent.trim() || titleEl.textContent.trim();
      const artist = artistEl.lastChild?.textContent.trim() || artistEl.textContent.trim();
      const cover = coverImg ? coverImg.getAttribute('src') : null;
      let bg = null;
      return { title, artist, cover, background_color: bg, platform: "vkMusic" };
    }
  }
}

let activeStrategy = null;
let lastTrackKey = "";
let pollingInterval = null;

const findActiveStrategy = () => {
  const host = window.location.hostname;
  return Object.values(strategies).find(strategy => strategy.match(host));
}

const sendToBackground = (data) => {
  if(!data.title || !data.artist) return;
  const trackKey = `${data.artist.toLowerCase()} || ${data.title.toLowerCase()}`;

  if(trackKey === lastTrackKey) return;

  lastTrackKey = trackKey;

  console.log(`🎶 [${activeStrategy.id}] New Track:`, data.artist, "-", data.title);
  try{
    chrome.runtime.sendMessage({ 
      type: "TRACK_UPDATE", 
      payload: data 
    })
  }catch(e){
    if(e.message?.includes("Extension context invalidated")) {
      console.warn("[Content] Extension context invalidated, stopping monitoring");
      stopMonitoring();
    } else {
      console.error("[Content] sendMessage error:", e);
    }
  }
}

const stopMonitoring = () => {
  if(pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  activeStrategy = null;
}

const startMonitoring = () => {
  if(pollingInterval) clearInterval(pollingInterval);
  activeStrategy = findActiveStrategy();
  if(!activeStrategy) {
    return;
  }

  console.log(`Using strategy: ${activeStrategy.id}`);

  pollingInterval = setInterval(() => {
    try {
      const data = activeStrategy.parse();
      if(data){
        sendToBackground(data);
      }
    }catch(e){
      console.warn(`Error in strategy ${activeStrategy.id}:`, e);
    }
  }, 1500);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", startMonitoring);
}else{
  startMonitoring();
}

let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if(currentUrl !== lastUrl){
    lastUrl = currentUrl;
    lastTrackKey = ""; // сбрасываем, чтобы не пропустить трек при навигации
    startMonitoring();
  }
}).observe(document, {subtree: true, childList: true});