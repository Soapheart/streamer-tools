// src/shared/types.ts

// === Базовые настройки виджета (общие для всех) ===
export interface BaseWidgetConfig {
  enabled: boolean;
}

// === Настройки музыки ===
export interface MusicWidgetConfig extends BaseWidgetConfig {
  showCover: boolean;
  showProgress: boolean;
  theme: 'dynamic' | 'dark' | 'light' | 'transparent';
  bgTransparency: number;
  fontSize: number;
  widgetHeight: number;
  widgetWidth: number;
  integrations: {
    yandexMusic: boolean;
    vkMusic: boolean;
  };
}

export interface MusicTrack {
    title: string;
    artist: string;
    cover?: string;
    background_color?: string;
    platform?: "vk" | "yandex";
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

// === Для частичных обновлений (удобно для форм) ===
export type PartialSettings = Partial<AppSettings>;
export type MusicSettings = Partial<MusicWidgetConfig>;