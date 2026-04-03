import { MusicTrack } from '../../shared/types';
import { WebSocketServer } from 'ws';

export interface WidgetAdapter {
  /** Уникальный путь для WebSocket (например, '/ws/music') */
  path: string;
  
  /** Инициализация обработчиков для этого виджета */
  setup(wss: WebSocketServer): void;
  
  /** Опционально: получить последнее состояние для нового клиента */
  getLastState?(): unknown | null;
  
  updateTrack?(track: MusicTrack): void;
}