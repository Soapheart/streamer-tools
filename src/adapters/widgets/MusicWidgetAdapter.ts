import { WebSocketServer, WebSocket } from 'ws';
import { WidgetAdapter } from '../../core/ports/WidgetPort';

export interface MusicTrack {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  progress: number;
  duration: number;
  timestamp: number;
}

export class MusicWidgetAdapter implements WidgetAdapter {
  path = '/ws/music';
  private lastTrack: MusicTrack | null = null;

  setup(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket, req) => {
      // Проверяем, что подключение на правильный путь
      if (req.url !== this.path) return;

      console.log('🎵 Music widget connected');

      // Отправляем последний трек новому клиенту
      if (this.lastTrack) {
        ws.send(JSON.stringify({ type: 'TRACK_UPDATE', payload: this.lastTrack }));
      }

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            return;
          }

          if (data.type === 'TRACK_UPDATE' && data.payload) {
            this.lastTrack = data.payload as MusicTrack;
            
            // Рассылаем всем подключённым клиентам
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ 
                  type: 'TRACK_UPDATE', 
                  payload: this.lastTrack 
                }));
              }
            });
          }
        } catch (e) {
          console.error('❌ Invalid music message:', e);
        }
      });
    });
  }

  getLastState() {
    return this.lastTrack;
  }

  // Публичный метод для обновления трека извне (например, от расширения)
  updateTrack(track: MusicTrack) {
    this.lastTrack = track;
    // Логика рассылки будет в сервере, который хранит wss
  }
}