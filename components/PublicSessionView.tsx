import React from 'react';
import type { Message } from '../types';
import { Sparkles, Link } from './icons';

interface PublicSessionViewProps {
  sessionData: {
    session_name: string;
    messages: Message[];
  } | null;
}

const PublicSessionView: React.FC<PublicSessionViewProps> = ({ sessionData }) => {
  if (!sessionData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
        <p>Invalid or expired session link.</p>
      </div>
    );
  }

  return (
    <div className="font-sans bg-slate-100 dark:bg-slate-900 min-h-screen">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <header className="mb-8 p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sessionData.session_name}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This is a read-only shared session.</p>
                </div>
                 <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Link className="w-4 h-4"/>
                    <span className="font-semibold">SuperModel AI</span>
                </div>
            </div>
        </header>

        <main className="space-y-6">
          {sessionData.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </main>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  if (message.role === 'system') return null; // Don't show system messages

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-xl p-4 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-lg'
            : 'bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-lg'
        }`}
      >
        <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
        {message.skill_packs_used && message.skill_packs_used.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.skill_packs_used.map((skill) => (
              <span key={skill} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium dark:bg-blue-900/60 dark:text-blue-300">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSessionView;