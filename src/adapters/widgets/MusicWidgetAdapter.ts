// adapters/widgets/MusicWidgetAdapter.ts
import { WebSocket } from 'ws';
import { WidgetAdapter, WSClient } from '../../core/ports/WidgetPort';
import { MusicCaptureMethod, MusicTrack, MusicWidgetConfig, WSMessageType } from '../../shared/types';
import { trace } from 'node:console';

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


  private captureMethod: MusicCaptureMethod = 'auto';
  private allowVideoContent = false;
  private extensionConnected = false;
  private extensionLastSeen = 0;

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
      const track = data.payload as MusicTrack;

      if(track.source === 'extension'){
        this.extensionConnected = true;
        this.extensionLastSeen = Date.now();
      }

      this.handleIncomingTrack(track);
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
    if(settings.captureMethod){
      this.captureMethod = settings.captureMethod;
      console.log(`Initial capture method: ${this.captureMethod}`);
    }
    if(settings.allowVideoContent !== undefined){
      this.allowVideoContent = settings.allowVideoContent;
      console.log(`Initial allow video content: ${this.allowVideoContent}`);
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

    if(settings.captureMethod !== undefined){
      this.captureMethod = settings.captureMethod;
      console.log(`🔄 Capture method changed to: ${this.captureMethod}`);
    }
    if(settings.allowVideoContent !== undefined){
      this.allowVideoContent = settings.allowVideoContent;
      console.log(`🎬 Allow video content: ${this.allowVideoContent}`);
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
    const source = track.source;
    const platform = track.platform;
    const contentType = track.contentType || 'music';

    console.log('🔍 Incoming track details:', {
      source: track.source,
      platform: track.platform,
      contentType: track.contentType,
      title: track.title,
      artist: track.artist,
      captureMethod: this.captureMethod,
      allowVideoContent: this.allowVideoContent
    });

    if (!this.isSourceAllowed(source)) {
      console.log(`🚫 Source "${source}" blocked by captureMethod "${this.captureMethod}"`);
      return;
    }


    if(source === 'extension'){
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
    }

    if(source === 'winrt' || source === 'mpris'){
      if(contentType === 'video' && !this.allowVideoContent){
          console.log(`🚫 Blocked video content: ${track.artist} - ${track.title}`);
        return;
      }
    }

  console.log(`✅ Allowing track from ${source}: ${track.artist} - ${track.title}`);
    this.broadcastTrack(track);
  }

  private isSourceAllowed(source: string): boolean {
    switch(this.captureMethod){
      case 'auto':
        return true;
      case 'extension':
        return source === 'extension';
      case 'winrt':
        return source === this.captureMethod;
      case 'mpris':
        return source === this.captureMethod;
      default:
        return true;
    }
  }

  public getExtensionStatus(): {connected: boolean, lastSeen: number}{
    const isAlive = this.extensionConnected && (Date.now() - this.extensionLastSeen < 10000);
    return {
      connected: isAlive,
      lastSeen: this.extensionLastSeen
    }
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