let ws = null;
let lastTrack = null;

function connectWS() {
  ws = new WebSocket("ws://127.0.0.1:3000/ws/music");

  ws.onopen = () => {
    console.log("[OFFSCREEN] WS connected");

    if (lastTrack) {
      ws.send(JSON.stringify({
        type: "TRACK_UPDATE",
        payload: lastTrack
      }));
    }
  };

  ws.onmessage = (event) => {
    console.log("[WS → OFFSCREEN]", event.data);
  };

  ws.onclose = () => {
    console.log("[OFFSCREEN] WS closed, retry...");
    setTimeout(connectWS, 2000);
  };

  ws.onerror = () => ws.close();
}

connectWS();

// слушаем background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;
  if (msg.type !== "TRACK_UPDATE") return;

  lastTrack = msg.payload;

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "TRACK_UPDATE",
      payload: lastTrack
    }));

    console.log("[OFFSCREEN → WS]", lastTrack.title);
  }
});