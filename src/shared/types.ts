import { THEME_PRESETS } from "./themes";

// === Типы сообщений для WebSocket ===
export enum WSMessageType {
  TRACK_UPDATE = 'TRACK_UPDATE',
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  PING = 'PING',
  PONG = 'PONG'
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

// === Настройки музыки ===
// В будущем можно удалить fontSize и bgTransparency
export interface MusicWidgetConfig extends BaseWidgetConfig {
  showCover: boolean;
  theme: keyof typeof THEME_PRESETS;
  bgTransparency: number;
  colors: {
    background: string,
    text?: string,
    textSecondary?: string,
    accent?: string,
  };
  fonts: {
    size?: number,
    family?: string,
    weight?: string
  };
  effects: {
    shadow: string,
    borderRadius: number,
  };
  fontSize: number;
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

// === Настройки чата ===
export interface ChatWidgetConfig extends BaseWidgetConfig {
  // В будущем добавим: showAvatars, fontSize, colors и т.д.
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