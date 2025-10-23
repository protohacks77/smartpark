
import React from 'react';
import { SunIcon, MoonIcon } from './Icons';
import type { Theme } from '../types';

interface HeaderProps {
    theme: Theme;
    onThemeToggle: () => void;
}

const Header = ({ theme, onThemeToggle }: HeaderProps) => (
  <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/10 dark:from-black/50 to-transparent">
    <div className="text-center">
      <h1 className="text-3xl font-bold tracking-wider animate-shine bg-[linear-gradient(110deg,#a5b4fc,45%,#f9a8d4,55%,#a5b4fc)] bg-[length:250%_100%] bg-clip-text text-transparent">
        SmartPark
      </h1>
      <p className="text-gray-600 dark:text-gray-300 text-sm italic">get there and park smart</p>
    </div>
    <div className="absolute top-4 right-4 z-20">
        <button 
            onClick={onThemeToggle} 
            className="p-2 rounded-full bg-gray-200/50 dark:bg-slate-800/50 text-gray-800 dark:text-white hover:bg-gray-300/70 dark:hover:bg-slate-700/50 transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
    </div>
    <style>{`
      @keyframes shine {
        to {
          background-position-x: -250%;
        }
      }
      .animate-shine {
        animation: shine 5s linear infinite;
      }
    `}</style>
  </header>
);

export default Header;