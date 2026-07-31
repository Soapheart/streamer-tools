//adapters/sources/TwitchChatService.ts

import tmi from 'tmi.js';
import type { ChatMessage } from '../../shared/types';

export class TwitchChatService {
  private client: tmi.Client | null = null;
  private onMessage: (msg: ChatMessage) => void;

  constructor(onMessage: (msg: ChatMessage) => void) {
    this.onMessage = onMessage;
  }

  connect(channel: string, token?: string) {
    if (!channel) return;

    if (this.client) {
      this.disconnect();
    }

    console.log(`[Twitch] Connecting to: ${channel}`);

    this.client = new tmi.Client({
      options: { debug: true }, // ← ВКЛЮЧАЕМ debug для отладки
      connection: { reconnect: true, secure: true },
      channels: [channel],
    });

    this.client.on('message', (_channel, tags, message, self) => {
      if (self) return;

      console.log(`[Twitch] MSG from ${tags['display-name']}: ${message}`); // ← Логируем каждое сообщение

      this.onMessage({
        username: tags['display-name'] || tags.username || 'Anonymous',
        color: tags.color || '#FFFFFF',
        message,
        timestamp: Date.now(),
        source: 'twitch',
      });
    });

    this.client.on('connected', (addr, port) => {
      console.log(`[Twitch] ✅ Connected to ${addr}:${port}`);
    });

    this.client.on('disconnected', (reason) => {
      console.log(`[Twitch] ❌ Disconnected: ${reason}`);
    });

    this.client.connect().catch((err) => {
      console.error('[Twitch] Connect error:', err);
    });
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      console.log('[Twitch] Disconnected manually');
    }
  }
}