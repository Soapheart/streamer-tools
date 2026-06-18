import React from 'react';
import { ExternalLinkButton } from '../ExternalLinkButton';

// Версия приложения (можно брать из package.json)
const APP_VERSION = import.meta.env?.PACKAGE_VERSION || '0.0.1';

export const About: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Заголовок и версия */}
      <div className="text-center pb-6 border-b border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-2">🎮 Streamer Tools</h2>
        <p className="text-gray-400">
          Версия <span className="text-purple-400 font-mono">{APP_VERSION}</span>
        </p>
      </div>

      {/* Описание */}
      <div className="text-gray-300 space-y-3">
        <p>
          <strong>Streamer Tools</strong> — это набор виджетов для стримеров, 
          позволяющий отображать информацию о музыке, чате, аукционах и прочих штуках прямо в OBS.
        </p>
        <p>
          Приложение работает локально на Вашем компьютере и не передаёт данные 
          на внешние серверы (кроме запросов к официальным API сервисов).
        </p>
      </div>

      {/* Полезные ссылки */}
      <div className="bg-gray-700/50 rounded-xl p-5 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🔗</span> Полезные ссылки
        </h3>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <ExternalLinkButton
            url="https://github.com/Soapheart/streamer-tools"
            label="GitHub репозиторий"
            icon={<span>💻</span>}
            variant="secondary"
            size="sm"
          />
          <ExternalLinkButton
            url="https://github.com/Soapheart/streamer-tools/wiki"
            label="Документация (Wiki)"
            icon={<span>📚</span>}
            variant="secondary"
            size="sm"
          />
          <ExternalLinkButton
            url="https://github.com/Soapheart/streamer-tools/issues"
            label="Сообщить об ошибке"
            icon={<span>🐛</span>}
            variant="secondary"
            size="sm"
          />
          <ExternalLinkButton
            url="https://discord.gg/your-invite"
            label="Наш Discord"
            icon={<span>💬</span>}
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Системная информация (опционально) */}
      <div className="bg-gray-700/30 rounded-lg p-4 text-sm text-gray-400 font-mono">
        <p>Platform: {navigator.platform}</p>
        <p>User Agent: {navigator.userAgent.split(' ').pop()}</p>
      </div>

      {/* Лицензия */}
      <div className="pt-4 border-t border-gray-700 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Streamer Tools. MIT License.</p>
      </div>
    </div>
  );
};