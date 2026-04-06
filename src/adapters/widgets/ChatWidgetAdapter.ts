// import { WebSocketServer, WebSocket } from 'ws';
// import { WidgetAdapter } from '../../core/ports/WidgetPort';

// export class ChatWidgetAdapter implements WidgetAdapter {
//   path = '/ws/chat';

//   setup(wss: WebSocketServer) {
//     wss.on('connection', (ws: WebSocket, req) => {
//       if (req.url !== this.path) return;
//       console.log('💬 Chat widget connected');
      
//     });
//   }
// }