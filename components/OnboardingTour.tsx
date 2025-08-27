import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from './icons';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

interface TourStep {
  selector: string;
  title: string;
  content: string;
}

interface OnboardingTourProps {
  onComplete: () => void;
}

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour-id="dashboard-header"]',
    title: 'Welcome to SuperModel AI!',
    content: 'This quick tour will guide you through the main features.',
  },
  {
    selector: '[data-tour-id="new-chat-button"]',
    title: 'Start a Conversation',
    content: 'Click here to start a new chat session anytime.',
  },
  {
    selector: '[data-tour-id="sidebar-marketplace"]',
    title: 'Discover Skills',
    content: 'The Marketplace is where you can find and install new AI capabilities, called Skill Packs.',
  },
  {
    selector: '[data-tour-id="session-templates-header"]',
    title: 'Quick Start with Templates',
    content: 'Use pre-configured templates to jump-start common tasks like debugging code or brainstorming ideas.',
  },
  {
    selector: '[data-tour-id="dashboard-header"]',
    title: 'You\'re All Set!',
    content: 'You\'re ready to explore. Enjoy your enhanced AI experience!',
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isClient, setIsClient] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updatePosition = (element: HTMLElement) => {
    setTargetRect(element.getBoundingClientRect());
  };

  useEffect(() => {
    if (!isClient) return;

    const cleanup = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    };

    const findAndPosition = () => {
      const currentStep = tourSteps[stepIndex];
      const element = document.querySelector<HTMLElement>(currentStep.selector);

      if (element) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Wait for smooth scroll to finish before positioning
        setTimeout(() => {
          updatePosition(element);
          
          // Observe the element for resize/movement
          resizeObserverRef.current = new ResizeObserver(() => updatePosition(element));
          resizeObserverRef.current.observe(element);
          
          // Also listen to window resize
          window.addEventListener('resize', () => updatePosition(element));

        }, 500); // 500ms is generally enough for smooth scroll to settle
      }
    };
    
    cleanup();
    setTargetRect(null); // Hide popover while finding new element
    timerRef.current = setInterval(findAndPosition, 100);

    return cleanup;

  }, [stepIndex, isClient]);

  const handleNext = () => {
    if (stepIndex < tourSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onComplete();
    }
  };
  
  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };
  
  if (!isClient) return null;

  const currentStep = tourSteps[stepIndex];

  return (
    <div className="fixed inset-0 z-50">
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
      />
      
      {targetRect && (
        <MotionDiv
            className="absolute rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
            animate={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
            }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      )}

      <AnimatePresence>
        {targetRect && (
            <MotionDiv
            key={stepIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute max-w-sm p-5 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700"
            style={{
                top: targetRect.bottom + 12,
                left: targetRect.left + targetRect.width / 2,
                transform: 'translateX(-50%)',
            }}
            >
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{currentStep.title}</h3>
            <p className="text-slate-600 dark:text-slate-400 mt-2">{currentStep.content}</p>

            <div className="flex items-center justify-between mt-4">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {stepIndex + 1} / {tourSteps.length}
                </span>
                <div className="flex items-center gap-2">
                <button onClick={onComplete} className="text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                    Skip
                </button>
                {stepIndex > 0 && (
                    <button onClick={handlePrev} className="text-sm font-medium text-slate-600 dark:text-slate-300 px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                    Prev
                    </button>
                )}
                <button onClick={handleNext} className="text-sm font-semibold text-white bg-blue-600 px-4 py-1.5 rounded-md hover:bg-blue-700">
                    {stepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
                </div>
            </div>
            </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingTour;