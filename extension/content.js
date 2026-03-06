console.log("[YM] content script loaded");

let currentTrackKey = "";

function onPlayerBarReady(cb) {
  const obs = new MutationObserver(() => {
    const bar = document.querySelector('[class*="PlayerBar_root__"]');
    if (bar) {
      obs.disconnect();
      cb(bar);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

onPlayerBarReady(playerBar => {
  console.log("[YM] PlayerBar ready");

  setInterval(() => {
    try {
      const titleEl = playerBar.querySelector('[class*="Meta_title__"]');
      const artistEl = playerBar.querySelectorAll('[class*="Meta_artistCaption__"]');
      if (!titleEl || !artistEl) return;

      const title = titleEl.textContent.trim();
      const artist = Array.from(artistEl).map(el => el.textContent.trim()).join(', ');
      const key = `${artist}—${title}`;
      if (key === currentTrackKey) return;
      currentTrackKey = key;

      const coverEl =
        playerBar.querySelector('[class*="PlayerBarDesktopWithBackgroundProgressBar_cover__"]') ||
        playerBar.querySelector('[class*="PlayerBarMobile_cover__"]');

      const srcset = coverEl?.getAttribute("srcset");
      const cover =
        getBestFromSrcset(srcset) || coverEl?.getAttribute("src") || null;

      const bg =
        getComputedStyle(playerBar)
          .getPropertyValue("--player-average-color-background")
          ?.trim() || null;

      chrome.runtime.sendMessage({
        type: "TRACK_UPDATE",
        payload: { title, artist, cover, background_color: bg }
      });

      console.log("[YM] track:", artist, "-", title);
    } catch (e) {
      console.warn("[YM] stopped:", e);
    }
  }, 1000);
});

function getBestFromSrcset(srcset) {
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
