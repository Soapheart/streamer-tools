import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean; 
  onClick: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, label, active, collapsed, onClick 
}) => (
  <button
    onClick={onClick}
    className={`group relative w-full flex items-center rounded-lg transition-all duration-200 
    ${
      collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3 gap-3'
    }
    ${
      active 
        ? 'bg-purple-600 text-white' 
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    <span className="w-5 h-5">{icon}</span>
    <span className={`font-medium whitespace-nowrap transition-all duration-200 ${
        collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
      }`}>{label}</span>
    {collapsed && (
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </span>
    )}
  </button>
);