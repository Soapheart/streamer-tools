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
    },
    chat: { 
        enabled: true 
    },
    auction: { 
        enabled: true 
    },
};