import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MusicSettings } from './MusicSettings';
import { About } from './About';
import { ChatSettings } from './ChatSettings';

// Заглушки для будущих категорий
const PlaceholderSettings: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-gray-400 text-center py-10">
    <p className="text-2xl mb-2">🚧</p>
    <p>Настройки "{title}" в разработке</p>
  </div>
);

export function StartWithSystemToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ранний выход, если API недоступен (например, в браузере без Electron)
    if (!window.electronAPI?.system) {
      setLoading(false);
      return;
    }

    window.electronAPI.system
      .getStartWithSystem()
      .then((value) => {
        setEnabled(value);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = async (nextEnabled: boolean) => {
    setEnabled(nextEnabled);

    if (!window.electronAPI?.system) return;

    try {
      await window.electronAPI.system.setStartWithSystem(nextEnabled);
    } catch (error) {
      console.error('Failed to update autostart setting:', error);
      setEnabled(!nextEnabled);
    }
  };

  return (
    <div className="flex items-center justify-start space-x-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading}
          onChange={(e) => handleChange(e.target.checked)}
          className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
        />
        <span className="text-gray-200">Запускать вместе с системой</span>
      </label>
    </div>
  );
}

export const SettingsPanel: React.FC = () => {
  // ✅ Деструктурируем settings и updateSettings
  const { activeCategory, settings, updateSettings } = useDashboardStore();

  const renderSettings = () => {
    switch (activeCategory) {
      case 'music':
        return <MusicSettings />;
      case 'chat':
        return <ChatSettings />;
      case 'auction':
        return <PlaceholderSettings title="Аукцион" />;
      case 'about':
        return <About />;
      default:
        return (
          <div className="text-gray-300">
            <h3 className="text-lg font-semibold mb-4">Общие настройки приложения</h3>

            <div className="flex flex-col gap-4 mt-4">
              <StartWithSystemToggle />

              <div className="flex items-center space-x-3">
                <input
                  id="minimize-on-close"
                  type="checkbox"
                  checked={settings.system?.minimizeOnClose ?? false}
                  onChange={(e) =>
                    updateSettings('system', { minimizeOnClose: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                />
                <label htmlFor="minimize-on-close" className="text-gray-200 cursor-pointer">
                  Сворачивать вместо закрытия
                </label>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="flex-1 bg-gray-900 p-6 overflow-y-auto">
      <div className="mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 capitalize">
          {activeCategory}
        </h1>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          {renderSettings()}
        </div>
      </div>
    </main>
  );
};