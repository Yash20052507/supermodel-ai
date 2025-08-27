import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, ChevronLeft, Send, FileText, MessageCircle, Loader2 } from './icons';
import { useToast } from '../hooks/useToast';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

declare const gapi: any;

interface ApiKeys {
    googleClientId?: string;
    googleApiKey?: string;
}
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  apiKeys: ApiKeys;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, content, apiKeys }) => {
  const [view, setView] = useState<'list' | 'email' | 'drive'>('list');
  const { addToast } = useToast();
  
  // Reset view when modal is closed/reopened
  useEffect(() => {
    if (isOpen) {
      setView('list');
    }
  }, [isOpen]);

  const handleSendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;

    if (!to) {
      addToast({ type: 'warning', title: 'Recipient missing', message: 'Please enter an email address to continue.' });
      return;
    }

    const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      window.open(mailtoLink, '_self');
      addToast({ type: 'success', title: 'Action complete', message: 'Your default email client has been opened.' });
      onClose();
    } catch (error) {
      addToast({ type: 'error', title: 'Could not open email client', message: 'Please check your browser settings and pop-up blocker.' });
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                {view !== 'list' && (
                    <button onClick={() => setView('list')} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-500"/>
                    </button>
                )}
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {view === 'list' ? 'Share Content' : view === 'email' ? 'Send as Email' : 'Save to Google Drive'}
                </h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500"/>
              </button>
            </header>

            <AnimatePresence mode="wait">
                <MotionDiv
                    key={view}
                    initial={{ opacity: 0, x: view !== 'list' ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: view !== 'list' ? -50 : 50 }}
                    transition={{ duration: 0.2 }}
                >
                    {view === 'list' && (
                        <div className="p-6 space-y-3">
                            <IntegrationButton icon={Mail} label="Send as Email" onClick={() => setView('email')} />
                            <IntegrationButton icon={FileText} label="Save to Google Drive" onClick={() => setView('drive')} />
                            <IntegrationButton icon={MessageCircle} label="Post to Slack (Coming Soon)" onClick={() => {}} disabled />
                        </div>
                    )}

                    {view === 'email' && (
                        <form onSubmit={handleSendEmail} className="p-6 space-y-4">
                            <FormInput id="to" name="to" label="To" type="email" placeholder="recipient@example.com" required />
                            <FormInput id="subject" name="subject" label="Subject" type="text" placeholder="Regarding our conversation..." defaultValue={`From SuperModel AI: A shared message`} required />
                            <div>
                                <label htmlFor="body" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Body</label>
                                <textarea
                                    id="body"
                                    name="body"
                                    rows={8}
                                    defaultValue={content}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    Open in Email Client
                                </button>
                            </div>
                        </form>
                    )}
                    {view === 'drive' && (
                       <DriveView content={content} onClose={onClose} apiKeys={apiKeys} />
                    )}
                </MotionDiv>
            </AnimatePresence>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

const DriveView: React.FC<{content: string, onClose: () => void, apiKeys: ApiKeys}> = ({ content, onClose, apiKeys }) => {
    const [status, setStatus] = useState<'idle' | 'loading_gapi' | 'needs_auth' | 'authing' | 'saving' | 'saved'>('loading_gapi');
    const { addToast } = useToast();
    const gapiInitialized = React.useRef(false);

    const initGapiClient = useCallback(() => {
        gapi.client.init({
            apiKey: apiKeys.googleApiKey,
            clientId: apiKeys.googleClientId,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            scope: 'https://www.googleapis.com/auth/drive.file'
        }).then(() => {
            const authInstance = gapi.auth2.getAuthInstance();
            authInstance.isSignedIn.listen(updateSigninStatus);
            updateSigninStatus(authInstance.isSignedIn.get());
        }).catch((err: any) => {
             addToast({ type: 'error', title: 'GAPI Init Failed', message: 'Could not initialize Google API. Check keys in settings.'});
             setStatus('idle');
        });
    }, [apiKeys.googleApiKey, apiKeys.googleClientId, addToast]);

    const updateSigninStatus = (isSignedIn: boolean) => {
        setStatus(isSignedIn ? 'idle' : 'needs_auth');
    };

    useEffect(() => {
        if (!apiKeys.googleClientId || !apiKeys.googleApiKey) {
             addToast({ type: 'error', title: 'Missing Keys', message: 'Please set Google Cloud Client ID and API Key in settings.' });
             setStatus('idle');
             return;
        }

        if (gapiInitialized.current) {
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            gapi.load('client:auth2', initGapiClient);
            gapiInitialized.current = true;
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        }
    }, [initGapiClient, apiKeys, addToast]);
    
    const handleSignIn = () => {
        setStatus('authing');
        gapi.auth2.getAuthInstance().signIn();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const filename = formData.get('filename') as string;

        setStatus('saving');
        
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
            name: filename,
            mimeType: 'application/vnd.google-apps.document',
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/plain\r\n\r\n' +
            content +
            close_delim;
        
        try {
            const request = gapi.client.request({
                path: 'https://www.googleapis.com/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'multipart' },
                headers: {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                },
                body: multipartRequestBody,
            });

            await request;
            setStatus('saved');
            addToast({ type: 'success', title: 'File Saved!', message: `${filename} saved to your Google Drive.` });
            setTimeout(onClose, 1500);

        } catch(err: any) {
             addToast({ type: 'error', title: 'Save Failed', message: err.result?.error?.message || 'Could not save file to Google Drive.' });
             setStatus('idle');
        }
    };
    
    if (status === 'loading_gapi') {
        return <div className="p-6 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500" /></div>
    }
    
    if (status === 'needs_auth' || status === 'authing') {
         return (
             <div className="p-6 text-center">
                 <p className="text-slate-600 dark:text-slate-400 mb-4">Please sign in with Google to save to Drive.</p>
                 <button onClick={handleSignIn} disabled={status === 'authing'} className="w-48 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-wait mx-auto">
                    {status === 'authing' ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Sign in with Google'}
                 </button>
             </div>
         )
    }

    return (
        <form onSubmit={handleSave} className="p-6 space-y-4">
            <FormInput id="filename" name="filename" label="File Name" type="text" placeholder="My AI Document" defaultValue={`AI Session - ${new Date().toLocaleDateString()}`} required />
             <div>
                <label htmlFor="drive-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                <textarea
                    id="drive-content"
                    name="drive-content"
                    rows={8}
                    readOnly
                    value={content}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700/50 dark:text-slate-300 focus:outline-none"
                />
            </div>
             <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={status !== 'idle'}
                    className="w-32 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                    {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
                    {status === 'saved' && 'Saved!'}
                    {status === 'idle' && 'Save'}
                </button>
            </div>
        </form>
    );
};


const IntegrationButton: React.FC<{ icon: React.ElementType, label: string, onClick: () => void, disabled?: boolean }> = ({ icon: Icon, label, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center gap-4 p-4 rounded-lg text-left font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        <Icon className="w-6 h-6 text-blue-500" />
        <span>{label}</span>
    </button>
);

const FormInput: React.FC<{ id: string, name: string, label: string, type: string, placeholder: string, required?: boolean, defaultValue?: string }> = ({ id, name, label, type, placeholder, required, defaultValue }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <input
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            required={required}
            defaultValue={defaultValue}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);


export default ShareModal;