import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, Loader2, CheckCircle } from './icons';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => Promise<string | null>;
}

const ShareSessionModal: React.FC<ShareSessionModalProps> = ({ isOpen, onClose, onShare }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCreateLink = async () => {
    setStatus('loading');
    const url = await onShare();
    if (url) {
      setShareUrl(url);
      setStatus('success');
    } else {
      // Handle error case (e.g., show an error message)
      setStatus('idle');
    }
  };

  const handleCopyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after a delay to allow for exit animation
    setTimeout(() => {
        setStatus('idle');
        setShareUrl(null);
        setCopySuccess(false);
    }, 300);
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
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Share Session</h3>
              <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500"/>
              </button>
            </header>

            <div className="p-6">
                {status === 'idle' && (
                    <>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Generate a public, read-only link to share this conversation with others.
                        </p>
                        <button
                            onClick={handleCreateLink}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
                        >
                           <Link className="w-4 h-4"/>
                           Create Public Link
                        </button>
                    </>
                )}
                {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center h-24">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Generating link...</p>
                    </div>
                )}
                 {status === 'success' && shareUrl && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                           <CheckCircle className="w-5 h-5"/>
                           <p className="font-medium">Your share link is ready!</p>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                           <input type="text" readOnly value={shareUrl} className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none"/>
                           <button onClick={handleCopyToClipboard} className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700">
                             {copySuccess ? 'Copied!' : 'Copy'}
                           </button>
                        </div>
                    </div>
                )}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

export default ShareSessionModal;
