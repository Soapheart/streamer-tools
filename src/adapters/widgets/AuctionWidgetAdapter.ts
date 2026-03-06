import { WebSocketServer, WebSocket } from 'ws';
import { WidgetAdapter } from '../../core/ports/WidgetPort';

export class AuctionWidgetAdapter implements WidgetAdapter {
  path = '/ws/auction';

  setup(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket, req) => {
      if (req.url !== this.path) return;
      console.log('🔨 Auction widget connected');
      
    });
  }
}