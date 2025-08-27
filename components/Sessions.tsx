import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Session, Page } from '../types.ts';
import { PlusCircle, MessageCircle, Search, Clock, Pin, Trash2, Archive, Calendar, Filter, Edit2 } from './icons.tsx';
import { CardSkeleton, StatCardSkeleton } from './skeletons.tsx';

// --- Helper Functions ---
const isToday = (someDate: Date) => {
  const today = new Date();
  return someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear();
};

const isThisWeek = (someDate: Date) => {
  const today = new Date();
  const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  firstDayOfWeek.setHours(0,0,0,0);
  return someDate >= firstDayOfWeek;
};

// --- Props Interface ---
interface SessionsProps {
  sessions: Session[];
  isAppLoading: boolean;
  selectSession: (sessionId: string) => void;
  startNewSession: () => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  deleteSession: (sessionId: string) => void;
}

// --- Sub-Components ---
const SessionStats: React.FC<{ sessions: Session[], isAppLoading: boolean }> = ({ sessions, isAppLoading }) => {
    const stats = useMemo(() => {
        const activeSessions = sessions.filter(s => s.status !== 'archived');
        const total = activeSessions.length;
        const thisWeek = activeSessions.filter(s => isThisWeek(new Date(s.timestamp))).length;
        const thisMonth = activeSessions.filter(s => new Date(s.timestamp).getMonth() === new Date().getMonth() && new Date(s.timestamp).getFullYear() === new Date().getFullYear()).length;
        const totalMessages = activeSessions.reduce((acc, s) => acc + s.messageCount, 0);
        const avgMessages = total > 0 ? Math.round(totalMessages / total) : 0;
        return { total, thisWeek, thisMonth, avgMessages };
    }, [sessions]);

    if (isAppLoading) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Active Sessions" value={stats.total.toString()} />
            <StatCard title="This Week" value={stats.thisWeek.toString()} />
            <StatCard title="This Month" value={stats.thisMonth.toString()} />
            <StatCard title="Avg. Messages" value={stats.avgMessages.toString()} />
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: string }> = ({ title, value }) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
    </div>
);

const SessionCard: React.FC<{
    session: Session;
    isEditing: boolean;
    onStartEditing: (id: string, currentName: string) => void;
    onSaveName: (id: string, newName: string) => void;
    onCancelEditing: () => void;
    onSelect: () => void;
    onUpdate: (updates: Partial<Session>) => void;
    onDelete: () => void;
}> = React.memo(({ session, isEditing, onStartEditing, onSaveName, onCancelEditing, onSelect, onUpdate, onDelete }) => {
    const { id, name, lastMessage, timestamp, messageCount, isPinned, status } = session;
    const isArchived = status === 'archived';
    const [tempName, setTempName] = useState(name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);
    
    const handleSave = () => {
        if (tempName.trim() && tempName.trim() !== name) {
            onSaveName(id, tempName.trim());
        } else {
            onCancelEditing();
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setTempName(name);
            onCancelEditing();
        }
    };

    return (
        <div className={`bg-white dark:bg-slate-800/50 rounded-xl border-2 transition-all duration-300 flex flex-col hover:shadow-lg hover:-translate-y-1 ${isPinned ? 'border-blue-500/50 dark:border-blue-500/40' : 'border-slate-200 dark:border-slate-700'} ${isArchived ? 'opacity-60' : ''}`}>
            <div className="p-5 flex-grow relative">
                {isPinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-400 absolute top-4 right-4" />}
                <div className="flex items-center gap-3">
                    <div onClick={onSelect} className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">
                        <MessageCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                     {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className="font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                        />
                    ) : (
                        <h3 onClick={onSelect} className="font-semibold text-slate-800 dark:text-slate-100 truncate flex-1 pr-6 cursor-pointer">{name}</h3>
                    )}
                </div>
                <p onClick={onSelect} className="text-sm text-slate-500 dark:text-slate-400 mt-3 h-10 line-clamp-2 cursor-pointer">{lastMessage}</p>
            </div>
            <div className="px-5 pb-4">
                 <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span>{new Date(timestamp).toLocaleDateString()}</span>
                    <span>{messageCount} messages</span>
                </div>
                <div className="flex items-center gap-2">
                    <ActionButton icon={Edit2} label="Rename" onClick={() => onStartEditing(id, name)} />
                    <ActionButton icon={Pin} label={isPinned ? 'Unpin' : 'Pin'} onClick={() => onUpdate({ isPinned: !isPinned })} active={isPinned} />
                    <ActionButton icon={Archive} label={isArchived ? 'Restore' : 'Archive'} onClick={() => onUpdate({ status: isArchived ? 'active' : 'archived' })} />
                    <ActionButton icon={Trash2} label="Delete" onClick={onDelete} isDelete />
                </div>
            </div>
        </div>
    );
});

