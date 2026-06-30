let creating;

// гарантируем, что offscreen существует
async function ensureOffscreen() {
  if (creating) return creating;

  creating = chrome.offscreen.hasDocument().then(async exists => {
    if (exists) return;

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'], // можно и другие, но этого хватает
      justification: 'Keep WebSocket alive'
    });
  });

  await creating;
  creating = null;
}

// при старте
ensureOffscreen();

// проксируем сообщения в offscreen
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "TRACK_UPDATE") return;

  ensureOffscreen().then(() => {
    chrome.runtime.sendMessage({
      target: "offscreen",
      ...msg
    });
  });
});