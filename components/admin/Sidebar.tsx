import React, { useState } from 'react';
import {
  BarChartIcon,
  CashIcon,
  ChatbubblesIcon,
  DocumentTextIcon,
  LayersIcon,
  LogOutIcon,
  MoonIcon,
  NewspaperIcon,
  PersonIcon,
  SunIcon,
  TrendingUpIcon,
  MenuIcon,
  CloseCircleIcon,
} from '../Icons';
import type { Theme } from '../../types';

interface SidebarProps {
  onLogout: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  onNavigate: (view: string) => void;
}

const Sidebar = ({ onLogout, theme, onThemeToggle, onNavigate }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`bg-gray-800 text-white w-64 p-4 flex-col h-screen fixed lg:relative lg:translate-x-0 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} z-50`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">SmartPark</h1>
          <button className="lg:hidden" onClick={() => setIsOpen(false)}>
            <CloseCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 rounded-full mr-4 bg-indigo-500 flex items-center justify-center">
            <span className="text-2xl font-bold">A</span>
          </div>
          <div>
            <h2 className="font-bold">Admin</h2>
            <p className="text-sm text-gray-400">Administrator</p>
          </div>
        </div>
        <nav className="flex-grow">
          <ul>
            <li className="mb-4">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
                <BarChartIcon className="w-6 h-6 mr-2" />
                Dashboard
              </a>
            </li>
            <li className="mb-4">
              <a href="#" onClick={() => onNavigate('users')} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
                <PersonIcon className="w-6 h-6 mr-2" />
              View Users
            </a>
          </li>
          <li className="mb-4">
            <a href="#" onClick={() => onNavigate('addUser')} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
              <PersonIcon className="w-6 h-6 mr-2" />
              Add User
              </a>
            </li>
            <li className="mb-4">
              <a href="#" onClick={() => onNavigate('parking')} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
                <LayersIcon className="w-6 h-6 mr-2" />
                Parking Lots
              </a>
            </li>
            <li className="mb-4">
              <a href="#" onClick={() => onNavigate('notices')} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
                <NewspaperIcon className="w-6 h-6 mr-2" />
                Notices
              </a>
            </li>
            <li className="mb-4">
              <a href="#" onClick={() => onNavigate('reviews')} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
                <ChatbubblesIcon className="w-6 h-6 mr-2" />
                Reviews
              </a>
            </li>
            <li className="mb-4">
              <a href="#" onClick={() => onNavigate('reports')} className="flex items-center p-2 rounded-lg hover:bg-gray-700">
                <DocumentTextIcon className="w-6 h-6 mr-2" />
                Reports
              </a>
            </li>
          </ul>
        </nav>
        <div>
          <div className="flex items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer" onClick={onThemeToggle} data-testid="theme-toggle">
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

export default Sidebar;
