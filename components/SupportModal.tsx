import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, Send } from './icons';
import { useToast } from '../hooks/useToast';
import * as dataService from '../services/dataService';

const MotionDiv = motion.div as any;

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formState, setFormState] = useState({ type: 'feedback' as 'feedback' | 'bug' | 'feature', subject: '', description: '' });
  const { addToast } = useToast();

  const handleClose = () => {
    onClose();
    setTimeout(() => {
        setStatus('idle');
        setFormState({ type: 'feedback', subject: '', description: '' });
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    addToast({ type: 'info', title: 'Submitting feedback...' });

    try {
        await dataService.createSupportTicket(formState);
        setStatus('sent');
        setTimeout(handleClose, 1500);
    } catch(error) {
        addToast({ type: 'error', title: 'Submission Failed', message: error instanceof Error ? error.message : 'Could not submit your feedback.' });
        setStatus('idle');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState(prev => ({ ...prev, [name]: value as any }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Contact Support</h3>
              <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500"/>
              </button>
            </header>

            <div className="p-6">
              {status === 'sent' ? (
                 <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Feedback Sent!</h3>
                    <p className="text-slate-500 dark:text-slate-400">Thank you for helping us improve.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type of Feedback</label>
                    <select id="type" name="type" value={formState.type} onChange={handleInputChange} className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="feedback">General Feedback</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                    <input type="text" id="subject" name="subject" value={formState.subject} onChange={handleInputChange} required placeholder="A brief summary" className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                    <textarea id="description" name="description" value={formState.description} onChange={handleInputChange} required rows={5} placeholder="Please provide as much detail as possible..." className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                   <div className="flex justify-end pt-2">
                      <button
                          type="submit"
                          disabled={status === 'sending'}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                      >
                          {status === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                          {status === 'sending' ? 'Submitting...' : 'Submit Feedback'}
                      </button>
                  </div>
                </form>
              )}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

export default SupportModal;