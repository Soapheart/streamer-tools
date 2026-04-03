// let ws = null;
// let lastTrack = null;

// const sendTrack = track => {
//   console.log("[BG] Attempting to send track:", track);
//   if (!ws || ws.readyState !== WebSocket.OPEN) return;

//   console.log("[BG] Sending track to WS:", track);
//   ws.send(JSON.stringify(track));
//   console.log("[BG → WS]", track.title);
// }

// function connectWS() {
//   ws = new WebSocket("ws://127.0.0.1:3000/ws/music");

//   ws.onopen = () => {
//     console.log("[BG] WS connected");
//     if (lastTrack) sendTrack(lastTrack);
//   };

//   ws.onclose = () => {
//     console.log("[BG] WS closed, retry...");
//     setTimeout(connectWS, 2000);
//   };

//   ws.onerror = () => ws.close();
// }

// connectWS();


// chrome.runtime.onMessage.addListener(msg => {
//   if (msg.type !== "TRACK_UPDATE") return;
//   lastTrack = msg.payload;
//   sendTrack(lastTrack);
// });
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
    ws.send(JSON.stringify({ 
      type: "TRACK_UPDATE", 
      payload: lastTrack 
    }));
    console.log("[BG → WS]", lastTrack.title);
  }
});