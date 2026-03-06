import { WebSocketServer, WebSocket } from 'ws';

export interface WidgetAdapter {
  /** Уникальный путь для WebSocket (например, '/ws/music') */
  path: string;
  
  /** Инициализация обработчиков для этого виджета */
  setup(wss: WebSocketServer): void;
  
  /** Опционально: получить последнее состояние для нового клиента */
  getLastState?(): unknown | null;
}