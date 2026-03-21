export type WidgetCategory = 'music' | 'chat' | 'auction' | 'general' | 'about';

export interface WidgetSettings {
    music: {
        enabled: boolean;
        showCover: boolean;
        showProgress?: boolean;
        theme: 'dynamic' | 'light' | 'dark' | 'transparent';
        fontSize: number;
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
        integrations: {
            yandexMusic: boolean;
            vkMusic: boolean;
        };
    };
    chat: {
        enabled: boolean;
    };
    auction: {
        enabled: boolean;
    };
}

export interface DashboardState {
    activeCategory: WidgetCategory;
    settings: WidgetSettings;
    setActiveCategory: (category: WidgetCategory) => void;
    updateSettings: <K extends keyof WidgetSettings> (
        category: K,
        updates: Partial<WidgetSettings[K]>
    ) => void;
}