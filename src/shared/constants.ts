import { AppSettings } from './types';

export const WIDGET_SERVER_PORT = 3000;
export const WS_MUSIC_PATH = '/ws/music'

export const DEFAULT_SETTINGS: AppSettings = {
    music: {
        enabled: true,
        showCover: true,
        theme: 'dynamic',
        bgTransparency: 100,
        font: {
            size: 24,
            family: 'Inter, sans-serif',
            weight: '600'
        },
        effects: {
            shadow: "0px 5px 10px 2px rgba(34, 60, 80, 0.2)",
            borderRadius: 12
        },
        widgetHeight: 200,
        widgetWidth: 400,
        integrations: {
            yandexMusic: true,
            vkMusic: false,
        },
        captureMethod: 'auto',
        allowVideoContent: false,
        hideOnPause: false,
        marqueeEnabled: false,
        trackChangeAnimation: 'fade',
        animationDuration: 300,
    },
    chat: { 
        enabled: true,
        sources: {
            twitch: [{
                id:  'default-twitch-1',
                enabled: true,
                channel: '',
                token: ''
            }],
            youtube: [],
            vk: [],
        },
        appearance: {
            font: {
                size: 18,
                family: 'Inter, sans-serif',
                weight: '500'
            },
            theme: 'dark',
            animation: 'slide-up',
            bgTransparency: 80,
            showBadges: true,
            colorizeNicknames: true,
            showTimestamps: false,
        },
        filters: {
            hideBotMessages: false,
            hideCommands: false,
            hideBannedUsers: false,
            stopWords: [],
            ignoredUsers: [],
            maxMessages: 50,
        },
    },
    auction: { 
        enabled: true, 
    },
    system: {
        startWithSystem: false,
        minimizeOnClose: false,
    },
    twitch: {
        clientId: '',
        clientSecret: '',
        broadcasterId: '',
        broadcasterName: '',
        token: undefined,
    },
};


export const TWITCH_CLIENT_ID = 'zth1mmdhaho3xua7ua6wlie3bl4sk2';
export const TWITCH_SCOPES = [
  'chat:read',                      // чтение чата (IRC-вариант)
  'user:read:chat',                 // чтение чата через EventSub
  'channel:read:redemptions',       // слушать активации наград
  'channel:manage:redemptions',     // создавать/удалять награды
  'channel:read:subscriptions',     // на будущее: саб-бонусы в лотерее
  'moderator:read:followers',       // на будущее
  // 'chat:edit' / 'user:write:chat' // чат-бот
];
export const TWURPLE_INTENTS = ['chat', 'channel'];