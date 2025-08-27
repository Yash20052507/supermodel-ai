import React, { useMemo } from 'react';
import type { SkillPack, Session, Page, User, SessionTemplate, Message } from '../types.ts';
import { Box, MessageCircle, ShoppingBag, Brain, ArrowRight, Bot, DollarSign, X, Info } from './icons.tsx';
import { motion } from 'framer-motion';
import { sampleSessionTemplates } from '../constants.ts';
import { StatCardSkeleton, ListItemSkeleton } from './skeletons.tsx';
import OnboardingChecklist from './OnboardingChecklist.tsx';


// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

interface OnboardingState {
  completed: {
    setApiKey: boolean;
    installSkill: boolean;
    startChat: boolean;
  };
  dismissed: boolean;
}

interface DashboardProps {
  skillPacks: SkillPack[];
  sessions: Session[];
  allMessages: Record<string, Message[]>;
  totalCostToday: number;
  isAppLoading: boolean;
  setCurrentPage: (page: Page) => void;
  startNewSession: () => void;
  startSessionFromTemplate: (template: SessionTemplate) => void;
  selectSession: (id: string) => void;
  user: User | null;
  showApiKeyBanner: boolean;
  onDismissApiBanner: () => void;
  onboardingState: OnboardingState;
  setOnboardingState: React.Dispatch<React.SetStateAction<OnboardingState>>;
}