const ActionButton: React.FC<{ icon: React.ElementType, label: string, onClick: (e: React.MouseEvent) => void, active?: boolean, isDelete?: boolean }> = ({ icon: Icon, label, onClick, active, isDelete }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        title={label}
        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium transition-colors ${
            isDelete
            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50'
            : active 
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
    >
        <Icon className="w-3.5 h-3.5" />
    </button>
);


// --- Main Component ---
const Sessions: React.FC<SessionsProps> = ({ sessions, isAppLoading, selectSession, startNewSession, updateSession, deleteSession }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState("");

  const filteredAndSortedSessions = useMemo(() => {
    let filtered = sessions.filter(session => {
        const matchesSearch = session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            session.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        switch (filterBy) {
            case "all": return session.status !== 'archived';
            case "pinned": return session.status !== 'archived' && !!session.isPinned;
            case "archived": return session.status === "archived";
            case "today": return session.status !== 'archived' && isToday(new Date(session.timestamp));
            case "week": return session.status !== 'archived' && isThisWeek(new Date(session.timestamp));
            default: return true;
        }
    });

    filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return filtered;
  }, [sessions, searchTerm, filterBy]);

  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: Session[] } = {};
    if (filterBy === 'archived') {
      if (filteredAndSortedSessions.length > 0) {
        groups['Archived'] = filteredAndSortedSessions;
      }
    } else {
        filteredAndSortedSessions.forEach(session => {
            const date = new Date(session.timestamp);
            let groupKey = "Older";

            if (isToday(date)) groupKey = "Today";
            else if (isThisWeek(date)) groupKey = "This Week";
            else if (date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()) groupKey = "This Month";

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(session);
        });
    }
    return groups;
  }, [filteredAndSortedSessions, filterBy]);

  const handleStartEditing = (id: string, currentName: string) => {
    setEditingSessionId(id);
    setEditingSessionName(currentName);
  };

  const handleSaveName = (id: string, newName: string) => {
    updateSession(id, { name: newName });
    setEditingSessionId(null);
  };
  
  const handleCancelEditing = () => {
    setEditingSessionId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Sessions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review and manage your conversation history.</p>
        </div>
        <button
          onClick={() => startNewSession()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New Session</span>
        </button>
      </div>

      {/* Stats */}
      <SessionStats sessions={sessions} isAppLoading={isAppLoading} />

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Search sessions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-wrap gap-2">
              <FilterChip label="All" icon={Filter} isActive={filterBy === 'all'} onClick={() => setFilterBy('all')} />
              <FilterChip label="Pinned" icon={Pin} isActive={filterBy === 'pinned'} onClick={() => setFilterBy('pinned')} />
              <FilterChip label="Today" icon={Calendar} isActive={filterBy === 'today'} onClick={() => setFilterBy('today')} />
              <FilterChip label="This Week" icon={Calendar} isActive={filterBy === 'week'} onClick={() => setFilterBy('week')} />
              <FilterChip label="Archived" icon={Archive} isActive={filterBy === 'archived'} onClick={() => setFilterBy('archived')} />
          </div>
      </div>
      
      {/* Sessions List */}
      {isAppLoading ? (
           <div className="space-y-8">
               <div>
                  <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 animate-pulse"></div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       <CardSkeleton />
                       <CardSkeleton />
                       <CardSkeleton />
                   </div>
               </div>
           </div>
      ) : filteredAndSortedSessions.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Sessions Found</h3>
            <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters, or start a new session!</p>
          </div>
      ) : (
          <div className="space-y-8">
              {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                  <div key={groupName}>
                      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-500"/>
                        {groupName}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupSessions.map(session => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                isEditing={editingSessionId === session.id}
                                onStartEditing={handleStartEditing}
                                onSaveName={handleSaveName}
                                onCancelEditing={handleCancelEditing}
                                onSelect={() => selectSession(session.id)}
                                onUpdate={(updates) => updateSession(session.id, updates)}
                                onDelete={() => deleteSession(session.id)}
                            />
                        ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

    </div>
  );
};

const FilterChip: React.FC<{ label: string, icon: React.ElementType, isActive: boolean, onClick: () => void }> = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            isActive
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);


export default Sessions;