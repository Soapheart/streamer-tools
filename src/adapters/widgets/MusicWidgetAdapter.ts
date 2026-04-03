import { WebSocketServer, WebSocket } from 'ws';
import { WidgetAdapter } from '../../core/ports/WidgetPort';
import { MusicTrack, MusicWidgetConfig } from '../../shared/types';

export class MusicWidgetAdapter implements WidgetAdapter {
  path = '/ws/music';
  
  private lastTrack: MusicTrack | null = null;
  private lastSettings: Partial<MusicWidgetConfig> | null = null;
  private wss: WebSocketServer | null = null;

  // Возможно дублирование настроек в сторе
  private activeIntegrations: MusicWidgetConfig['integrations'] = {
    yandexMusic: true,
    vkMusic: false,
  };

  setup(wss: WebSocketServer) {
    this.wss = wss;

    wss.on('connection', (ws: WebSocket, req) => {
      // Проверяем путь подключения
      if (req.url !== this.path && req.url !== undefined) return;

      console.log('🎵 Music widget connected');

      // Отправляем последний трек новому клиенту
      if (this.lastTrack) {
        ws.send(JSON.stringify({ type: 'TRACK_UPDATE', payload: this.lastTrack }));
      }
      if (this.lastSettings) {
        ws.send(JSON.stringify({ type: 'SETTINGS_UPDATE', payload: this.lastSettings }));
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
            this.handleIncomingTrack(data.payload as MusicTrack);
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

  initialize(settings: MusicWidgetConfig){
    console.log('Initializing MusicWidgetAdapter with store settings');
    if(settings.integrations) {
      this.activeIntegrations = {
        ...this.activeIntegrations,
        ...settings.integrations
      };
    }
    this.lastSettings = settings;
  }

  private handleIncomingTrack(track: MusicTrack) {
    const platform = track.platform;
    console.log(`Received track from platform: ${platform}`);
    let integrationKey: keyof MusicWidgetConfig['integrations'] | null = null;
    if (!platform) {
      console.warn('⚠️ Track without platform, passing through...');
      this.broadcastTrack(track);
      return;
    }
    switch (platform) {
      case 'yandexMusic':
        integrationKey = 'yandexMusic';
        break;
      case 'vkMusic':
        integrationKey = 'vkMusic';
        break;
      default:
        console.warn(`⚠️ Received track with unknown platform "${platform}". Passing through...`, track);
        this.broadcastTrack(track);
        return;
    }

    if (!this.activeIntegrations[integrationKey]) {
      console.log(`🚫 Ignoring track from ${platform} (integration disabled)`);
      return; 
    }

    this.broadcastTrack(track);
  }

  private broadcastTrack(track: MusicTrack) {
    this.lastTrack = track;
    const message = JSON.stringify({ type: 'TRACK_UPDATE', payload: track });
    // console.log('Broadcasting track to clients:', message);
    this.wss?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          console.log('🎵 Sending track to client:', track.title);
          client.send(message);
        } catch (err) {
          console.error('❌ Failed to broadcast track to client:', err);
        }
      }
    });
  }

  public broadcastSettings(settings: Partial<MusicWidgetConfig>) {
    if (settings.integrations) {
      this.activeIntegrations = {
        ...this.activeIntegrations,
        ...settings.integrations
      };
    }
    this.lastSettings = { ...this.lastSettings, ...settings };


    const payload = {} as Partial<MusicWidgetConfig>;
    if(settings.theme != undefined) payload.theme = settings.theme;
    if(settings.bgTransparency != undefined) payload.bgTransparency = settings.bgTransparency / 100;
    if(settings.fontSize != undefined) payload.fontSize = settings.fontSize;
    if(settings.showCover != undefined) payload.showCover = settings.showCover;
    
    const message = JSON.stringify({ type: 'SETTINGS_UPDATE', payload: payload });

    this.wss?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('❌ Failed to broadcast settings to client:', err);
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