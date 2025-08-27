import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Message, SkillPack, Session } from '../types.ts';
import { Send, Sparkles, Bot, Loader2, Zap, Lightbulb, Code, Maximize, Download, ExternalLink, RefreshCw, Tablet, Smartphone, Laptop, X, PlusCircle, Share2, Edit, Trash2, Paperclip, Globe } from './icons.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal.tsx';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

// --- Helper Functions for Code Execution ---
const hasCode = (content: string) => {
    const hasHtml = /```html/.test(content);
    const hasCss = /```css/.test(content);
    const hasJs = /```(javascript|js)/.test(content);
    return hasHtml && hasCss && hasJs;
};

const parseMessageContent = (content: string) => {
  const codeBlocks: {html: string, css: string, js: string} = { html: '', css: '', js: '' };
  let remainingText = content;

  const extract = (lang: 'html' | 'css' | 'js', regex: RegExp) => {
    const match = remainingText.match(regex);
    if (match) {
      codeBlocks[lang] = match[1] || '';
      remainingText = remainingText.replace(match[0], '').trim();
    }
  };

  extract('html', /```html\n([\s\S]*?)```/);
  extract('css', /```css\n([\s\S]*?)```/);
  extract('js', /```(?:javascript|js)\n([\s\S]*?)```/);

  return { ...codeBlocks, text: remainingText };
};


const createSrcDoc = (html: string, css: string, js: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- Core libraries for React (UMD builds that create globals) -->
      <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
      
      <!-- Babel for in-browser JSX/ES6 transpilation -->
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          color: #111;
        }
        ${css}
      </style>
    </head>
    <body>
      <div id="error-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; padding: 10px; background-color: #ffdddd; color: #d8000c; z-index: 9999; font-family: monospace; font-size: 14px; border-bottom: 2px solid #d8000c;"></div>
      
      <!-- AI-generated HTML is injected here -->
      ${html}

      <!-- A fallback root element for React if not provided in the HTML above -->
      <div id="root"></div>
      
      <!-- The user's script is now transpiled by Babel -->
      <script type="text/babel" data-presets="react,es2015-loose">
        // --- Global Error Catcher ---
        // This catches runtime errors after Babel transpilation
        window.addEventListener('error', function(event) {
          var overlay = document.getElementById('error-overlay');
          if (overlay) {
            overlay.textContent = 'Runtime Error: ' + event.message + ' at line ' + event.lineno;
            overlay.style.display = 'block';
          }
        });
        
        // This try-catch is for synchronous errors during initial execution
        try {
          // --- User's JavaScript ---
          ${js}
        } catch (e) {
          var overlay = document.getElementById('error-overlay');
          if (overlay && e instanceof Error) {
            overlay.textContent = 'Execution Error: ' + e.message;
            overlay.style.display = 'block';
          }
        }
      </script>
    </body>
    </html>
  `;
};

