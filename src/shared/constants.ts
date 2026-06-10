import { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
    music: {
        enabled: true,
        showCover: true,
        theme: 'dynamic',
        bgTransparency: 100,
        colors: {
            background: 'hsla(79, 100%, 60%, 1)',
            text: '#fff',
            textSecondary: '#fff',
            accent: '#fff',
        },
        fonts: {
            size: 24,
            family: 'Inter, sans-serif',
            weight: '600'
        },
        effects: {
            shadow: "0px 5px 10px 2px rgba(34, 60, 80, 0.2)",
            borderRadius: 12
        },
        fontSize: 24,
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