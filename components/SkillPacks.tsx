import React from 'react';
import type { SkillPack } from '../types.ts';
import { Box } from './icons.tsx';

interface SkillPacksProps {
  skillPacks: SkillPack[];
  toggleSkillPack: (id: string) => void;
}

const SkillPacks: React.FC<SkillPacksProps> = ({ skillPacks, toggleSkillPack }) => {
  const installedSkillPacks = skillPacks.filter(sp => sp.isInstalled);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">My Skills</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your installed AI capabilities.</p>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {installedSkillPacks.length > 0 ? (
            installedSkillPacks.map(skillPack => (
              <div 
                key={skillPack.id} 
                className="flex items-center space-x-4 p-4"
              >
                <div className="text-3xl flex-shrink-0 w-10 text-center">{skillPack.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{skillPack.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{skillPack.description}</p>
                </div>
                <div className="flex items-center">
                   <span className={`text-sm font-medium mr-3 ${skillPack.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {skillPack.isActive ? 'Active' : 'Inactive'}
                   </span>
                  <button
                    onClick={() => toggleSkillPack(skillPack.id)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center p-1 ${
                      skillPack.isActive ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      skillPack.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Box className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Skills Installed</h3>
                <p>Visit the Marketplace to add new capabilities.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillPacks;