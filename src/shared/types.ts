import { Badges } from "tmi.js";
import { THEME_PRESETS } from "./themes";

// === Типы сообщений для WebSocket ===
export enum WSMessageType {
  TRACK_UPDATE = 'TRACK_UPDATE',
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  PING = 'PING',
  PONG = 'PONG',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

// === Через какой метод захватывать музыку ===
export type MusicCaptureMethod = 'auto' | 'extension' | 'winrt' | 'mpris';

// === Типы для кнопок ===
export type LinkAction = 'open' | 'copy';
export interface ExternalLinkButtonProps {
  url: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  action?: LinkAction;
  onSuccess?: (action: LinkAction) => void; // <-- Добавлен аргумент
  onError?: (error: Error, action: LinkAction) => void; // <-- Добавлен аргумент
}

// === Базовые настройки виджета (общие для всех) ===
export interface BaseWidgetConfig {
  enabled: boolean;
}

interface FontSettings {
  size?: number;
  family?: string;
  weight?: string;
}

// === Настройки музыки ===
export interface MusicWidgetConfig extends BaseWidgetConfig {
  showCover: boolean;
  theme: keyof typeof THEME_PRESETS;
  bgTransparency: number;
  font: FontSettings;
  effects: {
    shadow: string,
    borderRadius: number,
  };
  widgetHeight: number;
  widgetWidth: number;
  integrations: {
    yandexMusic: boolean;
    vkMusic: boolean;
  };
  playState?: "playing" | "paused";
  captureMethod: MusicCaptureMethod;
  allowVideoContent: boolean;
}

export interface MusicTrack {
    title: string;
    artist: string;
    cover?: string;
    background_color?: string;
    source: 'extension' | 'winrt' | 'mpris'
    platform?: 'vkMusic' | 'yandexMusic' | 'spotify' | 'yandex-desktop' | 'browser' | 'unknown';
    contentType?: 'music' | 'video' | 'unknown';
}

// === Настройки аукциона ===
export interface AuctionWidgetConfig extends BaseWidgetConfig {
  // В будущем добавим: duration, startPrice и т.д.
}


// === Полные настройки приложения (для хранения и UI) ===
export interface AppSettings {
  music: MusicWidgetConfig;
  chat: ChatWidgetConfig;
  auction: AuctionWidgetConfig;
}

export type StoreSchema = {
  settings: AppSettings;
}

// === Для частичных обновлений (удобно для форм) ===
export type PartialSettings = Partial<AppSettings>;
export type MusicSettings = Partial<MusicWidgetConfig>;


type ChatSources = 'twitch' | 'youtube' | 'vk' | 'unknown';

// === Тип сообщения чата ===
export interface ChatMessage {
  id: string;
  username: string;
  color: string;
  text: string;
  badges: Badges;
  timestamp: number;
  source: ChatSources;
  emotes: Record<string, string[]>;
}

interface SourceConfig {
  enabled: boolean;
  channel: string;
  token: string;
}

// === Настройки чата (для UI) ===
export interface ChatWidgetConfig extends BaseWidgetConfig {
    sources: Record<ChatSources, SourceConfig>;
    appearance: {
      font: FontSettings;
      theme: keyof typeof THEME_PRESETS;
      bgTransparency: number;
      showBadges: boolean;
      maxMessages: number;
    }
}