const Dashboard: React.FC<DashboardProps> = ({ skillPacks, sessions, allMessages, totalCostToday, isAppLoading, setCurrentPage, startNewSession, startSessionFromTemplate, selectSession, user, showApiKeyBanner, onDismissApiBanner, onboardingState, setOnboardingState }) => {
  const recentSessions = sessions.slice(0, 4);
  
  const recommendedSkills = useMemo(() => {
    // Get last 20 messages from all sessions
    const recentMessages = Object.values(allMessages).flat().slice(-20);
    if (recentMessages.length < 3) return []; // Don't recommend if there's not enough context

    // Simple keyword extraction (can be improved)
    const stopWords = new Set(['the', 'and', 'for', 'are', 'with', 'you', 'can', 'what', 'how', 'is', 'in', 'it', 'a', 'to', 'of']);
    const text = recentMessages.map(m => m.content).join(' ');
    const words = text.toLowerCase().split(/[\s,.\-?_!"]+/).filter(w => w.length > 3 && !stopWords.has(w));
    const keywords = [...new Set(words)];

    const uninstalledSkills = skillPacks.filter(sp => !sp.isInstalled && sp.category !== 'General');
    
    const scoredSkills = uninstalledSkills.map(skill => {
        let score = 0;
        const skillText = `${skill.name} ${skill.description} ${skill.tags.join(' ')}`.toLowerCase();
        keywords.forEach(keyword => {
            if (skillText.includes(keyword)) {
                score++;
            }
        });
        return { ...skill, score };
    });

    return scoredSkills.filter(s => s.score > 1).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [allMessages, skillPacks]);

  const featuredSkills = useMemo(() => {
      // Don't show recommended skills in the featured section
      const recIds = new Set(recommendedSkills.map(s => s.id));
      return skillPacks.filter(sp => !sp.isInstalled && !recIds.has(sp.id)).slice(0, 3);
  }, [skillPacks, recommendedSkills]);
  
  return (
    <MotionDiv 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
                <h1 data-tour-id="dashboard-header" className="text-4xl font-bold text-slate-800 dark:text-slate-100">AI Command Center</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user?.name || '...'}!</p>
            </div>
           </div>
        </div>
        <div className="flex flex-shrink-0 gap-3">
            <button 
              data-tour-id="new-chat-button"
              onClick={() => startNewSession()}
              className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span>New Chat</span>
            </button>
            <button 
              onClick={() => setCurrentPage('marketplace')}
              className="px-5 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Explore Skills</span>
            </button>
        </div>
      </div>
      
      <OnboardingChecklist 
        setCurrentPage={setCurrentPage}
        onboardingState={onboardingState}
        setOnboardingState={setOnboardingState}
      />


      {/* API Key Banner */}
      {showApiKeyBanner && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"/>
            <div className="flex-1">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">Get Started with SuperModel AI</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    To use cloud-based AI skills, please add your API keys in the settings. This platform uses a "Bring Your Own Key" model for your privacy and cost control.
                </p>
                <button onClick={() => setCurrentPage('settings')} className="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Go to AI Settings</button>
            </div>
            <button onClick={onDismissApiBanner} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50">
                <X className="w-4 h-4 text-blue-600 dark:text-blue-400"/>
            </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAppLoading ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
        ) : (
            <>
                <StatCard 
                title="Active Skills" 
                value={skillPacks.filter(sp => sp.isActive).length.toString()} 
                icon={Box}
                color="blue"
                />
                <StatCard 
                title="Total Sessions" 
                value={sessions.length.toString()} 
                icon={MessageCircle}
                color="sky"
                />
                <StatCard 
                title="Cost Today" 
                value={`$${totalCostToday.toFixed(4)}`} 
                icon={DollarSign}
                color="violet"
                />
                <StatCard 
                title="Installed Skills" 
                value={skillPacks.filter(sp => sp.isInstalled).length.toString()} 
                icon={Bot}
                color="amber"
                />
            </>
        )}
      </div>

      {/* Session Templates */}
      <div>
        <h2 data-tour-id="session-templates-header" className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Start from a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleSessionTemplates.map(template => (
                <TemplateCard key={template.id} template={template} onClick={() => startSessionFromTemplate(template)} />
            ))}
        </div>
      </div>
      
       {/* Recommended Skills */}
       {recommendedSkills.length > 0 && (
        <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Recommended For You</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendedSkills.map(skill => (
                    <SkillRecommendationCard key={skill.id} skill={skill} onClick={() => setCurrentPage('marketplace')} />
                ))}
            </div>
        </div>
      )}


      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Sessions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Recent Sessions</h2>
            <button 
              onClick={() => setCurrentPage('sessions')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            {isAppLoading ? (
                <div className="space-y-3">
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                </div>
            ) : recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map(session => (
                  <div key={session.id} onClick={() => selectSession(session.id)} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{session.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{session.lastMessage}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                      <p>{new Date(session.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{session.messageCount} messages</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Recent Sessions</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">Start a new chat to begin.</p>
                <button 
                  onClick={() => startNewSession()}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors">
                  Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Featured Skills</h2>
            </div>
            <div className="p-5 space-y-3">
              {isAppLoading ? (
                 <>
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                 </>
              ) : featuredSkills.map(skill => (
                <div key={skill.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="text-3xl flex-shrink-0 w-8 text-center">{skill.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{skill.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{skill.category}</p>
                  </div>
                  <button onClick={() => setCurrentPage('marketplace')} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Quick Actions</h2>
            </div>
            <div className="p-5 space-y-2">
              <QuickActionButton onClick={() => startNewSession()} label="New Conversation" />
              <QuickActionButton onClick={() => setCurrentPage('marketplace')} label="Browse Marketplace" />
              <QuickActionButton onClick={() => setCurrentPage('sessions')} label="View Chat History" />
            </div>
          </div>
        </div>

      </div>
    </MotionDiv>
  );
};

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: 'blue' | 'sky' | 'violet' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
        sky: 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400',
        violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
    };
    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
    );
};

const TemplateCard: React.FC<{ template: SessionTemplate, onClick: () => void }> = ({ template, onClick }) => (
    <button onClick={onClick} className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left flex items-start gap-4">
        <div className="text-3xl mt-1">{template.icon}</div>
        <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{template.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{template.description}</p>
        </div>
    </button>
);

const SkillRecommendationCard: React.FC<{ skill: SkillPack, onClick: () => void }> = ({ skill, onClick }) => (
    <button onClick={onClick} className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border-2 border-dashed border-blue-400/50 dark:border-blue-500/30 shadow-sm hover:shadow-lg hover:border-blue-500/80 hover:-translate-y-1 transition-all text-left flex items-start gap-4">
        <div className="text-3xl mt-1">{skill.icon}</div>
        <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{skill.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{skill.description}</p>
        </div>
    </button>
);

const QuickActionButton: React.FC<{onClick: () => void, label: string}> = ({ onClick, label }) => (
  <button 
    onClick={onClick}
    className="w-full text-left flex justify-between items-center p-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors">
    <span>{label}</span>
    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
  </button>
);

export default Dashboard;