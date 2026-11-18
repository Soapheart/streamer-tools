import { ChatClient } from '@twurple/chat';
import type { ChatMessage as TwurpleChatMessage } from '@twurple/chat';
import type { AuthProvider } from '@twurple/auth';
import type { ChatMessage } from '../../shared/types';

export class TwitchChatService {
  private chatClient: ChatClient | null = null;
  private authProvider: AuthProvider | null = null;
  private currentChannel: string | null = null;
  private onMessageCallback: (msg: ChatMessage) => void;
  private isConnected = false;

  constructor(onMessage: (msg: ChatMessage) => void) {
    this.onMessageCallback = onMessage;
  }

async connect(channel: string) {
    console.log(`[TwitchChat] === CONNECT START === channel="${channel}", hasAuthProvider=${!!this.authProvider}`);
    
    // 🔥 ЖЕСТКИЙ СБРОС: Если клиент существует, принудительно убиваем его перед созданием нового
    if (this.chatClient) {
      console.log('[TwitchChat] ⚠️ Existing client found. Force disconnecting before new connection...');
      await this.disconnect();
      // Небольшая задержка, чтобы гарантировать закрытие сокета
      await new Promise(resolve => setTimeout(resolve, 100)); 
    }

    this.currentChannel = channel.toLowerCase();

    const clientOptions: any = {
      channels: [this.currentChannel],
    };

    if (this.authProvider) {
      clientOptions.authProvider = this.authProvider;
      console.log(`[TwitchChat] ✅ Using AUTHORIZED mode for "${this.currentChannel}"`);
    } else {
      console.log(`[TwitchChat] ✅ Using ANONYMOUS mode for "${this.currentChannel}"`);
    }

    this.chatClient = new ChatClient(clientOptions);

    this.chatClient.onMessage((ch, user, text, msg: any) => {
      console.log(`[TwitchChat] 📨 MESSAGE RECEIVED from ${user}: ${text}`);
      const normalized = this.normalizeMessage(ch, user, text, msg);
      this.onMessageCallback(normalized);
    });

    this.chatClient.onConnect(() => {
      console.log(`[TwitchChat] 🟢 CONNECTED to ${this.currentChannel}`);
    });

    this.chatClient.onDisconnect((manually, reason) => {
      console.log(`[TwitchChat] 🔴 DISCONNECTED manually=${manually}, reason=${reason}`);
      this.isConnected = false;
    });

    this.chatClient.onAuthenticationFailure((message) => {
      console.error(`[TwitchChat] ❌ AUTHENTICATION FAILURE: ${message}`);
    });

    try {
      await this.chatClient.connect();
      this.isConnected = true;
      console.log(`[TwitchChat] === CONNECT SUCCESS ===`);
    } catch (error) {
      console.error(`[TwitchChat] === CONNECT FAILED ===`, error);
      throw error;
    }
  }

  /** Приводит сообщение Twurple к внутреннему формату */
  private normalizeMessage(
    channel: string,
    user: string,
    text: string,
    msg: TwurpleChatMessage
  ): ChatMessage {
    // Бейджи: Map<string, string> -> Record<string, string>
    const badges = Object.fromEntries(msg.userInfo.badges);

    const emotes: Record<string, string[]> = {};
    for (const [emoteId, positions] of msg.emoteOffsets) {
      emotes[emoteId] = positions;
    }

    return {
      id: msg.id,
      channel: channel.replace(/^#/, '').toLowerCase(),
      username: user.toLowerCase(),
      displayName: msg.userInfo.displayName || user,
      color: msg.userInfo.color ?? '#A970FF',
      text,
      badges,
      timestamp: msg.date.getTime(),
      source: 'twitch',
      emotes,
    };
  }

  async disconnect() {
    if (!this.chatClient) return;
    try {
      await this.chatClient.quit();
    } catch (error) {
      console.error('[TwitchChat] Error during disconnect:', error);
    }
    this.chatClient = null;
    this.isConnected = false;
    this.currentChannel = null;
  }

  setAuthProvider(authProvider: AuthProvider | null) {
    const channel = this.currentChannel;
    const wasConnected = this.isConnected;
    this.authProvider = authProvider;

    if (wasConnected && channel) {
      console.log('[TwitchChat] Reconnecting with new auth mode...');
      void this.disconnect().then(() => this.connect(channel));
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      channel: this.currentChannel,
      isAuthorized: !!this.authProvider,
    };
  }
}