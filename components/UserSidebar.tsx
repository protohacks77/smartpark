import React, { useState } from 'react';
import {
  HomeIcon,
  MapIcon,
  NotificationsIcon,
  SettingsIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  CloseCircleIcon,
} from './Icons';
import type { Theme, ActiveTab } from '../types';

interface UserSidebarProps {
  onLogout: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasUnreadNotices: boolean;
  hasUnreadNotifications: boolean;
}

const UserSidebar = ({ onLogout, theme, onThemeToggle, activeTab, setActiveTab, hasUnreadNotices, hasUnreadNotifications }: UserSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'map', icon: MapIcon, label: 'Map' },
    { id: 'notifications', icon: NotificationsIcon, label: 'Notifications', badge: hasUnreadNotifications },
    { id: 'notices', icon: NotificationsIcon, label: 'Notices', badge: hasUnreadNotices },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <>
      <div className={`bg-gray-800 text-white w-64 p-4 flex-col h-screen fixed lg:relative lg:translate-x-0 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} z-50`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">SmartPark</h1>
          <button className="lg:hidden" onClick={() => setIsOpen(false)}>
            <CloseCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-grow">
          <ul>
            {navItems.map(item => (
              <li key={item.id} className="mb-4">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(item.id as ActiveTab);
                    setIsOpen(false);
                  }}
                  className={`flex items-center p-2 rounded-lg hover:bg-gray-700 ${activeTab === item.id ? 'bg-gray-700' : ''}`}
                >
                  <item.icon className="w-6 h-6 mr-2" />
                  {item.label}
                  {item.badge && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <div className="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer" onClick={onThemeToggle}>
            {theme === 'dark' ? <SunIcon className="w-6 h-6 mr-2" /> : <MoonIcon className="w-6 h-6 mr-2" />}
            Toggle Theme
          </div>
          <div className="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer" onClick={onLogout}>
            <LogOutIcon className="w-6 h-6 mr-2" />
            Logout
          </div>
        </div>
      </div>
      <button className="lg:hidden fixed top-4 left-4 z-50" onClick={() => setIsOpen(true)}>
        <MenuIcon className="w-6 h-6" />
      </button>
    </>
  );
};

export default UserSidebar;
