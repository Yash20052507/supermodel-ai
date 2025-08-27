import React from 'react';

export const StatCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-8 w-16 bg-slate-300 dark:bg-slate-600 rounded-md mt-2"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700"></div>
      </div>
    </div>
);

export const ListItemSkeleton: React.FC = () => (
    <div className="flex items-center gap-4 p-3 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0"></div>
        <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
            <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
    </div>
);

export const CardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col animate-pulse">
      <div className="p-6 flex-grow">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-md bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-5 w-3/4 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
            <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          </div>
        </div>
        <div className="space-y-2 mt-4">
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-md"></div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-md"></div>
            <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
      </div>
      <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-b-xl">
        <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>
);
