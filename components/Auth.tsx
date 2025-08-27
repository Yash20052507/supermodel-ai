import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Sparkles, Loader2, UserIcon, Lock, X } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;
const MotionForm = motion.form as any;

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialIsLogin?: boolean;
    onViewLegal: (type: 'privacy' | 'terms') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialIsLogin = true, onViewLegal }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLogin(initialIsLogin);
  }, [initialIsLogin]);

  useEffect(() => {
    if (!isOpen) {
        // Reset form state on close
        setEmail('');
        setPassword('');
        setError(null);
        setMessage(null);
        setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // On success, the App component's onAuthStateChange will handle closing the modal.
      } else {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name: email.split('@')[0] || 'New User' }
            }
        });
        if (error) throw error;

        // If email confirmation is required, the session will be null.
        if (data.user && !data.session) {
            setMessage("Please check your email for a confirmation link to complete registration.");
            setIsLogin(true); // Switch to login view for when they return
        }
        // If confirmation is not required, user is logged in and onAuthStateChange will handle it.
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <AnimatePresence>
        {isOpen && (
             <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <MotionDiv 
                    className="w-full max-w-md bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-lg mb-4">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">{isLogin ? 'Sign in to continue' : 'Join SuperModel AI'}</p>
                        </div>

                        <MotionForm onSubmit={handleSubmit} className="space-y-6">
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="email-modal" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                              <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input id="email-modal" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent dark:text-slate-100" />
                              </div>
                            </div>
                            <div>
                              <label htmlFor="password-modal"  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                               <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input id="password-modal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent dark:text-slate-100" />
                              </div>
                            </div>
                          </div>

                          {error && ( <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p> )}
                          {message && ( <p className="text-sm text-green-600 dark:text-green-400 text-center">{message}</p> )}

                          <div>
                            <button type="submit" disabled={loading}
                              className="w-full flex justify-center items-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                            >
                              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                              {isLogin ? 'Sign In' : 'Create Account'}
                            </button>
                          </div>

                          <div className="text-center">
                            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
                              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                            </button>
                          </div>
                        </MotionForm>
                    </div>
                     <footer className="p-4 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                        By continuing, you agree to our{' '}
                        <button onClick={() => onViewLegal('terms')} className="underline hover:text-blue-500">Terms of Service</button> and{' '}
                        <button onClick={() => onViewLegal('privacy')} className="underline hover:text-blue-500">Privacy Policy</button>.
                    </footer>
                </MotionDiv>
            </MotionDiv>
        )}
    </AnimatePresence>
  );
};

export default AuthModal;
