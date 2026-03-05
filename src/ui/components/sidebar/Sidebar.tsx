import React from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { SidebarItem } from './SidebarItem';
import { WidgetCategory } from '../../types';

// Простые SVG-иконки (можно заменить на lucide-react или heroicons)
const icons = {
  general: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  music: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  auction: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};

const categories: { id: WidgetCategory; label: string }[] = [
  { id: 'general', label: 'Общие' },
  { id: 'music', label: 'Яндекс.Музыка' },
  { id: 'chat', label: 'Чат' },
  { id: 'auction', label: 'Аукцион' },
];

export const Sidebar: React.FC = () => {
  const { activeCategory, setActiveCategory } = useDashboardStore();

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col gap-2">
      <h2 className="text-xl font-bold text-white px-4 py-2 mb-2">
        🎮 Streamer Tools
      </h2>
      {categories.map((cat) => (
        <SidebarItem
          key={cat.id}
          icon={icons[cat.id]}
          label={cat.label}
          active={activeCategory === cat.id}
          onClick={() => setActiveCategory(cat.id)}
        />
      ))}
    </aside>
  );
};