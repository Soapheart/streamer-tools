// adapters/widgets/MusicWidgetAdapter.ts
import { WebSocket } from 'ws';
import { WidgetAdapter, WSClient } from '../../core/ports/WidgetPort';
import { MusicTrack, MusicWidgetConfig, WSMessageType } from '../../shared/types';

export class MusicWidgetAdapter implements WidgetAdapter {
  readonly path = '/ws/music';
  
  private clients = new Set<WSClient>();
  private lastTrack: MusicTrack | null = null;
  private lastSettings: Partial<MusicWidgetConfig> | null = null;
  
  // Состояние интеграций (по умолчанию)
  private activeIntegrations: MusicWidgetConfig['integrations'] = {
    yandexMusic: true,
    vkMusic: false,
  };

  // ─────────────────────────────────────────────────────────
  // Хуки жизненного цикла (вызываются WSGateway)
  // ─────────────────────────────────────────────────────────

  onConnect(client: WSClient): void {
    this.clients.add(client);
    console.log(`🎵 Music widget connected: ${client.id}`);

    // Отправляем последнее известное состояние новому клиенту
    if (this.lastTrack) {
      this.sendToClient(client, {
        type: WSMessageType.TRACK_UPDATE,
        payload: this.lastTrack
      });
    }
    if (this.lastSettings) {
      this.sendToClient(client, {
        type: WSMessageType.SETTINGS_UPDATE,
        payload: this.transformSettings(this.lastSettings)
      });
    }
  }

  onMessage(client: WSClient, data: any): void {
    // 🔄 PING/PONG для keep-alive
    if (data.type === WSMessageType.PING) {
      this.sendToClient(client, { 
        type: WSMessageType.PONG, 
        timestamp: Date.now() 
      });
      return;
    }

    // 🎵 Обработка обновления трека от Chrome-расширения
    if (data.type === WSMessageType.TRACK_UPDATE && data.payload) {
      this.handleIncomingTrack(data.payload as MusicTrack);
    }
  }

  onDisconnect(client: WSClient): void {
    this.clients.delete(client);
    console.log(`🎵 Music widget disconnected: ${client.id}`);
  }

  // ─────────────────────────────────────────────────────────
  // Публичные методы (вызываются извне, например через IPC)
  // ─────────────────────────────────────────────────────────


  public initialize(settings: MusicWidgetConfig): void {
    console.log('🎵 Initializing MusicWidgetAdapter');
    this.lastSettings = settings;
    // Инициализирует последние настройки и активные интеграции при загрузке приложения
    console.log('Current integration settings:', this.lastSettings);
    if (settings.integrations) {
      this.activeIntegrations = { ...this.activeIntegrations, ...settings.integrations };
    }
  }

  /**
   * Обновление настроек из Electron UI (через ipcMain)
   */
  public broadcastSettings(settings: Partial<MusicWidgetConfig>): void {
    // Обновляем флаги интеграций
    if (settings.integrations) {
      this.activeIntegrations = {
        ...this.activeIntegrations,
        ...settings.integrations
      };
    }

    // Кэшируем настройки для новых клиентов
    this.lastSettings = { ...this.lastSettings, ...settings };

    // Трансформируем и рассылаем всем подключённым виджетам
    const uiPayload = this.transformSettings(settings);
    
    for (const client of this.clients) {
      this.sendToClient(client, {
        type: WSMessageType.SETTINGS_UPDATE,
        payload: uiPayload
      });
    }

    if(this.affectsTrackRendering(settings) && this.lastTrack){
      this.broadcastTrack(this.lastTrack);
    }

  }

  private affectsTrackRendering(settings: Partial<MusicWidgetConfig>): boolean {
    return settings.theme !== undefined || settings.bgTransparency !== undefined;
  }

  // ─────────────────────────────────────────────────────────
  // Приватная логика
  // ─────────────────────────────────────────────────────────

  private handleIncomingTrack(track: MusicTrack): void {
    const platform = track.platform;
    
    // Если платформа не указана — пропускаем трек (fallback)
    if (!platform) {
      console.warn('⚠️ Track without platform, passing through...');
      this.broadcastTrack(track);
      return;
    }

    // Маппинг платформы на ключ интеграции
    let integrationKey: keyof MusicWidgetConfig['integrations'] | null = null;
    switch (platform) {
      case 'yandexMusic':
        integrationKey = 'yandexMusic';
        break;
      case 'vkMusic':
        integrationKey = 'vkMusic';
        break;
      default:
        console.warn(`⚠️ Unknown platform "${platform}", passing through...`);
        this.broadcastTrack(track);
        return;
    }

    // Фильтрация по настройкам интеграций
    if (!this.activeIntegrations[integrationKey]) {
      console.log(`🚫 Ignoring track from ${platform} (integration disabled)`);
      return;
    }

    this.broadcastTrack(track);
  }

  private broadcastTrack(track: MusicTrack): void {
    this.lastTrack = track;
    

    const payload = { ...track };

    // Applying transparency
    if(this.lastSettings?.bgTransparency !== undefined && track.background_color){
      const alpha = this.lastSettings.bgTransparency / 100;
      payload.background_color = this.applyTransparencyToColor(track.background_color, alpha);
    }
    console.log("Broadcasting track to widget:", payload);
    for (const client of this.clients) {
      this.sendToClient(client, {
        type: WSMessageType.TRACK_UPDATE,
        payload: payload
      });
    }
  }

  /**
   * Трансформация настроек из формата UI (0-100) в формат CSS (0-1)
   */
  private transformSettings(settings: Partial<MusicWidgetConfig>): Partial<MusicWidgetConfig> {
    const payload: Partial<MusicWidgetConfig> = {};
    
    if (settings.theme !== undefined) payload.theme = settings.theme;
    
    if (settings.bgTransparency !== undefined) {
      // Конвертируем 0-100 (UI slider) → 0-1 (CSS alpha)
      payload.bgTransparency = settings.bgTransparency / 100;
    }
    
    if (settings.fontSize !== undefined) payload.fontSize = settings.fontSize;
    if (settings.showCover !== undefined) payload.showCover = settings.showCover;

    return payload;
  }

private applyTransparencyToColor(color: string, alpha: number): string {
  // Уже есть альфа — заменяем его
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  if (color.match(/^hsla?\(/i)) {
    return color.replace(/hsla?\(([^)]+)\)/i, (_, values) => {
      // Удаляем существующий альфа, если есть
      const parts = values.split(',').slice(0, 3);
      return `hsla(${parts.join(', ')}, ${safeAlpha})`;
    });
  }
  
  if (color.startsWith('#')) {
    let hex = color.replace('#', '');
    // Расширяем шорт-хекс #abc → #aabbcc
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }
  
  if (color.match(/^rgba?\(/i)) {
    return color.replace(/rgba?\(([^)]+)\)/i, (_, values) => {
      const parts = values.split(',').slice(0, 3);
      return `rgba(${parts.join(', ')}, ${safeAlpha})`;
    });
  }
  
  // Fallback: возвращаем как есть
  return color;
}


  /**
   * Безопасная отправка сообщения клиенту
   */
  private sendToClient(client: WSClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (err) {
        console.error(`❌ Failed to send to ${client.id}:`, err);
      }
    }
  }
}