import React, { useState } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ExternalLinkButton } from '../ExternalLinkButton';
import { ChatWidgetConfig, ChatSource } from '../../../shared/types';
import { WIDGET_URLS } from '../../../shared/widgetUrls';
import { THEME_PRESETS, ThemePreset } from '../../../shared/themes';
import { Tabs } from '../Tabs';

type ChatTab = 'connection' | 'appearance' | 'filters';

export const ChatSettings: React.FC = () => {
  const { settings, updateSettings } = useDashboardStore();
  const chatSettings = settings.chat as ChatWidgetConfig;
  const [activeTab, setActiveTab] = useState<ChatTab>('connection');

  // Локальные состояния для текстовых полей (чтобы курсор не прыгал при вводе)
  const [stopWordsRaw, setStopWordsRaw] = useState(chatSettings.filters.stopWords.join(', '));
  const [ignoredUsersRaw, setIgnoredUsersRaw] = useState(chatSettings.filters.ignoredUsers.join(', '));

  const tabs = [
    { id: 'connection', label: 'Подключение', icon: <span>🔌</span> },
    { id: 'appearance', label: 'Внешний вид', icon: <span>🎨</span> },
    { id: 'filters', label: 'Управление', icon: <span>⚙️</span> }
  ];

  const handleSourceUpdate = (sourceIndex: number, field: keyof ChatSource, value: string | boolean) => {
    const updatedSources = [...chatSettings.sources.twitch];
    updatedSources[sourceIndex] = {
      ...updatedSources[sourceIndex],
      [field]: value
    };
    updateSettings('chat', {
      sources: {
        ...chatSettings.sources,
        twitch: updatedSources
      }
    });
  };

  const handleAppearanceUpdate = (field: keyof ChatWidgetConfig['appearance'], value: any) => {
    updateSettings('chat', {
      appearance: {
        ...chatSettings.appearance,
        [field]: value
      }
    });
  };

  const handleFiltersUpdate = (field: keyof ChatWidgetConfig['filters'], value: any) => {
    updateSettings('chat', {
      filters: {
        ...chatSettings.filters,
        [field]: value
      }
    });
  };

  const handleArrayInputBlur = (field: 'stopWords' | 'ignoredUsers', rawValue: string) => {
    const array = rawValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
    handleFiltersUpdate(field, array);
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
            url={WIDGET_URLS?.chat || 'http://127.0.0.1:3000/widgets/chat/index.html'}
            label="Скопировать ссылку на виджет"
            icon={<span>💬</span>}
            action="copy"
            variant="secondary"
          />
        </div>
      </div>

      {/* Вкладки */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as ChatTab)} />

      {/* ================= ВКЛАДКА: ПОДКЛЮЧЕНИЕ ================= */}
      {activeTab === 'connection' && (
        <div className="space-y-6">
          {(Array.isArray(chatSettings.sources?.twitch) ? chatSettings.sources.twitch : []).map((source, index) => (
            <div key={source.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <label className="text-gray-200 font-semibold">Twitch канал #{index + 1}</label>
              </div>
              
              <div className="mb-4">
                <label className="text-gray-300 block mb-1.5 text-sm font-medium">Название канала (без #)</label>
                <input
                  type="text"
                  value={source.channel}
                  onChange={(e) => handleSourceUpdate(index, 'channel', e.target.value)}
                  placeholder="например: soapheart"
                  className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 transition-all"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1.5 text-sm font-medium">OAuth Токен (необязательно)</label>
                <input
                  type="password"
                  value={source.token}
                  onChange={(e) => handleSourceUpdate(index, 'token', e.target.value)}
                  placeholder="oauth:xxxxxxxxxxxxxxxx"
                  className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Нужен для получения цветных никнеймов и значков ролей. Без токена виджет работает в анонимном режиме.
                </p>
              </div>
            </div>
          ))}

          <button
            disabled
            className="w-full bg-gray-700/20 text-gray-500 rounded-lg p-3 border-2 border-dashed border-gray-600 cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            title="Скоро: поддержка нескольких каналов на одной платформе"
          >
            <span>+</span> Добавить канал Twitch
          </button>

          <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
            <label className="text-gray-200 font-medium block mb-3">Добавить платформу</label>
            <div className="flex gap-3 flex-wrap">
              <button disabled className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg cursor-not-allowed">
                <span>🟣</span> Twitch (Активно)
              </button>
              <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-500 border border-gray-600 rounded-lg cursor-not-allowed" title="В разработке">
                <span>🔴</span> YouTube
              </button>
              <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-500 border border-gray-600 rounded-lg cursor-not-allowed" title="В разработке">
                <span>🔵</span> VK Play
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ВКЛАДКА: ВНЕШНИЙ ВИД ================= */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div>
            <label className="text-gray-200 block mb-2 font-medium">Тема оформления</label>
            <select
              value={chatSettings.appearance.theme}
              onChange={(e) => handleAppearanceUpdate('theme', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {Object.values(THEME_PRESETS).map((preset: ThemePreset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-200 block mb-2 font-medium">Анимация появления сообщений</label>
            <select
              value={chatSettings.appearance.animation || 'slide-up'}
              onChange={(e) => handleAppearanceUpdate('animation', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="none">Нет (мгновенно)</option>
              <option value="fade">Плавное появление (Fade)</option>
              <option value="slide-up">Выезд снизу (Slide Up)</option>
              <option value="slide-right">Выезд слева (Slide Right)</option>
              <option value="pop">Появление с увеличением (Pop)</option>
              <option value="flip">3D-переворот (Flip) ⚠️</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              3D-эффект может снизить производительность на слабых машинах или при прозрачном фоне в OBS.
            </p>
          </div>

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
              className="w-full accent-purple-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">0% - полностью прозрачный, 100% - непрозрачный</p>
          </div>

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
              className="w-full accent-purple-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="colorizeNicknames"
                checked={chatSettings.appearance.colorizeNicknames}
                onChange={(e) => handleAppearanceUpdate('colorizeNicknames', e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="colorizeNicknames" className="text-gray-200 cursor-pointer select-none">
                Раскрашивать никнеймы в цвета Twitch
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="showBadges"
                checked={chatSettings.appearance.showBadges}
                onChange={(e) => handleAppearanceUpdate('showBadges', e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="showBadges" className="text-gray-200 cursor-pointer select-none">
                Показывать значки ролей (Moderator, Subscriber, VIP)
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="showTimestamps"
                checked={chatSettings.appearance.showTimestamps}
                onChange={(e) => handleAppearanceUpdate('showTimestamps', e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="showTimestamps" className="text-gray-200 cursor-pointer select-none">
                Показывать время сообщения
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ================= ВКЛАДКА: УПРАВЛЕНИЕ И ФИЛЬТРЫ ================= */}
      {activeTab === 'filters' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="hideBotMessages"
                checked={chatSettings.filters.hideBotMessages}
                onChange={(e) => handleFiltersUpdate('hideBotMessages', e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="hideBotMessages" className="text-gray-200 cursor-pointer select-none">
                Скрывать сообщения от известных ботов (Nightbot, StreamElements, Moobot)
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="hideCommands"
                checked={chatSettings.filters.hideCommands}
                onChange={(e) => handleFiltersUpdate('hideCommands', e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="hideCommands" className="text-gray-200 cursor-pointer select-none">
                Скрывать сообщения, начинающиеся с <code className="bg-gray-700 px-1 rounded text-purple-300">!</code> (команды)
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="hideBannedUsers"
                checked={chatSettings.filters.hideBannedUsers}
                onChange={(e) => handleFiltersUpdate('hideBannedUsers', e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="hideBannedUsers" className="text-gray-200 cursor-pointer select-none">
                Скрывать сообщения забаненных/таймаутнутых пользователей
              </label>
            </div>
          </div>

          <div>
            <label className="text-gray-200 block mb-2 font-medium">Стоп-слова</label>
            <textarea
              value={stopWordsRaw}
              onChange={(e) => setStopWordsRaw(e.target.value)}
              onBlur={(e) => handleArrayInputBlur('stopWords', e.target.value)}
              placeholder="через запятую: спам, реклама, ссылка"
              className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 min-h-[80px] resize-y"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Сообщения, содержащие эти слова, будут скрыты. Сохраняется при потере фокуса (клик вне поля).
            </p>
          </div>

          <div>
            <label className="text-gray-200 block mb-2 font-medium">Черный список пользователей</label>
            <textarea
              value={ignoredUsersRaw}
              onChange={(e) => setIgnoredUsersRaw(e.target.value)}
              onBlur={(e) => handleArrayInputBlur('ignoredUsers', e.target.value)}
              placeholder="через запятую: user1, user2, spammer"
              className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 min-h-[80px] resize-y"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Сообщения от этих пользователей будут скрыты. Сохраняется при потере фокуса.
            </p>
          </div>

          <div>
            <label className="text-gray-200 block mb-2 font-medium">
              Лимит сообщений на экране: <span className="text-purple-400">{chatSettings.filters.maxMessages}</span>
            </label>
            <select
              value={chatSettings.filters.maxMessages}
              onChange={(e) => handleFiltersUpdate('maxMessages', Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={50}>50 сообщений</option>
              <option value={100}>100 сообщений</option>
              <option value={200}>200 сообщений</option>
              <option value={500}>500 сообщений</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Большие значения могут снизить производительность браузера в OBS при высокой активности чата.
            </p>
          </div>

          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 text-sm text-gray-300">
            <p className="flex items-start gap-2">
              <span className="text-purple-400 text-lg">💡</span>
              <span>
                <strong>Совет:</strong> На активных каналах рекомендуется включать скрытие команд и ботов, 
                чтобы не засорять эфир служебными сообщениями и сэкономить ресурсы ПК.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Подсказка про размеры в OBS (видна всегда) */}
      <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4 text-sm text-gray-400 mt-8">
        <p className="flex items-start gap-2">
          <span className="text-yellow-500 text-lg">💡</span>
          <span>
            <strong>Размер виджета</strong> настраивается непосредственно в OBS: 
            кликните правой кнопкой по источнику → «Трансформировать» 
            или потяните за красные углы в предпросмотре. Рекомендуемая ширина: 400-600px.
          </span>
        </p>
      </div>
    </div>
  );
};