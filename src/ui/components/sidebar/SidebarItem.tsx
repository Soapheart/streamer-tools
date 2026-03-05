import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, label, active, onClick 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-purple-600 text-white' 
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    <span className="w-5 h-5">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);