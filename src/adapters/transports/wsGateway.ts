import { WebSocketServer, WebSocket } from 'ws';
import { WidgetAdapter, WSClient } from '../../core/ports/WidgetPort';
import { IncomingMessage } from 'node:http';
import { randomUUID } from 'crypto'; // явный импорт

export class WSGateway {
  private adapters = new Map<string, WidgetAdapter>();
  private isStarted = false;

  constructor(private wss: WebSocketServer) {}

  register(adapter: WidgetAdapter) {
    this.adapters.set(adapter.path, adapter);
  }

  start() {
    if (this.isStarted) return;
    this.isStarted = true;

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const path = (req.url || '').split('?')[0];
      const adapter = this.adapters.get(path);

      if (!adapter) {
        ws.close(1008, 'Unknown path');
        return;
      }

      const client: WSClient = {
        id: randomUUID(),
        ws,
        req
      };

      console.log(`🔌 Connected to ${path} | Client: ${client.id}`);

      try {
        adapter.onConnect?.(client);
        
        if (adapter.getInitialState) {
          const state = adapter.getInitialState();
          if (state) ws.send(JSON.stringify(state));
        }
      } catch (err) {
        console.error(`💥 Error in ${adapter.path} onConnect:`, err);
        ws.close(1011, 'Internal adapter error');
        return;
      }

      ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          adapter.onMessage?.(client, data);
        } catch (err) {
          console.error(`📦 Invalid JSON from ${path}:`, raw.toString().slice(0, 100));
        }
      });

      ws.on('close', () => {
        adapter.onDisconnect?.(client);
        console.log(`🔌 Disconnected from ${path} | Client: ${client.id}`);
      });

      ws.on('error', (err) => {
        console.error(`⚠️ WS error on ${path}:`, err.message);
      });
    });
  }
}