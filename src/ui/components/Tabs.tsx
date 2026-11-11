import React from 'react';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}
interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
    <div className="sticky top-0 bg-gray-800 z-10 border-b border-gray-700 pb-0 mb-6 pt-2">
    <div className="flex flex-col lg:flex-row gap-2">
        {tabs.map((tab) => (
        <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
            flex items-center gap-2 px-4 py-2.5 font-medium transition-all duration-200
            rounded-lg lg:rounded-b-none
            border-2
            lg:border-x-0 lg:border-t-0
            ${activeTab === tab.id
                ? 'bg-gray-700 text-white border-purple-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border-transparent'
            }
            `}
        >
            {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
            {tab.label}
        </button>
        ))}
    </div>
    </div>
    );
}