import { WebSocketServer, WebSocket } from 'ws';
import { WidgetAdapter } from '../../core/ports/WidgetPort';
import { MusicWidgetConfig, MusicTrack } from '../../shared/types'; // ✅ Относительный путь


export class MusicWidgetAdapter implements WidgetAdapter {
  path = '/ws/music';
  private lastTrack: MusicTrack | null = null;
  private lastSettings: Partial<MusicWidgetConfig> | null = null;
  private wss: WebSocketServer | null = null;

  setup(wss: WebSocketServer) {
    this.wss = wss;
    
    wss.on('connection', (ws: WebSocket, req) => {
      // Гибкая проверка пути (поддерживаем /ws/music, /ws/music/, с параметрами)
      const requestPath = req.url?.split('?')[0].replace(/\/$/, '');
      const adapterPath = this.path.replace(/\/$/, '');
      if (requestPath !== adapterPath) return;

      console.log('🎵 Music widget connected');

      // Отправляем последний трек новому клиенту
      if (this.lastTrack) {
        ws.send(JSON.stringify({ type: 'TRACK_UPDATE', payload: this.lastTrack }));
      }
      if(this.lastSettings){
        ws.send(JSON.stringify({ type: 'SETTINGS_UPDATE', payload: this.lastSettings }));
      }

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          // Обработка обновления трека от расширения
          if (data.type === 'TRACK_UPDATE' && data.payload) {
            this.lastTrack = data.payload as MusicTrack;
            console.log('🎵 Track updated:', this.lastTrack.title);
            
            // Рассылаем всем подключённым виджетам (в "плоском" формате)
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                try {
                  client.send(JSON.stringify({ type: 'TRACK_UPDATE', payload: this.lastTrack }));
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

  private handleIncomingTrack(track: MusicTrack) {
    const platform = track.platform;
    if(!platform) {
      console.warn('⚠️ Received track without platform info:', track);
      this.broadcastTrack(track);
      return;
    }
    let IntegrationKey: keyof IntegrationState | null = null;
  }

  // ✅ Метод рассылки настроек
  broadcastSettings(settings: Partial<MusicWidgetConfig>) {
    if (!this.wss) {
      console.warn('❌ WebSocket server not initialized yet');
      return;
    }

    this.lastSettings = { ...this.lastSettings, ...settings };

    const payload: Partial<MusicWidgetConfig> = {};
    // Прозрачность: конвертируем 0-100 → 0-1 для CSS
    if (settings.bgTransparency !== undefined) {
      payload.bgTransparency = settings.bgTransparency;
    }
    
    if (settings.theme) {
      payload.theme = settings.theme;
    }
    
    if (settings.fontSize) {
      payload.fontSize = settings.fontSize;
    }
    
    // ✅ Проверка на undefined, чтобы false тоже передавался
    if (settings.showCover !== undefined) {
      payload.showCover = settings.showCover;
    }

    console.log('🎨 Broadcasting settings:', payload);
  
    this.wss.clients.forEach((client, index) => {
      console.log(`📡 Client ${index}: readyState=${client.readyState}`);
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({
            type: 'SETTINGS_UPDATE',
            payload
          }));
        } catch (e) {
          console.error('❌ Failed to send settings:', e);
        }
      }
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