// Simple Markdown Renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const renderContent = () => {
        // Split by code blocks first
        const parts = content.split(/(```[\s\S]*?```)/g);
        
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                const lang = part.match(/```(\w*)/)?.[1] || '';
                const code = part.replace(/```\w*\n?/, '').replace(/```/, '');
                return (
                    <pre key={index} className="bg-slate-800 dark:bg-black/50 text-white p-3 rounded-md my-2 font-mono text-sm overflow-x-auto">
                        <code>{code}</code>
                    </pre>
                );
            }
            
            // Process non-code parts
            const lines = part.split('\n');
            const elements = [];
            let isList = false;

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                
                // Unordered lists
                if (line.match(/^(\s*)\* (.*)/)) {
                    if (!isList) {
                        elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2"></ul>);
                        isList = true;
                    }
                    const match = line.match(/^(\s*)\* (.*)/);
                    elements[elements.length - 1].props.children.push(<li key={i}>{match[2]}</li>);
                    continue;
                } else {
                    isList = false;
                }

                // Bold text
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                if(line.trim() === '') {
                    elements.push(<br key={i}/>)
                } else {
                    elements.push(<span key={i} dangerouslySetInnerHTML={{ __html: line }} />);
                }
            }
            
            return <div key={index}>{elements}</div>;
        });
    };

    return <>{renderContent()}</>;
};



interface ChatProps {
  sessionId: string | null;
  sessionName?: string;
  messages: Message[];
  skillPacks: SkillPack[];
  isLoading: boolean;
  sendMessage: (content: string, skipRecommendation: boolean, imageData: string | null) => void;
  updateMessage: (sessionId: string, messageId: string, newContent: string) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  toggleSkillPack: (id: string) => void;
  // FIX: Update handleSkillAction signature to match App.tsx implementation.
  handleSkillAction: (skill: SkillPack, originalPrompt: string, sessionId: string, isAuto: boolean) => void;
  onRegenerate: () => void;
  onStop: () => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  startNewSession: () => void;
  openShareModal: (content: string) => void;
  openSessionShareModal: () => void;
  initialPrompt?: string | null;
  clearInitialPrompt: () => void;
}

const Chat: React.FC<ChatProps> = ({ sessionId, sessionName, messages, skillPacks, isLoading, sendMessage, updateMessage, deleteMessage, toggleSkillPack, handleSkillAction, onRegenerate, onStop, updateSession, startNewSession, openShareModal, openSessionShareModal, initialPrompt, clearInitialPrompt }) => {
  const [input, setInput] = useState('');
  const [editingName, setEditingName] = useState(sessionName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSkillPacks = skillPacks.filter(sp => sp.isActive);
  const isSendDisabled = isLoading || (!input.trim() && !imagePreviewUrl);

  useEffect(() => {
    if (initialPrompt) {
        setInput(initialPrompt);
        clearInitialPrompt();
    }
  }, [initialPrompt, clearInitialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (sessionName) {
        setEditingName(sessionName);
    }
  }, [sessionName]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
     if (!isSendDisabled) {
        sendMessage(input.trim(), false, imagePreviewUrl);
        setInput('');
        setImagePreviewUrl(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNameSave = () => {
    if (sessionId && editingName && editingName.trim() !== sessionName) {
        updateSession(sessionId, { name: editingName.trim() });
    }
    setIsEditingName(false);
  };
  
  const handleNameKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleNameSave();
    } else if (e.key === 'Escape') {
        setEditingName(sessionName || '');
        setIsEditingName(false);
    }
  };
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessage({ id: message.id, content: message.content });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = () => {
    if (editingMessage && sessionId) {
        updateMessage(sessionId, editingMessage.id, editingMessage.content);
    }
    setEditingMessage(null);
  };
  
  const handleConfirmDelete = () => {
    if (messageToDelete && sessionId) {
        deleteMessage(sessionId, messageToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setMessageToDelete(null);
  };

  return (
    <>
    <div className="flex h-full bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 group">
              {isEditingName && sessionId ? (
                  <input
                    ref={nameInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={handleNameKeydown}
                    className="font-bold text-lg text-slate-900 dark:text-slate-100 bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                  />
              ) : (
                <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
                  {sessionName || "New Chat"}
                </h1>
              )}
              {sessionId && !isEditingName && (
                <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-600 dark:hover:text-blue-400">
                    <Edit className="w-4 h-4"/>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {activeSkillPacks.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span className="truncate">Using {activeSkillPacks.map(sp => sp.name).join(', ')}</span>
                </span>
              )}
               {messages.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
                      {messages.length} messages
                  </span>
              )}
            </div>
          </div>
           <div className="flex items-center gap-2 flex-shrink-0">
            {messages.length > 0 && (
                <button
                    onClick={openSessionShareModal}
                    title="Share Session"
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
                >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                </button>
            )}
            { (sessionName && sessionName !== "New Chat") && (
              <button
                onClick={() => startNewSession()}
                title="Start New Chat"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors text-sm flex-shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-900">
          {messages.length === 0 ? (
             <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Ready to Assist!</h2>
                  <p className="text-base text-slate-600 dark:text-slate-400 mb-6">
                    Start a conversation, and I'll help you out or recommend a skill if one is needed.
                  </p>
                </div>
              </div>
          ) : (
            messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isLastAssistantMessage = isLastMessage && message.role === 'assistant' && !message.recommendation;

                if (message.recommendation) {
                    // FIX: Wrap handleSkillAction to provide sessionId and isAuto=false.
                    const onRecommendationAction = (skill: SkillPack, originalPrompt: string) => {
                        if (sessionId) {
                            handleSkillAction(skill, originalPrompt, sessionId, false);
                        }
                    };
                    return <RecommendationBubble key={message.id} message={message} onAction={onRecommendationAction} isLoading={isLoading} />;
                }
                if (message.role === 'system') {
                    return <SystemMessageBubble key={message.id} message={message} />;
                }
                if (message.role === 'assistant' && hasCode(message.content)) {
                    return <CodeExecutionBubble key={message.id} message={message} />;
                }
                return <MessageBubble 
                            key={message.id} 
                            message={message} 
                            isLoading={isLoading}
                            isLastMessage={isLastMessage}
                            isLastAssistantMessage={isLastAssistantMessage}
                            isEditing={editingMessage?.id === message.id}
                            editingContent={editingMessage?.content || ''}
                            onEditingContentChange={(content) => setEditingMessage(prev => prev ? {...prev, content} : null)}
                            onEdit={() => handleStartEdit(message)}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onDelete={() => { setMessageToDelete(message); setIsDeleteModalOpen(true); }}
                            onShare={openShareModal}
                            onRegenerate={onRegenerate}
                        />;
            })
          )}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
             <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
           {isLoading && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={onStop}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-slate-600 dark:bg-slate-300 rounded-sm"></div>
                  Stop Generating
                </button>
              </div>
            )}
             {imagePreviewUrl && (
                <div className="relative w-24 h-24 mb-2 p-1 border-2 border-slate-300 dark:border-slate-600 rounded-lg">
                    <img src={imagePreviewUrl} alt="Image preview" className="w-full h-full object-cover rounded" />
                    <button 
                        onClick={() => { setImagePreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
          <div className="relative">
             <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2.5 left-2.5 w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Attach Image"
                >
                <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything, or attach an image..."
              className="w-full min-h-[52px] max-h-[200px] pr-14 pl-14 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-transparent dark:text-slate-100 resize-none"
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={handleSubmit}
              disabled={isSendDisabled}
              className="absolute bottom-2.5 right-2.5 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              title="Send Message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">Press Enter to send, Shift+Enter for a new line.</p>
        </div>
      </div>

      {/* Skill Pack Sidebar */}
      <div className="w-72 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex-col hidden lg:flex">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Active Skills</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activeSkillPacks.length} loaded</p>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {skillPacks.filter(sp => sp.isInstalled).length > 0 ? (
            skillPacks.filter(sp => sp.isInstalled).map(skillPack => (
              <SkillActivationCard key={skillPack.id} skillPack={skillPack} onToggle={toggleSkillPack} />
            ))
          ) : (
            <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-8">
                <p>No skills installed.</p>
                <p>Visit the Marketplace to add new capabilities.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Message"
        description="Are you sure you want to permanently delete this message? This action cannot be undone."
        confirmText="Delete"
        icon={Trash2}
        variant="danger"
    />
    </>
  );
};

const MessageBubble: React.FC<{ 
    message: Message; 
    isLoading: boolean; 
    isLastMessage: boolean; 
    isLastAssistantMessage?: boolean;
    isEditing: boolean;
    editingContent: string;
    onEditingContentChange: (content: string) => void;
    onEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onShare: (content: string) => void;
    onRegenerate?: () => void;
}> = React.memo(({ message, isLoading, isLastMessage, isLastAssistantMessage, isEditing, editingContent, onEditingContentChange, onEdit, onSaveEdit, onCancelEdit, onDelete, onShare, onRegenerate }) => {
    const isUser = message.role === 'user';
    const isStreaming = isLastMessage && message.role === 'assistant' && isLoading;

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
            )}
            <div className={`max-w-xl p-4 rounded-2xl shadow-sm group relative ${
                isUser 
                ? 'bg-blue-600 text-white rounded-br-lg' 
                : 'bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-lg'
            }`}>
                {message.image_data && (
                    <img src={message.image_data} alt="User upload" className="rounded-lg mb-2 max-h-64" />
                )}

                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editingContent}
                            onChange={(e) => onEditingContentChange(e.target.value)}
                            className="w-full min-h-[80px] p-2 rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={onCancelEdit} className="px-3 py-1 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-100">Cancel</button>
                            <button onClick={onSaveEdit} className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap text-base leading-relaxed">
                        {isUser ? message.content : <MarkdownRenderer content={message.content} />}
                        {isStreaming && <span className="streaming-cursor" />}
                    </div>
                )}
                
                {/* FIX: Use skill_packs_used instead of skillPacksUsed */}
                {message.skill_packs_used && message.skill_packs_used.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {message.skill_packs_used.map(skill => (
                    <span key={skill} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium dark:bg-blue-900/60 dark:text-blue-300">
                        {skill}
                    </span>
                    ))}
                </div>
                )}

                {message.grounding_chunks && message.grounding_chunks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-300 mb-2">
                            <Globe className="w-3.5 h-3.5" />
                            Sources
                        </h4>
                        <div className="space-y-1.5">
                            {message.grounding_chunks.map((chunk, index) => (
                                <a
                                    key={index}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-blue-600 hover:underline dark:text-blue-400 truncate"
                                >
                                    {index + 1}. {chunk.web.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                    {isUser && !isEditing && (
                         <>
                            <button onClick={onEdit} className="p-1.5 bg-white dark:bg-slate-600 rounded-full border border-slate-200 dark:border-slate-500 shadow-sm" title="Edit"><Edit className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" /></button>
                            <button onClick={onDelete} className="p-1.5 bg-white dark:bg-slate-600 rounded-full border border-slate-200 dark:border-slate-500 shadow-sm" title="Delete"><Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" /></button>
                         </>
                    )}
                    {!isUser && message.content && !isStreaming && (
                        <>
                            {isLastAssistantMessage && !isLoading && onRegenerate && (
                                <button
                                    onClick={onRegenerate}
                                    className="p-1.5 bg-white dark:bg-slate-600 rounded-full border border-slate-200 dark:border-slate-500 shadow-sm"
                                    title="Regenerate response"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                                </button>
                            )}
                            <button
                                onClick={() => onShare(message.content)}
                                className="p-1.5 bg-white dark:bg-slate-600 rounded-full border border-slate-200 dark:border-slate-500 shadow-sm"
                                title="Share or Export"
                            >
                                <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

const SystemMessageBubble: React.FC<{ message: Message }> = ({ message }) => (
    <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-2">
        <p>{message.content}</p>
    </div>
);

const RecommendationBubble: React.FC<{ message: Message, onAction: (skill: SkillPack, prompt: string) => void, isLoading: boolean }> = ({ message, onAction, isLoading }) => {
    const skill = message.recommendation!;
    const originalPrompt = message.originalPrompt!;
    const actionText = skill.isInstalled ? 'Activate & Continue' : 'Install & Continue';

    return (
        <div className="flex items-start gap-3 justify-start">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-xl bg-white dark:bg-slate-700 rounded-2xl rounded-bl-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
                <div className="p-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Skill Recommendation</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{message.content}</p>
                    
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-600/50 border border-slate-200 dark:border-slate-600 flex items-center gap-3">
                         <div className="text-3xl flex-shrink-0 w-8 text-center">{skill.icon}</div>
                         <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{skill.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{skill.description}</p>
                        </div>
                    </div>
                </div>
                 <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
                    <button 
                        onClick={() => onAction(skill, originalPrompt)}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors text-sm disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : actionText}
                    </button>
                </div>
            </div>
        </div>
    )
};


const SkillActivationCard: React.FC<{ skillPack: SkillPack, onToggle: (id: string) => void }> = ({ skillPack, onToggle }) => (
    <div className={`p-3 rounded-lg border-2 transition-colors ${skillPack.isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500/50' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-center gap-3">
            <div className="text-2xl w-8 text-center">{skillPack.icon}</div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                    {skillPack.name}
                    {skillPack.skill_type === 'code-enhanced' && <span title="Code-Enhanced Skill"><Zap className="w-4 h-4 text-amber-500" /></span>}
                    {skillPack.low_latency && <span title="Low Latency Mode">âš¡ï¸ </span>}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                   <span className="capitalize px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 font-mono text-[10px]">
                      {skillPack.provider}
                   </span>
                   <span>
                    Cost: {skillPack.provider === 'local' ? 'Free' : skillPack.cost_per_1k_tokens < 0.001 ? '<0.01' : (skillPack.cost_per_1k_tokens * 10).toFixed(2)}Â¢ / 10k tokens
                   </span>
                </div>
            </div>
        </div>
        <button
            onClick={() => onToggle(skillPack.id)}
            className={`w-full mt-3 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                skillPack.isActive 
                ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
            {skillPack.isActive ? 'Deactivate' : 'Activate'}
        </button>
    </div>
);


// --- New Code Execution Components ---

const CodeExecutionBubble: React.FC<{ message: Message }> = ({ message }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    
    const { html, css, js, text } = useMemo(() => parseMessageContent(message.content), [message.content]);
    const srcDoc = useMemo(() => createSrcDoc(html, css, js), [html, css, js]);

    return (
        <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-xl w-full bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-2xl rounded-bl-lg shadow-sm overflow-hidden">
                <div className="p-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Code className="w-5 h-5 text-blue-500"/> Interactive Application</h4>
                    {text && <p className="whitespace-pre-wrap text-base leading-relaxed mt-2">{text}</p>}
                </div>
                
                <div className="aspect-video bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-600">
                     <iframe
                        srcDoc={srcDoc}
                        title="Live code preview"
                        sandbox="allow-scripts allow-modals allow-forms"
                        className="w-full h-full border-0"
                    />
                </div>

                {showCode && (
                     <div className="border-b border-slate-200 dark:border-slate-600">
                        <div className="flex border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                            <TabButton active={activeTab === 'html'} onClick={() => setActiveTab('html')}>HTML</TabButton>
                            <TabButton active={activeTab === 'css'} onClick={() => setActiveTab('css')}>CSS</TabButton>
                            <TabButton active={activeTab === 'js'} onClick={() => setActiveTab('js')}>JS</TabButton>
                        </div>
                        <div className="bg-slate-900 text-white p-3 max-h-60 overflow-y-auto font-mono text-sm">
                            <pre><code>{activeTab === 'html' ? html : activeTab === 'css' ? css : js}</code></pre>
                        </div>
                    </div>
                )}
                
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
                    <ActionButton onClick={() => setIsModalOpen(true)} icon={Maximize} label="Expand" />
                    <ActionButton onClick={() => setShowCode(!showCode)} icon={Code} label={showCode ? "Hide Code" : "Show Code"} />
                </div>
            </div>

            <PreviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} html={html} css={css} js={js} />
        </div>
    );
};

const PreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; html: string; css: string; js: string; }> = ({ isOpen, onClose, html, css, js }) => {
    const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [refreshKey, setRefreshKey] = useState(0);
    const srcDoc = useMemo(() => createSrcDoc(html, css, js), [html, css, js, refreshKey]);

    const viewportSizes = {
        desktop: '100%',
        tablet: '768px',
        mobile: '375px',
    };

    const handleDownload = () => {
        const fullHtml = createSrcDoc(html, css, js);
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleOpenInNewTab = () => {
        const fullHtml = createSrcDoc(html, css, js);
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={onClose}
                >
                    <MotionDiv
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl w-full h-full flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between p-2 pl-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex-shrink-0">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Live Application Preview</h3>
                            <div className="flex items-center gap-2">
                                <ViewportButton icon={Laptop} active={viewport==='desktop'} onClick={() => setViewport('desktop')} />
                                <ViewportButton icon={Tablet} active={viewport==='tablet'} onClick={() => setViewport('tablet')} />
                                <ViewportButton icon={Smartphone} active={viewport==='mobile'} onClick={() => setViewport('mobile')} />
                            </div>
                            <div className="flex items-center gap-1">
                                <ActionButton icon={RefreshCw} label="Refresh" onClick={() => setRefreshKey(k => k + 1)} />
                                <ActionButton icon={ExternalLink} label="Open in New Tab" onClick={handleOpenInNewTab} />
                                <ActionButton icon={Download} label="Download" onClick={handleDownload} />
                                <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
                                    <X className="w-5 h-5"/>
                                </button>
                            </div>
                        </header>
                        <main className="flex-1 p-4 bg-slate-200 dark:bg-slate-900 flex justify-center items-center">
                            <MotionDiv 
                                className="bg-white dark:bg-slate-800 shadow-lg rounded-md overflow-hidden transition-all duration-300"
                                animate={{ width: viewportSizes[viewport] }}
                            >
                                <iframe
                                    key={refreshKey}
                                    srcDoc={srcDoc}
                                    title="Live code preview modal"
                                    sandbox="allow-scripts allow-modals allow-forms"
                                    className="w-full h-[85vh] border-0"
                                />
                            </MotionDiv>
                        </main>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

// --- UI Components for Code Execution Bubble ---

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}>
        {children}
    </button>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ElementType; label: string }> = ({ onClick, icon: Icon, label }) => (
    <button onClick={onClick} title={label} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors">
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const ViewportButton: React.FC<{ onClick: () => void; icon: React.ElementType; active: boolean }> = ({ onClick, icon: Icon, active }) => (
     <button onClick={onClick} className={`p-2 rounded-md transition-colors ${active ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
        <Icon className="w-5 h-5" />
    </button>
);


export default Chat;