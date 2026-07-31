import React from 'react';
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


export const SettingsPanel: React.FC = () => {
  const { activeCategory } = useDashboardStore();

  const renderSettings = () => {
    switch (activeCategory) {
      case 'music':
        return <MusicSettings />;
      case 'chat':
        return <ChatSettings />;
      case 'auction':
        return <PlaceholderSettings title="Аукцион" />;
      case 'about':
        return <About/>;
      default:
        return (
          <div className="text-gray-300">
            <h3 className="text-lg font-semibold mb-4">Общие настройки приложения</h3>
            <div className="flex items-center justify-start mt-4 space-x-3">
              <input
                type="checkbox"
                className="w-5 h-5 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-gray-200">Запускать вместе с системой</label>

            </div>
            <div className="flex items-center justify-start mt-4 space-x-3">
              <input
                type="checkbox"
                className="w-5 h-5 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-gray-200">Сворачивать вместо закрытия</label>

            </div>

          </div>
        );
    }
  };

  return (
    <main className="flex-1 bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
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