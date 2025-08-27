import React, { createContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
  removeToast: () => {},
});
export const ToastMessagesContext = createContext<ToastMessage[]>([]);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    setToasts((currentToasts) => [
      ...currentToasts,
      { id: Date.now(), ...toast },
    ]);
  }, []);
  
  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
  }, []);

  const value = { addToast, removeToast };

  return (
    <ToastContext.Provider value={value}>
      <ToastMessagesContext.Provider value={toasts}>
        {children}
      </ToastMessagesContext.Provider>
    </ToastContext.Provider>
  );
};