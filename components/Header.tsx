import React from 'react';
import { PanelLeft, Search } from './icons.tsx';

interface HeaderProps {
  onToggleMobileNav: () => void;
  onOpenCommandPalette: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMobileNav, onOpenCommandPalette }) => {
  return (
    <header className="flex-shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 h-20 flex items-center px-4 md:px-6 justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-md bg-slate-100 dark:bg-slate-800"
          aria-label="Toggle navigation"
        >
          <PanelLeft className="w-6 h-6 text-slate-800 dark:text-slate-200" />
        </button>
        {/* Placeholder for page title */}
        <div className="w-16 hidden md:block"></div>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <button
          onClick={onOpenCommandPalette}
          className="w-full max-w-md flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Open command palette (Cmd+K)"
        >
          <Search className="w-5 h-5 ml-1" />
          <span className="text-sm pr-2">Search or type a command...</span>
          <kbd className="ml-auto text-xs font-sans font-semibold border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>
      </div>

      <div className="w-16">
        {/* Placeholder for user menu or other right-aligned items */}
      </div>
    </header>
  );
};

export default Header;
