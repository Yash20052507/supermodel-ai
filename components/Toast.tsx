import React, { useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastMessage, ToastMessagesContext } from '../contexts/ToastContext';
import { useToast } from '../hooks/useToast';
import { CheckCircle, AlertTriangle, Info, X } from './icons';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

const icons: { [key: string]: React.ElementType } = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  info: Info,
};

const colors: { [key: string]: string } = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

export const Toast: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToast();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const Icon = icons[toast.type];

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
      className="relative flex w-full max-w-sm overflow-hidden bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
    >
      <div className={`flex items-center justify-center w-12 ${colors[toast.type]}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      <div className="px-4 py-2 -mx-3 flex-1">
        <div className="mx-3">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{toast.title}</span>
          {toast.message && <p className="text-sm text-slate-600 dark:text-slate-400">{toast.message}</p>}
        </div>
      </div>
      <button 
        onClick={() => removeToast(toast.id)}
        className="absolute top-1 right-1 p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </MotionDiv>
  );
};

export const ToastContainer: React.FC = () => {
    const toasts = useContext(ToastMessagesContext);

    return (
        <div className="fixed bottom-0 right-0 z-50 p-4">
            <div className="flex flex-col items-end space-y-3">
                 <AnimatePresence>
                    {toasts.map((toast) => (
                        <Toast key={toast.id} toast={toast} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};