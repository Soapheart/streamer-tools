let ws = null;
let lastTrack = null;

function connectWS() {
  ws = new WebSocket("ws://127.0.0.1:3000/ws/music");

  ws.onopen = () => {
    console.log("[BG] WS connected");
    if (lastTrack) ws.send(JSON.stringify(lastTrack));
  };

  ws.onclose = () => {
    console.log("[BG] WS closed, retry...");
    setTimeout(connectWS, 2000);
  };

  ws.onerror = () => ws.close();
}

connectWS();

// background.js
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type !== "TRACK_UPDATE") return;
  lastTrack = msg.payload;

  if (ws?.readyState === WebSocket.OPEN) {
    // ✅ Оборачиваем в формат, который ждёт адаптер
    ws.send(JSON.stringify({ 
      type: "TRACK_UPDATE", 
      payload: lastTrack 
    }));
    console.log("[BG → WS]", lastTrack.title);
  }
});
