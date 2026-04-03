import { THEME_PRESETS } from "./themes";

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
    background?: string,
    text?: string,
    textSecondary?: string,
    accent?: string,
  },
  fonts: {
    size?: number,
    family?: string,
    weight?: string
  },
  effects: {
    shadow: string,
    borderRadius: string,
  },
  fontSize: number;
  widgetHeight: number;
  widgetWidth: number;
  integrations: {
    yandexMusic: boolean;
    vkMusic: boolean;
  },
}

export interface MusicTrack {
    title: string;
    artist: string;
    cover?: string;
    background_color?: string;
    platform?: "vkMusic" | "yandexMusic";
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