import { AppSettings, PartialSettings } from "../../shared/types";

export type AppCategory = 'music' | 'chat' | 'auction' | 'general' | 'about';

export interface DashboardState {
    activeCategory: AppCategory;
    settings: AppSettings;
    setActiveCategory: (category: AppCategory) => void;
    updateSettings: <K extends keyof AppSettings> (
        category: K,
        updates: Partial<AppSettings[K]>
    ) => void;
    loadSettings: (settings: AppSettings) => void;
    // Внутренние методы для синхронизации с Electron Store
    _saveToStorage: (settings: PartialSettings) => void;
    _loadFromStorage: () => Promise<void>;
    _subscribeToStorage: () => () => void; // Возвращает функцию отписки
}