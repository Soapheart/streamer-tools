import React, {useEffect, useState} from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ExternalLinkButton } from '../ExternalLinkButton';
import { MusicWidgetConfig, MusicCaptureMethod } from '../../../shared/types';
import { WIDGET_URLS } from '../../../shared/widgetUrls';
import { THEME_PRESETS, ThemePreset } from '../../../shared/themes';

type ThemeValue = MusicWidgetConfig['theme'];
type IntegrationKey = keyof MusicWidgetConfig['integrations'];

interface SystemInfo {
  platform: string;
  supportedMethods: string[];
}

interface ExtensionStatus {
  connected: boolean;
  lastSeen: number;
}


export const MusicSettings: React.FC = () => {
  const { settings, updateSettings } = useDashboardStore();
  const music = settings.music;

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    connected: false, 
    lastSeen: 0
  });

  useEffect(() => {
    // Получаем информацию о системе при загрузке компонента
    if(window.electronAPI?.getSystemInfo){
      window.electronAPI.getSystemInfo().then(setSystemInfo)
    }
  }, []);

  //проверка статуса расширения
  useEffect(() => {
    const checkExtensionStatus = async () => {
      if(window.electronAPI?.getExtensionStatus){
        const status = await window.electronAPI.getExtensionStatus();
        setExtensionStatus(status);
      }
    }
    
  checkExtensionStatus();
    const interval = setInterval(checkExtensionStatus, 3000); // Проверять каждые 3 секунды
  }, []);


  const handleIntegrationChange = (selected: IntegrationKey) => {
    updateSettings('music', {
      integrations: {
        ...music.integrations,
        [selected]: !music.integrations[selected]
      }
    });
  };

  const handleCaptureMethodChange = (method: MusicCaptureMethod) => {
    updateSettings('music', { captureMethod: method });
  }

  const showExtensionSettings = music.captureMethod === 'extension' || music.captureMethod === 'auto';
  const showSystemSettings = music.captureMethod === 'winrt' || music.captureMethod === 'mpris' || music.captureMethod === 'auto';


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


      {/* Выбор метода захвата */}
      <div>
        <label className="text-gray-200 block mb-2 font-medium">Источник данных</label>
        <select
          value={music.captureMethod}
          onChange={(e) => handleCaptureMethodChange(e.target.value as MusicCaptureMethod)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500"
        >
          <option value="auto">🔄 Автоматически (Рекомендуется)</option>
          <option value="extension">🌐 Только браузер (Расширение)</option>
          {systemInfo?.supportedMethods.includes('winrt') && (
            <option value="winrt">💻 Системный (Windows Media)</option>
          )}
          {systemInfo?.supportedMethods.includes('mpris') && (
            <option value="mpris">🐧 Системный (Linux MPRIS)</option>
          )}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {music.captureMethod === 'auto' && 'Будут использоваться все доступные источники'}
          {music.captureMethod === 'extension' && 'Данные будут получаться только из браузерного расширения'}
          {music.captureMethod === 'winrt' && 'Данные будут получаться только из системного API Windows'}
          {music.captureMethod === 'mpris' && 'Данные будут получаться только из системного API Linux'}
        </p>
      </div>

      {/* Статус расширения */}
      {showExtensionSettings && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-gray-200 font-medium">Настройки расширения</label>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${extensionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-400">
                {extensionStatus.connected ? 'Подключено' : 'Не подключено'}
              </span>
            </div>
          </div>
          
          {!extensionStatus.connected && (
            <p className="text-xs text-yellow-400 mb-3">
              ⚠️ Расширение не подключено. Установите его и откройте браузер.
            </p>
          )}

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={music.integrations.yandexMusic}
                onChange={() => handleIntegrationChange('yandexMusic')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-200">Yandex Music</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={music.integrations.vkMusic}
                onChange={() => handleIntegrationChange('vkMusic')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-200">VK Music</span>
            </label>
          </div>
        </div>
      )}

      {/* Настройки системного захвата */}
      {showSystemSettings && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <label className="text-gray-200 font-medium block mb-3">
            Настройки системного захвата
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={music.allowVideoContent}
              onChange={(e) => updateSettings('music', { allowVideoContent: e.target.checked })}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-200">Показывать информацию о видео-контенте (YouTube, фильмы)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Если выключено, виджет будет показывать информацию только о музыке. Видео (YouTube, фильмы) будут игнорироваться (по возможности).
          </p>
        </div>
      )}

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