import React from 'react';
import { SearchIcon, BellIcon } from '../Icons';

interface HeaderProps {
  onSearch: (query: string) => void;
}

const Header = ({ onSearch }: HeaderProps) => {
  return (
    <header className="bg-white dark:bg-slate-900 shadow-md p-4 flex justify-between items-center">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold">Welcome to SmartPark</h1>
        <p className="text-gray-500 dark:text-slate-400">Your Admin Dashboard</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
          <input
            type="text"
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white py-2 pl-10 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <BellIcon className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">6</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
