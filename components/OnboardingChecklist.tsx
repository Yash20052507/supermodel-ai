import React from 'react';
import type { Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, X, Bot, Settings, ShoppingBag } from './icons';

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

interface OnboardingChecklistProps {
  setCurrentPage: (page: Page) => void;
  onboardingState: OnboardingState;
  setOnboardingState: React.Dispatch<React.SetStateAction<OnboardingState>>;
}

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ setCurrentPage, onboardingState, setOnboardingState }) => {
  if (onboardingState.dismissed || Object.values(onboardingState.completed).every(Boolean)) {
    return null;
  }

  const handleDismiss = () => {
    setOnboardingState((s: any) => ({ ...s, dismissed: true }));
  };

  const tasks = [
    {
      id: 'setApiKey',
      icon: Settings,
      title: 'Set Your API Key',
      description: 'Add your AI provider keys to unlock skills.',
      action: () => setCurrentPage('settings'),
      isComplete: onboardingState.completed.setApiKey,
    },
    {
      id: 'installSkill',
      icon: ShoppingBag,
      title: 'Install Your First Skill',
      description: 'Browse the marketplace for new capabilities.',
      action: () => setCurrentPage('marketplace'),
      isComplete: onboardingState.completed.installSkill,
    },
    {
      id: 'startChat',
      icon: Bot,
      title: 'Start Your First Chat',
      description: 'Begin a conversation with your new AI.',
      action: () => setCurrentPage('chat'),
      isComplete: onboardingState.completed.startChat,
    },
  ];

  const completionPercentage = (Object.values(onboardingState.completed).filter(Boolean).length / tasks.length) * 100;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
      >
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Getting Started</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Complete these steps to get the most out of SuperModel AI.</p>
            </div>
            <button onClick={handleDismiss} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {Math.round(completionPercentage)}% Complete
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
              <motion.div
                className="bg-blue-600 h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-4">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={task.action}
                disabled={task.isComplete}
                className="flex items-center gap-4 p-4 rounded-lg text-left transition-colors bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    task.isComplete ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {task.isComplete ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <task.icon className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default OnboardingChecklist;
