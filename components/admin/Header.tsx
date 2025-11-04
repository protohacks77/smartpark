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
        <p className="text-gray-500 dark:text-slate-400 text-3xl font-bold">Your Admin Dashboard</p>
      </div>
    </header>
  );
};

export default Header;
