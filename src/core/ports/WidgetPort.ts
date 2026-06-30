import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';


export interface WSClient {
  id: string;
  ws: WebSocket;
  req: IncomingMessage;
}

export interface WidgetAdapter {
  path: string;
  
  onConnect?(client: WSClient): void;
  onMessage?(client: WSClient, data: unknown): void;
  onDisconnect?(client: WSClient): void;

  getInitialState?(): unknown;
  broadcastSettings?(settings: Record<string, unknown>): void; // для вызова из IPC
}