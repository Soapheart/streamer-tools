import React from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ExternalLinkButton } from '../ExternalLinkButton';
import { ChatWidgetConfig } from '../../../shared/types';
import { WIDGET_URLS } from '../../../shared/widgetUrls';
import { THEME_PRESETS, ThemePreset } from '../../../shared/themes';

export const ChatSettings: React.FC = () => {
  const { settings, updateSettings } = useDashboardStore();
  const chatSettings = settings.chat as ChatWidgetConfig;
  
  const handleChatSourceUpdate = (sourceName: keyof ChatWidgetConfig['sources'], field: 'channel' | 'token', value: string | boolean) => {
    const currentSources: ChatWidgetConfig['sources'] = chatSettings.sources || {};
    const currentSource = currentSources[sourceName] || { enabled: true, channel: '', token: '' };
    updateSettings('chat', {
      sources: {
        ...currentSources,
        [sourceName]: {
          ...currentSource,
          [field]: value,
        },
      },
    });
  };

  const handleAppearanceUpdate = (field: keyof ChatWidgetConfig['appearance'], value: any) => {
    updateSettings('chat', {
      appearance: {
        ...chatSettings.appearance,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Блок с описанием и ссылкой на виджет */}
      <div className="text-gray-300">
        <p>
          Для работы виджета добавьте источник «Браузер» в OBS и вставьте ссылку ниже.
        </p>
        <div className="my-4 flex flex-wrap gap-3">
          <ExternalLinkButton
            // Если WIDGET_URLS.chat еще нет, замени на 'http://127.0.0.1:3000/widgets/chat/index.html'
            url={WIDGET_URLS?.chat || 'http://127.0.0.1:3000/widgets/chat/index.html'}
            label="Скопировать ссылку на виджет"
            icon={<span>💬</span>}
            action="copy"
            variant="secondary"
          />
        </div>
      </div>

      {/* Настройки подключения Twitch */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <label className="text-gray-200 font-medium block mb-3">Подключение Twitch</label>
        
        <div className="mb-4">
          <label className="text-gray-300 block mb-1 text-sm">Название канала (без #)</label>
          <input
            type="text"
            value={chatSettings.sources?.twitch?.channel || ''}
            onChange={(e) => handleChatSourceUpdate('twitch', 'channel', e.target.value)}
            placeholder="например: soapheart"
            className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
          />
        </div>

        <div>
          <label className="text-gray-300 block mb-1 text-sm">OAuth Токен (необязательно)</label>
          <input
            type="password"
            value={chatSettings.sources?.twitch?.token || ''}
            onChange={(e) => handleChatSourceUpdate('twitch', 'token', e.target.value)}
            placeholder="oauth:xxxxxxxxxxxxxxxx"
            className="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Нужен только для чтения чатов с включенной защитой от ботов. Для обычных стримов можно оставить пустым (анонимный режим).
          </p>
        </div>
      </div>

      {/* Тема оформления */}
      <div>
        <label className="text-gray-200 block mb-2 font-medium">Тема оформления</label>
        <select
          value={chatSettings.appearance.theme}
          onChange={(e) => handleAppearanceUpdate('theme', e.target.value as keyof typeof THEME_PRESETS)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {Object.values(THEME_PRESETS).map((preset: ThemePreset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Прозрачность фона */}
      <div>
        <label className="text-gray-200 block mb-2 font-medium">
          Прозрачность фона: <span className="text-purple-400">{chatSettings.appearance.bgTransparency}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={chatSettings.appearance.bgTransparency}
          onChange={(e) => handleAppearanceUpdate('bgTransparency', Number(e.target.value))}
          className="w-full accent-purple-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          0% - полностью прозрачный, 100% - непрозрачный фон
        </p>
      </div>

      {/* Размер шрифта */}
      <div>
        <label className="text-gray-200 block mb-2 font-medium">
          Размер шрифта: <span className="text-purple-400">{chatSettings.appearance.font?.size || 16}px</span>
        </label>
        <input
          type="range"
          min="12"
          max="36"
          value={chatSettings.appearance.font?.size || 16}
          onChange={(e) => handleAppearanceUpdate('font', { 
            ...chatSettings.appearance.font, 
            size: Number(e.target.value) 
          })}
          className="w-full accent-purple-600"
        />
      </div>

      {/* Показывать бейджи */}
      {/* <div className="flex items-center justify-start space-x-3">
        <input
          type="checkbox"
          id="showBadges"
          checked={chatSettings.appearance.showBadges}
          onChange={(e) => handleAppearanceUpdate('showBadges', e.target.checked)}
          className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600"
        />
        <label htmlFor="showBadges" className="text-gray-200 cursor-pointer">
          Показывать значки (Moderator, Subscriber, VIP, Prime)
        </label>
      </div> */}

      {/* Подсказка про размеры в OBS */}
      <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-400">
        <p className="flex items-start gap-2">
          <span>💡</span>
          <span>
            <strong>Размер виджета</strong> настраивается в OBS: 
            кликните правой кнопкой по источнику → «Трансформировать» 
            или потяните за углы в предпросмотре. Рекомендуемая ширина: 400-600px.
          </span>
        </p>
      </div>
    </div>
  );
};