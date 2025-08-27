import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Home, MessageCircle, ShoppingBag, Clock, Settings, BarChart3, 
  Sparkles, ArrowRight, Sun, Moon, LogOut, PlusCircle, Box
} from './icons.tsx';
import type { Page, Session, SkillPack } from '../types.ts';

const MotionDiv = motion.div as any;

interface CommandItem {
  id: string;
  group: string;
  icon: React.ElementType;
  label: string;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  skillPacks: SkillPack[];
  theme: 'light' | 'dark';
  setCurrentPage: (page: Page) => void;
  selectSession: (sessionId: string) => void;
  onViewSkill: (skillId: string) => void;
  startNewSession: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ 
    isOpen, onClose, sessions, skillPacks, theme, 
    setCurrentPage, selectSession, onViewSkill, startNewSession, setTheme, onLogout 
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const navigationCommands: CommandItem[] = [
      { id: 'nav-dashboard', group: 'Navigation', icon: Home, label: 'Go to Dashboard', action: () => setCurrentPage('dashboard') },
      { id: 'nav-chat', group: 'Navigation', icon: MessageCircle, label: 'Go to Chat', action: () => setCurrentPage('chat') },
      { id: 'nav-marketplace', group: 'Navigation', icon: ShoppingBag, label: 'Go to Marketplace', action: () => setCurrentPage('marketplace') },
      { id: 'nav-sessions', group: 'Navigation', icon: Clock, label: 'Go to Sessions', action: () => setCurrentPage('sessions') },
      { id: 'nav-analytics', group: 'Navigation', icon: BarChart3, label: 'Go to Analytics', action: () => setCurrentPage('analytics') },
      { id: 'nav-settings', group: 'Navigation', icon: Settings, label: 'Go to Settings', action: () => setCurrentPage('settings') },
    ];

    const sessionCommands: CommandItem[] = sessions.slice(0, 5).map(session => ({
      id: `session-${session.id}`,
      group: 'Recent Sessions',
      icon: MessageCircle,
      label: session.name,
      action: () => selectSession(session.id),
      keywords: 'conversation chat'
    }));
    
    const skillCommands: CommandItem[] = skillPacks.map(skill => ({
      id: `skill-${skill.id}`,
      group: 'Skills',
      icon: Box,
      label: `Find Skill: ${skill.name}`,
      action: () => onViewSkill(skill.id),
      keywords: `marketplace ${skill.category}`
    }));

    const actionCommands: CommandItem[] = [
      { id: 'action-new-chat', group: 'Actions', icon: PlusCircle, label: 'Start New Chat', action: startNewSession },
      { id: 'action-toggle-theme', group: 'Actions', icon: theme === 'dark' ? Sun : Moon, label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'action-logout', group: 'Actions', icon: LogOut, label: 'Logout', action: onLogout },
    ];

    return [...navigationCommands, ...sessionCommands, ...actionCommands, ...skillCommands];
  }, [sessions, skillPacks, theme, setCurrentPage, selectSession, onViewSkill, startNewSession, setTheme, onLogout]);
  
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerCaseQuery = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(lowerCaseQuery) ||
      (cmd.keywords && cmd.keywords.toLowerCase().includes(lowerCaseQuery))
    );
  }, [query, commands]);

  const groupedCommands = useMemo(() => {
    return filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.group]) {
            acc[cmd.group] = [];
        }
        acc[cmd.group].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);
  }, [filteredCommands]);
  
  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const handleAction = (cmd: CommandItem) => {
    cmd.action();
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          handleAction(filteredCommands[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredCommands, onClose]);
  
  // Scroll active item into view
  useEffect(() => {
    const activeElement = document.getElementById(`command-item-${activeIndex}`);
    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ scale: 0.95, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-700">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0 ml-1" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                    placeholder="Type a command or search..."
                    className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
            </div>
            
            <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto p-2">
                {filteredCommands.length > 0 ? (
                    Object.entries(groupedCommands).map(([group, cmds]) => (
                        <div key={group} className="mb-2 last:mb-0">
                            <h3 className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{group}</h3>
                            <ul>
                                {cmds.map(cmd => {
                                    const currentIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                                    return (
                                        <li key={cmd.id}>
                                            <button
                                                id={`command-item-${currentIndex}`}
                                                onClick={() => handleAction(cmd)}
                                                onMouseMove={() => setActiveIndex(currentIndex)}
                                                className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                                                    activeIndex === currentIndex ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                <cmd.icon className={`w-5 h-5 flex-shrink-0 ${activeIndex === currentIndex ? 'text-white' : 'text-slate-500'}`} />
                                                <span className="flex-1 truncate">{cmd.label}</span>
                                                <ArrowRight className={`w-4 h-4 ml-auto ${activeIndex === currentIndex ? 'opacity-100' : 'opacity-0'}`} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                        <p>No results found.</p>
                    </div>
                )}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;