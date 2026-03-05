import React from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ExternalLinkButton } from '../ExternalLinkButton';
import { MusicWidgetConfig } from '../../../shared/types';

type ThemeValue = MusicWidgetConfig['theme'];
type PositionValue = MusicWidgetConfig['position'];
type IntegrationKey = keyof MusicWidgetConfig['integrations'];


export const MusicSettings: React.FC = () => {
  const { settings, updateSettings } = useDashboardStore();
  const music = settings.music;

    // Обработчик для радио-кнопок интеграций
  const handleIntegrationChange = (selected: IntegrationKey) => {
    updateSettings('music', {
      integrations: {
        yandexMusic: selected === 'yandexMusic',
        vkMusic: selected === 'vkMusic',
      },
    });
  };

  return (
    <div className="space-y-6">

      <div className="text-gray-300">
        <p>Для того чтобы виджет получал информацию о текущей песне, убедитесь что вы установили браузерное расширение по ссылке ниже.</p>
        <div className="my-4 flex flex-wrap items-center gap-4">
          <ExternalLinkButton
            url="https://chromewebstore.google.com/detail/your-extension-id"
            label="Установить расширение"
            icon={<span>🧩</span>}
            variant="primary"
          />
          <ExternalLinkButton
            url="localhost:3000/test-extension"
            label="Скопировать ссылку на виджет"
            action='copy'
            icon={<span>🎷</span>}
            variant="secondary"
          />
        </div>
      </div>

      {/* Выбор интеграции (радио-кнопки) */}
      <div className="flex flex-col items-start justify-start mt-4 space-x-4">
        <label className="text-gray-200">Интеграция</label>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="musicIntegration"
              checked={music.integrations.yandexMusic}
              onChange={() => handleIntegrationChange('yandexMusic')}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span>Yandex Music</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="musicIntegration"
              checked={music.integrations.vkMusic}
              onChange={() => handleIntegrationChange('vkMusic')}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span>VK Music</span>
          </label>
        </div>
      </div>

      {/* <div className="flex items-center justify-start mt-4 space-x-3">
        <label className="text-gray-200">Включить виджет</label>
        <input
          type="checkbox"
          checked={music.enabled}
          onChange={(e) => updateSettings('music', { enabled: e.target.checked })}
          className="w-5 h-5 rounded"
        />
      </div> */}

      <div className="flex items-center justify-start mt-4 space-x-3">
        <input
          type="checkbox"
          checked={music.showCover}
          onChange={(e) => updateSettings('music', { showCover: e.target.checked })}
          className="w-5 h-5 rounded"
        />
        <label className="text-gray-200">Показывать обложку</label>
      </div>

      {/* <div className="flex items-center justify-start mt-4 space-x-3">
        <label className="text-gray-200">Показывать прогресс</label>
        <input
          type="checkbox"
          checked={music.showProgress}
          onChange={(e) => updateSettings('music', { showProgress: e.target.checked })}
          className="w-5 h-5 rounded"
        />
      </div> */}

      <div>
        <label className="text-gray-200 block mb-2">Тема</label>
        <select
          value={music.theme}
          onChange={(e) => updateSettings('music', { theme: e.target.value as ThemeValue })}
          className="w-full bg-gray-700 text-white rounded px-3 py-2"
        >
          <option value="dynamic">Динамическая (по обложке)</option>
          <option value="dark">Тёмная</option>
          <option value="light">Светлая</option>
          <option value="transparent">Прозрачная</option>
        </select>
      </div>

      <div>
        <label className="text-gray-200 block mb-2">
          Размер шрифта: {music.fontSize}px
        </label>
        <input
          type="range"
          min="10"
          max="24"
          value={music.fontSize}
          onChange={(e) => updateSettings('music', { fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-gray-200 block mb-2">Позиция в OBS</label>
        <select
          value={music.position}
          onChange={(e) => updateSettings('music', { position: e.target.value as PositionValue })}
          className="w-full bg-gray-700 text-white rounded px-3 py-2"
        >
          <option value="top-left">Верхний левый</option>
          <option value="top-right">Верхний правый</option>
          <option value="bottom-left">Нижний левый</option>
          <option value="bottom-right">Нижний правый</option>
        </select>
      </div>
    </div>
  );
};