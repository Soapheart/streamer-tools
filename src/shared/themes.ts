export interface ThemePreset {
  id: string;
  name: string;
  colors: {
    background: string;      // hex, hsl, rgb
    text: string;            // цвет текста
    textSecondary: string;   // цвет вторичного текста (исполнитель)
    accent: string;          // акцентный цвет (прогресс-бар, иконки)
  };
  fonts: {
    family: string;
    weight: string;
  };
  effects: {
    shadow: boolean;
    borderRadius: number;    // в пикселях
  };
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  dynamic: {
    id: 'dynamic',
    name: 'Динамическая (из обложки)',
    colors: {
      background: 'hsl(0, 0%, 10%)',
      text: '#ffffff',
      textSecondary: '#cccccc',
      accent: '#1db954',
    },
    fonts: {
      family: 'Inter, sans-serif',
      weight: '600',
    },
    effects: {
      shadow: true,
      borderRadius: 12,
    },
  },
  dark: {
    id: 'dark',
    name: 'Тёмная',
    colors: {
      background: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#a0a0a0',
      accent: '#bb86fc',
    },
    fonts: {
      family: 'Inter, sans-serif',
      weight: '600',
    },
    effects: {
      shadow: true,
      borderRadius: 12,
    },
  },
  light: {
    id: 'light',
    name: 'Светлая',
    colors: {
      background: '#f5f5f5',
      text: '#1a1a1a',
      textSecondary: '#666666',
      accent: '#6200ee',
    },
    fonts: {
      family: 'Inter, sans-serif',
      weight: '600',
    },
    effects: {
      shadow: true,
      borderRadius: 12,
    },
  },
  neon: {
    id: 'neon',
    name: 'Неон',
    colors: {
      background: '#0a0a0a',
      text: '#00ffff',
      textSecondary: '#ff00ff',
      accent: '#ffff00',
    },
    fonts: {
      family: 'Orbitron, sans-serif',
      weight: '700',
    },
    effects: {
      shadow: true,
      borderRadius: 4,
    },
  },
};