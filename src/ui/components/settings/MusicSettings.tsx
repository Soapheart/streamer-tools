import React from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ExternalLinkButton } from '../ExternalLinkButton';
import { MusicWidgetConfig } from '../../../shared/types';
import { WIDGET_URLS } from '../../../shared/widgetUrls';
import { THEME_PRESETS, ThemePreset } from '../../../shared/themes';

type ThemeValue = MusicWidgetConfig['theme'];
type IntegrationKey = keyof MusicWidgetConfig['integrations'];

export const MusicSettings: React.FC = () => {
  const { settings, updateSettings } = useDashboardStore();
  const music = settings.music;

  const handleIntegrationChange = (selected: IntegrationKey) => {
    updateSettings('music', {
      integrations: {
        ...music.integrations,
        [selected]: !music.integrations[selected]
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Блок с расширением и ссылкой на виджет */}
      <div className="text-gray-300">
        <p>
          Для работы виджета установите расширение и настройте источник в OBS.
        </p>
        <div className="my-4 flex flex-wrap gap-3">
          <ExternalLinkButton
            url="https://chromewebstore.google.com/detail/your-extension-id"
            label="Установить расширение"
            icon={<span>🧩</span>}
            action="open"
            variant="primary"
          />
          <ExternalLinkButton
            url={WIDGET_URLS.music}
            label="Скопировать ссылку на виджет"
            icon={<span>🎷</span>}
            action="copy"
            variant="secondary"
          />
        </div>
      </div>

      {/* Выбор интеграции */}
      <div className="flex flex-col items-start justify-start mt-4 space-y-2">
        <label className="text-gray-200 font-medium">Источники музыки</label>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="musicIntegration"
              checked={music.integrations.yandexMusic}
              onChange={() => handleIntegrationChange('yandexMusic')}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span>Yandex Music</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="musicIntegration"
              checked={music.integrations.vkMusic}
              onChange={() => handleIntegrationChange('vkMusic')}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span>VK Music</span>
          </label>
        </div>
      </div>

      {/* Показывать обложку */}
      <div className="flex items-center justify-start space-x-3">
        <input
          type="checkbox"
          id="showCover"
          checked={music.showCover}
          onChange={(e) => updateSettings('music', { showCover: e.target.checked })}
          className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="showCover" className="text-gray-200 cursor-pointer">
          Показывать обложку (если доступна)
        </label>
      </div>

      {/* Тема оформления */}
      <div>
        <label className="text-gray-200 block mb-2 font-medium">Тема</label>
        <select
          value={music.theme}
          onChange={(e) => updateSettings('music', { theme: e.target.value as keyof typeof THEME_PRESETS })}
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
          Прозрачность фона: <span className="text-purple-400">{music.bgTransparency}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={music.bgTransparency}
          onChange={(e) => updateSettings('music', { bgTransparency: Number(e.target.value) })}
          className="w-full accent-purple-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          0% - прозрачный, 100% - непрозрачный фон
        </p>
      </div>

      {/* Размер шрифта */}
      <div>
        <label className="text-gray-200 block mb-2 font-medium">
          Размер шрифта: <span className="text-purple-400">{music.fontSize}px</span>
        </label>
        <input
          type="range"
          min="16"
          max="36"
          value={music.fontSize}
          onChange={(e) => updateSettings('music', { fontSize: Number(e.target.value) })}
          className="w-full accent-purple-600"
        />
      </div>

      {/* Подсказка про размеры в OBS */}
      <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-400">
        <p className="flex items-start gap-2">
          <span>💡</span>
          <span>
            <strong>Размер виджета</strong> настраивается в OBS: 
            кликните правой кнопкой по источнику → «Трансформировать» 
            или потяните за углы в предпросмотре.
          </span>
        </p>
      </div>
    </div>
  );
};