import React, { useMemo } from 'react';
import type { Page, User } from '../types.ts';
import { Home, MessageCircle, ShoppingBag, Clock, Settings, Sparkles, ChevronLeft, ChevronRight, UserCircle, LogOut, BarChart3, Shield, LifeBuoy } from './icons.tsx';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  user: User | null;
  onLogout: () => void;
  onOpenSupportModal: () => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (isOpen: boolean) => void;
  tempUserOverrides?: Partial<User> | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed, user, onLogout, onOpenSupportModal, isMobileNavOpen, setIsMobileNavOpen, tempUserOverrides }) => {
  const effectiveUser = useMemo(() => ({ ...user, ...tempUserOverrides }), [user, tempUserOverrides]);
  
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { id: 'sessions', icon: Clock, label: 'Sessions' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const creatorNavItems = effectiveUser?.isCreator ? [
    { id: 'admin', icon: Shield, label: 'Admin' }
  ] : [];

  const allNavItems = [...navItems, ...creatorNavItems];

  const handleNavClick = (page: Page) => {
    setCurrentPage(page);
    setIsMobileNavOpen(false); // Close nav on selection for mobile
  };

  return (
    <div className={`
      bg-slate-900 text-white flex flex-col h-full fixed top-0 left-0 z-30 border-r border-slate-700/50
      transition-transform duration-300 ease-in-out
      w-64 md:${sidebarCollapsed ? 'w-20' : 'w-64'}
      ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
    `}>
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-center h-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className={`overflow-hidden ${sidebarCollapsed ? 'md:hidden' : ''}`}>
              <h1 className="font-bold text-lg whitespace-nowrap">SuperModel AI</h1>
              <p className="text-xs text-slate-400 whitespace-nowrap">Modular Intelligence</p>
            </div>
        </div>
      </div>
      
      <nav className="flex-1 p-3">
        <ul className="space-y-2">
          {allNavItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id as Page)}
                title={item.label}
                data-tour-id={item.id === 'marketplace' ? 'sidebar-marketplace' : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors justify-start ${
                  currentPage === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${sidebarCollapsed ? 'md:justify-center' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className={`truncate ${sidebarCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-3">
          <div className={`p-3 rounded-lg bg-slate-800/50 transition-all ${sidebarCollapsed ? 'md:w-14 md:h-14' : ''}`}>
            <div className="flex items-center space-x-3">
              <UserCircle className={`text-slate-400 flex-shrink-0 ${sidebarCollapsed ? 'md:w-8 md:h-8' : 'w-10 h-10'}`}/>
              <div className={`overflow-hidden ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                  <h3 className="font-semibold text-white text-sm whitespace-nowrap">{user?.name || 'Loading...'}</h3>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{user?.email || '...'}</p>
                </div>
            </div>
          </div>
      </div>

       <div className="p-3 mt-auto space-y-2">
        <button
          onClick={() => { onOpenSupportModal(); setIsMobileNavOpen(false); }}
          title="Support"
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-800 hover:text-white justify-start ${sidebarCollapsed ? 'md:justify-center' : ''}`}
        >
          <LifeBuoy className="w-5 h-5 flex-shrink-0" />
          <span className={`truncate ${sidebarCollapsed ? 'md:hidden' : ''}`}>Support</span>
        </button>
        <button
          onClick={onLogout}
          title="Logout"
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-800 hover:text-white justify-start ${sidebarCollapsed ? 'md:justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={`truncate ${sidebarCollapsed ? 'md:hidden' : ''}`}>Logout</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-700/50">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white hidden md:flex"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;