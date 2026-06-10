
import { WidgetAdapter } from '../ports/WidgetPort'; // Или ваш базовый интерфейс
import { WebSocketServer } from 'ws';

// Примечание: этот пакет нужно установить: npm install windows-media-control
// И настроить electron-rebuild для его компиляции под версию Electron.
let mediaControl: any = null;

export class WinrtMusicSource {
  private wss: WebSocketServer | null = null;
  private isActive = false;

  constructor() {
    if (process.platform === 'win32') {
      try {
        mediaControl = require('windows-media-control');
      } catch (e) {
        console.warn('⚠️ windows-media-control не найден. Убедитесь, что он установлен и собран через electron-rebuild.');
      }
    }
  }

  public attachToWebSocket(wss: WebSocketServer) {
    this.wss = wss;
  }

  public start() {
    if (!this.isActive && mediaControl) {
      this.isActive = true;
      console.log('🎵 WinRT Music Source started');
      
      // Получаем текущую сессию при старте
      mediaControl.getCurrentSession().then((session: any) => {
        if (session) this.broadcastTrack(session);
      }).catch(err => console.error('WinRT get current session error:', err));

      // Подписываемся на изменения
      mediaControl.on('currentsessionchanged', (session: any) => {
        if (session) this.broadcastTrack(session);
      });

      mediaControl.on('playbackstatuschanged', (status: string) => {
        // Можно обрабатывать паузу/возобновление, если виджет это поддерживает
        console.log('Playback status changed:', status);
      });
    }
  }

  public stop() {
    this.isActive = false;
    console.log('🛑 WinRT Music Source stopped');
  }

  private broadcastTrack(session: any) {
    if (!this.wss) return;

    // Парсим данные из WinRT в формат, ожидаемый виджетом
    const trackData = {
      type: 'TRACK_UPDATE',
      payload: {
        title: session.title || 'Неизвестный трек',
        artist: session.artist || 'Неизвестный исполнитель',
        cover: session.thumbnailUrl || null, // WinRT часто отдает локальный путь или URL
        background_color: null, // Можно вычислить на фронтенде по обложке
      }
    };

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(trackData));
      }
    });
  }
}