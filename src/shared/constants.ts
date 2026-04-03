import { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
    music: {
        enabled: true,
        showCover: true,
        theme: 'dynamic',
        bgTransparency: 100,
        fontSize: 24,
        widgetHeight: 200,
        widgetWidth: 400,
        integrations: {
            yandexMusic: true,
            vkMusic: false,
        },
    },
    chat: { 
        enabled: true 
    },
    auction: { 
        enabled: true 
    }
};