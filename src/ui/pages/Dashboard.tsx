import React from 'react';
import { Sidebar } from '../components/sidebar/Sidebar';
import { SettingsPanel } from '../components/settings/SettingsPanel';

export const Dashboard: React.FC = () => (
  <div className="flex h-screen bg-gray-900 text-white">
    <Sidebar />
    <SettingsPanel />
  </div>
);