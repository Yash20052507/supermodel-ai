import React, { useMemo } from 'react';
import type { Message, SkillPack, User } from '../types';
import { motion } from 'framer-motion';
import { BarChart3, Bot, DollarSign, MessageCircle, Star } from './icons.tsx';

const MotionDiv = motion.div as any;

interface AnalyticsProps {
  allMessages: Record<string, Message[]>;
  skillPacks: SkillPack[];
  user: User | null;
}

const Analytics: React.FC<AnalyticsProps> = ({ allMessages, skillPacks, user }) => {
  const analyticsData = useMemo(() => {
    const messages = Object.values(allMessages).flat();
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const totalCost = assistantMessages.reduce((sum, msg) => sum + (msg.cost || 0), 0);
    const totalMessages = messages.length;

    const skillUsage = new Map<string, number>();
    assistantMessages.forEach(msg => {
      (msg.skill_packs_used || []).forEach(skillName => {
        skillUsage.set(skillName, (skillUsage.get(skillName) || 0) + 1);
      });
    });

    const mostUsedSkill = [...skillUsage.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    const messagesPerDay: { date: string, count: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const count = messages.filter(m => m.timestamp.startsWith(dateString)).length;
        messagesPerDay.push({ date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), count });
    }

    return { totalCost, totalMessages, mostUsedSkill, messagesPerDay };
  }, [allMessages]);

  return (
    <MotionDiv
      className="space-y-8 max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Usage Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">An overview of your AI usage and costs.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Cost (All Time)" value={`$${analyticsData.totalCost.toFixed(4)}`} icon={DollarSign} color="violet" />
        <StatCard title="Total Messages Sent" value={analyticsData.totalMessages.toString()} icon={MessageCircle} color="sky" />
        <StatCard title="Total Skills" value={skillPacks.length.toString()} icon={Bot} color="amber" />
        <StatCard title="Most Used Skill" value={analyticsData.mostUsedSkill} icon={Star} color="blue" />
      </div>

       {/* Chart */}
      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Activity Last 7 Days
        </h2>
        <div className="h-64 flex items-end justify-around gap-4 pt-4 border-t border-slate-200 dark:border-slate-600">
            {analyticsData.messagesPerDay.map(day => (
                <Bar key={day.date} label={day.date} value={day.count} maxValue={Math.max(...analyticsData.messagesPerDay.map(d => d.count), 10)} />
            ))}
        </div>
      </div>
      
      {/* Creator Analytics */}
      {user?.isCreator && <CreatorAnalytics skillPacks={skillPacks} user={user} />}
      
    </MotionDiv>
  );
};

// --- Sub-components ---

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
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium truncate">{title}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">{value}</p>
        </div>
    );
};

const Bar: React.FC<{ label: string; value: number; maxValue: number; }> = ({ label, value, maxValue }) => {
    const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
        <div className="flex flex-col items-center h-full flex-1 group">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {value}
            </div>
            <MotionDiv
                className="w-full bg-blue-500 rounded-t-lg"
                initial={{ height: 0 }}
                animate={{ height: `${heightPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{label}</div>
        </div>
    );
};

const CreatorAnalytics: React.FC<{ skillPacks: SkillPack[], user: User }> = ({ skillPacks, user }) => {
    const creatorSkills = useMemo(() => {
        // In a real app, this would be a check against a user_id on the skill pack
        return skillPacks.filter(sp => sp.author === user.name);
    }, [skillPacks, user.name]);
    
    // NOTE: This data is mocked for demonstration purposes.
    const totalInstalls = useMemo(() => creatorSkills.reduce((sum, skill) => sum + skill.downloads, 0), [creatorSkills]);
    const totalRevenue = useMemo(() => creatorSkills.reduce((sum, skill) => sum + (skill.price * skill.downloads), 0), [creatorSkills]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-8">Creator Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Skills Published" value={creatorSkills.length.toString()} icon={Bot} color="blue" />
                <StatCard title="Total Installs" value={totalInstalls.toLocaleString()} icon={MessageCircle} color="sky" />
                <StatCard title="Estimated Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={DollarSign} color="violet" />
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Your Published Skills</h3>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th className="px-6 py-3">Skill Name</th>
                                <th className="px-6 py-3">Installs</th>
                                <th className="px-6 py-3">Avg. Rating</th>
                                <th className="px-6 py-3">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {creatorSkills.map(skill => (
                                <tr key={skill.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{skill.name}</td>
                                    <td className="px-6 py-4">{skill.downloads.toLocaleString()}</td>
                                    <td className="px-6 py-4">{(skill.average_rating || 0).toFixed(1)}</td>
                                    <td className="px-6 py-4">{skill.purchase_type === 'free' ? 'Free' : `$${skill.price.toFixed(2)}`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default Analytics;