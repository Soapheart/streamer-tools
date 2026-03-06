import { WebSocketServer, WebSocket } from 'ws';
import { WidgetAdapter } from '../../core/ports/WidgetPort';

export interface MusicTrack {
  title: string;
  artist: string;
  cover?: string;
  background_color?: string;
}

export class MusicWidgetAdapter implements WidgetAdapter {
  path = '/ws/music';
  private lastTrack: MusicTrack | null = null;

  setup(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket, req) => {
      // Проверяем путь подключения
      if (req.url !== this.path && req.url !== undefined) return;

      console.log('🎵 Music widget connected');

      // Отправляем последний трек новому клиенту
      if (this.lastTrack) {
        ws.send(JSON.stringify({ type: 'TRACK_UPDATE', payload: this.lastTrack }));
      }

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Обработка PING для keep-alive
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            return;
          }

          // Обработка обновления трека от расширения
          if (data.type === 'TRACK_UPDATE' && data.payload) {
            this.lastTrack = data.payload as MusicTrack;
            console.log('🎵 Track updated:', this.lastTrack.title);
            
            // Рассылаем всем подключённым виджетам (в "плоском" формате)
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                try {
                  client.send(JSON.stringify(this.lastTrack));
                } catch (err) {
                  console.error('❌ Failed to send to client:', err);
                }
              }
            });
          }
        } catch (e) {
          console.error('❌ Invalid music message:', e);
        }
      });

      ws.on('close', () => {
        console.log('🎵 Music widget disconnected');
      });

      ws.on('error', (error) => {
        console.error('❌ Music widget WebSocket error:', error);
      });
    });
  }

  getLastState() {
    return this.lastTrack;
  }

  // Публичный метод для обновления трека извне (например, из IPC)
  updateTrack(track: MusicTrack) {
    this.lastTrack = track;
  }
}