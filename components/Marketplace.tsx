import React, { useState, useMemo } from 'react';
import type { Page, SkillPack } from '../types.ts';
import { Star, CheckCircle, Search, Trash2, Plus, Loader2, Zap, ArrowDown, ShoppingBag } from './icons.tsx';
import { motion } from 'framer-motion';
import { CardSkeleton } from './skeletons.tsx';
import StarRating from './StarRating.tsx';
import { useToast } from '../hooks/useToast.ts';
import * as dataService from '../services/dataService.ts';


// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

interface MarketplaceProps {
  skillPacks: SkillPack[];
  isAppLoading: boolean;
  installSkillPack: (id: string) => Promise<void>;
  uninstallSkillPack: (id: string) => Promise<void>;
  purchaseSkillPack: (id: string) => Promise<void>; // Kept for future use
  setCurrentPage: (page: Page) => void;
  onViewSkill: (skillId: string) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ skillPacks, isAppLoading, installSkillPack, uninstallSkillPack, purchaseSkillPack, setCurrentPage, onViewSkill }) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'installed'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'downloads' | 'rating'>('default');
  
  const categories = useMemo(() => ['All', ...Array.from(new Set(skillPacks.map(sp => sp.category)))], [skillPacks]);
  
  const displayedSkillPacks = useMemo(() => {
    const packsToShow = activeTab === 'discover' 
      ? skillPacks 
      : skillPacks.filter(sp => sp.isInstalled);

    let filtered = packsToShow.filter(sp => {
      const matchesSearch = sp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           sp.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || sp.category === selectedCategory;
      return matchesSearch && (activeTab === 'installed' || matchesCategory);
    });

    if (activeTab === 'discover') {
      if (sortBy === 'downloads') {
        filtered.sort((a, b) => b.downloads - a.downloads);
      } else if (sortBy === 'rating') {
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      }
    }

    return filtered;
  }, [skillPacks, activeTab, searchQuery, selectedCategory, sortBy]);

  return (
    <MotionDiv 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Skill Marketplace</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Discover, install, and manage new AI capabilities.</p>
        </div>
        <button
          onClick={() => setCurrentPage('buildskillpack')}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Build Skill Pack</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <TabButton name="Discover" isActive={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
            <TabButton name="My Skills" count={skillPacks.filter(sp => sp.isInstalled).length} isActive={activeTab === 'installed'} onClick={() => setActiveTab('installed')} />
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-4 z-10 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search skill packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent dark:text-slate-100"
          />
        </div>
        {activeTab === 'discover' && (
          <div className="flex flex-col sm:flex-row gap-4 items-center">
             <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <FilterButton key={category} label={category} isActive={selectedCategory === category} onClick={() => setSelectedCategory(category)} />
                ))}
              </div>
            <div className="flex-grow" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Sort by:</span>
              <SortButton label="Default" isActive={sortBy === 'default'} onClick={() => setSortBy('default')} />
              <SortButton label="Popular" isActive={sortBy === 'downloads'} onClick={() => setSortBy('downloads')} />
              <SortButton label="Rating" isActive={sortBy === 'rating'} onClick={() => setSortBy('rating')} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAppLoading ? (
            <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </>
        ) : displayedSkillPacks.length > 0 ? (
            displayedSkillPacks.map(skillPack => (
                <SkillPackCard key={skillPack.id} skillPack={skillPack} onInstall={installSkillPack} onUninstall={uninstallSkillPack} onView={() => onViewSkill(skillPack.id)} />
            ))
        ) : (
             <div className="md:col-span-2 lg:col-span-3 text-center py-16">
                {activeTab === 'installed' ? (
                     <>
                        <ShoppingBag className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Skills Installed</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">Your installed skills will appear here.</p>
                        <button 
                          onClick={() => setActiveTab('discover')}
                          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors">
                          Discover Skills
                        </button>
                    </>
                ) : (
                    <>
                        <Search className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Skill Packs Found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
                    </>
                )}
              </div>
        )}
      </div>
    </MotionDiv>
  );
};

const SkillPackCard: React.FC<{ 
    skillPack: SkillPack, 
    onInstall: (id: string) => Promise<void>, 
    onUninstall: (id: string) => Promise<void>,
    onView: () => void,
}> = React.memo(({ skillPack, onInstall, onUninstall, onView }) => {
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const { addToast } = useToast();
    
    const handleInstall = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsActionInProgress(true);
        await onInstall(skillPack.id);
        setIsActionInProgress(false);
    };
    
    const handleUninstall = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsActionInProgress(true);
        await onUninstall(skillPack.id);
        setIsActionInProgress(false);
    };

    const handleUpdate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsActionInProgress(true);
        try {
            await dataService.updateInstalledSkillVersion(skillPack.id, skillPack.version);
            addToast({ type: 'success', title: 'Skill Updated!', message: `${skillPack.name} is now at version ${skillPack.version}.` });
        } catch(error) {
            addToast({ type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : 'Could not update skill.' });
        } finally {
            setIsActionInProgress(false);
        }
    };

    const isUpdateAvailable = skillPack.isInstalled && skillPack.installedVersion && skillPack.version > skillPack.installedVersion;

    return (
        <div className="relative">
             <button onClick={onView} className="bg-white text-left dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col w-full">
              <div className="p-6 flex-grow">
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                        <div className="text-4xl">{skillPack.icon}</div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                              {skillPack.name}
                              {skillPack.skill_type === 'code-enhanced' && <span title="Code-Enhanced Skill"><Zap className="w-4 h-4 text-amber-500" /></span>}
                            </h3>
                             <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span>{skillPack.category}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="capitalize font-semibold">{skillPack.provider}</span>
                            </div>
                        </div>
                    </div>
                     {skillPack.isInstalled && (
                        <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Installed {isUpdateAvailable && `(v${skillPack.installedVersion})`}</span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 h-20 line-clamp-4">{skillPack.description}</p>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-b-xl">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <StarRating rating={skillPack.average_rating || 0} size="sm" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{(skillPack.average_rating || 0).toFixed(1)}</span>
                    <span className="text-xs">({skillPack.review_count})</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {skillPack.purchase_type === 'free' ? 'Free' : (
                        <>
                            <span className="text-slate-400 line-through">${skillPack.price.toFixed(2)}</span>
                            <span>Free</span>
                        </>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                    {skillPack.isInstalled ? (
                         isUpdateAvailable ? (
                            <button
                                onClick={handleUpdate}
                                disabled={isActionInProgress}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-400 disabled:cursor-wait"
                            >
                                {isActionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <> <ArrowDown className="w-4 h-4" /> {`Update to v${skillPack.version}`} </>}
                            </button>
                        ) : (
                            <button
                                onClick={handleUninstall}
                                disabled={isActionInProgress}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                            >
                                {isActionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Uninstall</>}
                            </button>
                        )
                    ) : (
                         <button
                            onClick={handleInstall}
                            disabled={isActionInProgress}
                            className="w-full flex justify-center items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isActionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : (skillPack.purchase_type === 'free' ? 'Install' : 'Get')}
                        </button>
                    )}
                </div>
              </div>
            </button>
            {isActionInProgress && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}
        </div>
    );
});


const TabButton: React.FC<{ name: string, count?: number, isActive: boolean, onClick: () => void }> = ({ name, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors
            ${isActive 
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
            }`}
    >
        {name}
        {count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {count}
            </span>
        )}
    </button>
);

const FilterButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick}) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
);

const SortButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick}) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
      }`}
    >
      {label}
    </button>
);


export default Marketplace;