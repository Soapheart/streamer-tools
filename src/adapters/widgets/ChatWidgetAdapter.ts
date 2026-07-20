// src/adapters/widgets/ChatWidgetAdapter.ts
import { WebSocket } from 'ws';
import { WidgetAdapter, WSClient } from '../../core/ports/WidgetPort';
import { ChatMessage } from '../sources/TwitchChatService';

export class ChatWidgetAdapter implements WidgetAdapter {
  readonly path = '/ws/chat';
  
  private clients = new Set<WSClient>();

  // ─────────────────────────────────────────────────────────
  // Хуки жизненного цикла (вызываются WSGateway)
  // ─────────────────────────────────────────────────────────

  onConnect(client: WSClient): void {
    this.clients.add(client);
    console.log(`💬 [ChatAdapter] Client connected: ${client.id}. Total clients: ${this.clients.size}`);
  }

  onMessage(client: WSClient, data: any): void {
    // Обработка PING/PONG для поддержания соединения
    if (data.type === 'PING') {
      // Теперь мы просто передаем объект, а sendToClient сам сделает JSON.stringify
      this.sendToClient(client, { type: 'PONG', timestamp: Date.now() });
    }
  }

  onDisconnect(client: WSClient): void {
    this.clients.delete(client);
    console.log(`💬 [ChatAdapter] Client disconnected: ${client.id}. Total clients: ${this.clients.size}`);
  }

  // ─────────────────────────────────────────────────────────
  // Публичные методы (вызываются извне, например, TwitchChatService)
  // ─────────────────────────────────────────────────────────

  public broadcastMessage(msg: ChatMessage): void {
    console.log(`📡 [ChatAdapter] Broadcasting message from ${msg.username}. Active clients: ${this.clients.size}`);
    
    const payload = {
      type: 'CHAT_MESSAGE',
      payload: msg,
    };

    for (const client of this.clients) {
      this.sendToClient(client, payload);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Приватная логика
  // ─────────────────────────────────────────────────────────

  // ИСПРАВЛЕНИЕ: тип изменен на 'any', и добавлен JSON.stringify
  private sendToClient(client: WSClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message)); // <-- Вот ключевое исправление
      } catch (err) {
        console.error(`❌ [ChatAdapter] Failed to send to ${client.id}:`, err);
      }
    }
  }
}