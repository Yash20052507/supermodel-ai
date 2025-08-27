import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Page, Session as AppSession, SkillPack, Message, TaskProgress, User, SessionTemplate, SkillPackReview, CustomProvider } from './types.ts';
import * as dataService from './services/dataService.ts';
import { generateResponseStream, recommendSkill, postprocessResponse } from './services/apiService.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './services/supabaseClient.ts';
import type { Database } from './services/supabaseClient.ts';

import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import Chat from './components/Chat.tsx';
import Marketplace from './components/Marketplace.tsx';
import Sessions from './components/Sessions.tsx';
import Settings from './components/Settings.tsx';
import BuildSkillPack from './components/BuildSkillPack.tsx';
import AuthModal from './components/Auth.tsx';
import ShareModal from './components/ShareModal.tsx';
import { Loader2 } from './components/icons.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { useToast } from './hooks/useToast.ts';


// New components
import OnboardingTour from './components/OnboardingTour.tsx';
import Analytics from './components/Analytics.tsx';
import PublicSessionView from './components/PublicSessionView.tsx';
import ShareSessionModal from './components/ShareSessionModal.tsx';
import LandingPage from './components/LandingPage.tsx';
import LegalModal from './components/LegalModal.tsx';
import SkillDetail from './components/SkillDetail.tsx';
import Admin from './components/Admin.tsx';
import SupportModal from './components/SupportModal.tsx';
import CommandPalette from './components/CommandPalette.tsx';
import Header from './components/Header.tsx';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;
const GENERAL_SKILL_ID = "68415a52-ced4-4aeb-b1aa-01f000000000";

interface ApiKeys {
    google?: string;
    openai?: string;
    anthropic?: string;
    googleClientId?: string;
    googleApiKey?: string;
}

interface OnboardingState {
  completed: {
    setApiKey: boolean;
    installSkill: boolean;
    startChat: boolean;
  };
  dismissed: boolean;
}

const getInitialOnboardingState = (): OnboardingState => {
  try {
    const saved = localStorage.getItem('onboarding_checklist');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure the structure is valid
      return {
        completed: {
          setApiKey: !!parsed.completed?.setApiKey,
          installSkill: !!parsed.completed?.installSkill,
          startChat: !!parsed.completed?.startChat,
        },
        dismissed: !!parsed.dismissed,
      };
    }
  } catch (e) {
    console.error('Failed to parse onboarding state from localStorage', e);
  }
  return {
    completed: {
      setApiKey: false,
      installSkill: false,
      startChat: false,
    },
    dismissed: false,
  };
};


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sessions, setSessions] = useState<AppSession[]>([]);
  const [skillPacks, setSkillPacks] = useState<SkillPack[]>([]);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For AI responses
  const [isAppLoading, setIsAppLoading] = useState(true); // For initial data load
  const [tasks, setTasks] = useState<TaskProgress[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('supermodel_theme') as 'light' | 'dark') || 'dark');
  const [user, setUser] = useState<User | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [shareModalConfig, setShareModalConfig] = useState<{ isOpen: boolean; content: string | null }>({ isOpen: false, content: null });
  const { addToast } = useToast();
  const abortController = useRef<AbortController | null>(null);
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    try {
        const storedKeys = localStorage.getItem('supermodel_api_keys');
        return storedKeys ? JSON.parse(storedKeys) : {};
    } catch (e) {
        return {};
    }
  });

  const [customProviders, setCustomProviders] = useState<CustomProvider[]>(() => {
    try {
        const stored = localStorage.getItem('supermodel_custom_providers');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
  });

  // State for providing instant UI feedback in settings
  const [settingsDraft, setSettingsDraft] = useState<Partial<User> | null>(null);
  
  // State for the API Key Banner
  const [isApiBannerDismissed, setIsApiBannerDismissed] = useState(sessionStorage.getItem('apiBannerDismissed') === 'true');
  
  // State for Onboarding Checklist
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(getInitialOnboardingState);
  
  useEffect(() => {
    localStorage.setItem('onboarding_checklist', JSON.stringify(onboardingState));
  }, [onboardingState]);

  useEffect(() => {
    const hasAnyKey = Object.values(apiKeys).some(key => !!key) || customProviders.length > 0;
    if (hasAnyKey && !onboardingState.completed.setApiKey) {
      setOnboardingState(prev => ({ ...prev, completed: { ...prev.completed, setApiKey: true } }));
    }
  }, [apiKeys, customProviders, onboardingState.completed.setApiKey]);


  const showApiKeyBanner = useMemo(() => {
    if (isApiBannerDismissed) return false;
    const hasGoogleKey = !!apiKeys.google;
    const hasOpenAIKey = !!apiKeys.openai;
    const hasAnthropicKey = !!apiKeys.anthropic;
    const hasCustomProviders = customProviders.length > 0;
    return !hasGoogleKey && !hasOpenAIKey && !hasAnthropicKey && !hasCustomProviders;
  }, [apiKeys, customProviders, isApiBannerDismissed]);

  const handleDismissApiBanner = () => {
      sessionStorage.setItem('apiBannerDismissed', 'true');
      setIsApiBannerDismissed(true);
  };

  useEffect(() => {
    try {
        localStorage.setItem('supermodel_api_keys', JSON.stringify(apiKeys));
    } catch (e) {
        console.error("Could not save API keys to local storage.", e);
    }
  }, [apiKeys]);

   useEffect(() => {
    try {
        localStorage.setItem('supermodel_custom_providers', JSON.stringify(customProviders));
    } catch (e) {
        console.error("Could not save custom providers to local storage.", e);
    }
  }, [customProviders]);


  // New states for features
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sharedSessionData, setSharedSessionData] = useState<{ session_name: string; messages: Message[] } | null>(null);
  const [isCheckingShare, setIsCheckingShare] = useState(true);
  const [shareSessionModalOpen, setShareSessionModalOpen] = useState(false);
  const [pendingInitialPrompt, setPendingInitialPrompt] = useState<string | null>(null);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  
  // States for Landing Page / Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'signup'>('login');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<{ title: string, content: string } | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);


  // --- Feature: Public Share Link Handling ---
  useEffect(() => {
    const checkSharedSession = async () => {
        const params = new URLSearchParams(window.location.search);
        const shareId = params.get('share');
        if (shareId) {
            try {
                const data = await dataService.getSharedSession(shareId);
                setSharedSessionData(data);
            } catch (error) {
                console.error("Error fetching shared session:", error);
                addToast({ type: 'error', title: 'Error', message: 'Could not load the shared session.' });
            }
        }
        setIsCheckingShare(false);
    };
    checkSharedSession();
  }, [addToast]);
  
  // --- Feature: Command Palette Keybinding ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            setIsCommandPaletteOpen(open => !open);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- Feature: Service Worker for Push Notifications ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered: ', registration);
          })
          .catch(registrationError => {
            console.log('Service Worker registration failed: ', registrationError);
          });
      });
    }
  }, []);

  useEffect(() => {
    // Listen for auth state changes. This also fires immediately with the current session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      if (session) {
        setIsAuthModalOpen(false);
      } else {
        // If there's no session, we can stop the main app loading.
        setIsAppLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const initializeUserAndData = async () => {
        if (supabaseSession) {
            setIsAppLoading(true);
            try {
                await dataService.ensureUserProfileExists();
                let fetchedUser = await dataService.getUserProfile(supabaseSession.user.id);

                if (fetchedUser) {
                  let userToSet = fetchedUser;
                  // SUPER ADMIN & SECURITY CHECK:
                  // Ensures the 'isCreator' flag is correctly set for the super admin.
                  const isSuperAdminEmail = fetchedUser.email === 'yashsoni20052507@gmail.com';
                  if (isSuperAdminEmail && !fetchedUser.isCreator) {
                      // Grant creator status to the super admin if they don't have it.
                      userToSet = await dataService.updateUser(fetchedUser.id, { isCreator: true });
                  }
                  setUser(userToSet);

                  const [fetchedSessions, fetchedSkillPacks, todaysCost] = await Promise.all([
                      dataService.getSessions(userToSet.id),
                      dataService.getSkillPacks(userToSet.id),
                      dataService.getTodaysCost(userToSet.id),
                  ]);
                  
                  setSessions(fetchedSessions);
                  setSkillPacks(fetchedSkillPacks);
                  setTotalCost(todaysCost);
                  // Messages are now loaded on-demand.

                  // --- Feature: Onboarding Tour ---
                  const onboardingCompleted = localStorage.getItem('onboarding_completed');
                  if (!onboardingCompleted) {
                      setShowOnboarding(true);
                  }

                } else {
                  throw new Error("Failed to find or create user profile.");
                }
            } catch (error) {
                console.error("Failed to load initial app data:", error);
                addToast({ type: 'error', title: 'Initialization Error', message: 'Could not load your data. Please try again.' });
                await supabase.auth.signOut();
            } finally {
                setIsAppLoading(false);
            }
        } else {
            setUser(null);
            setSessions([]);
            setSkillPacks([]);
            setAllMessages({});
            // No need to set isAppLoading to false here, handled in session check
        }
    };
    initializeUserAndData();
  }, [supabaseSession, addToast]);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('supermodel_theme', theme);
  }, [theme]);

  const loadMessages = useCallback(async (sessionId: string) => {
    if (allMessages[sessionId]) {
      return; // Already loaded
    }
    try {
      const messages = await dataService.getMessagesForSession(sessionId);
      setAllMessages(prev => ({ ...prev, [sessionId]: messages }));
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Error', message: 'Could not load messages for this session.' });
    }
  }, [allMessages, addToast]);

  const startNewSession = useCallback(async (template?: SessionTemplate) => {
    if (!user) return;
    try {
        const newSessionData = {
            user_id: user.id,
            name: template?.name || 'New Chat',
            last_message: template?.initialPrompt || "Let's get started!",
            timestamp: new Date().toISOString(),
            message_count: template?.initialPrompt ? 1 : 0,
        };
        const newSession = await dataService.createSession(newSessionData);
        setSessions(prev => [newSession, ...prev]);
        
        let initialMessages: Message[] = [];
        if (template?.initialPrompt) {
            const userMessage: Message = {
                id: `temp-user-${Date.now()}`,
                session_id: newSession.id,
                content: template.initialPrompt,
                role: 'user',
                timestamp: new Date().toISOString(),
                is_pinned: false,
            };
            initialMessages.push(userMessage);
            // Save the message to DB
            const { id, recommendation, originalPrompt, ...dbMessage } = userMessage;
            if (dbMessage.role !== 'system') {
              dataService.addMessage(dbMessage as Database['public']['Tables']['messages']['Insert']);
            }
        }

        setAllMessages(prev => ({ ...prev, [newSession.id]: initialMessages }));
        setCurrentSessionId(newSession.id);
        setCurrentPage('chat');
        if (template) {
            setPendingInitialPrompt(template.initialPrompt);
            const updatedPacks = skillPacks.map(p => ({
                ...p,
                isActive: template.skillPackIds.includes(p.id)
            }));
            setSkillPacks(updatedPacks);
        }
        
        if (!onboardingState.completed.startChat) {
          setOnboardingState(prev => ({ ...prev, completed: { ...prev.completed, startChat: true } }));
        }

    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Error', message: 'Could not start a new session.' });
    }
  }, [user, skillPacks, addToast, onboardingState.completed.startChat]);

  const selectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentPage('chat');
    await loadMessages(sessionId);
  }, [loadMessages]);

  const updateSession = async (sessionId: string, updates: Partial<AppSession>) => {
    try {
        const updatedSession = await dataService.updateSession(sessionId, updates);
        setSessions(sessions.map(s => s.id === sessionId ? updatedSession : s));
        addToast({ type: 'success', title: 'Session Updated!' });
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Error', message: 'Could not update session.' });
    }
  };
  
  const deleteSession = async (sessionId: string) => {
    try {
        await dataService.deleteSession(sessionId);
        setSessions(sessions.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
            setCurrentPage('dashboard');
        }
        addToast({ type: 'success', title: 'Session Deleted' });
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Error', message: 'Could not delete session.' });
    }
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // User state will be cleared by onAuthStateChange listener
    setCurrentPage('dashboard');
    setCurrentSessionId(null);
  };
  
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    try {
        const updatedUser = await dataService.updateUser(user.id, updates);
        setUser(updatedUser);
        // Do not add toast here; settings page handles it.
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : "Could not update your profile." });
        throw error; // Re-throw to be caught by the settings page
    }
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
        throw new Error(error.message);
    }
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-user', {
        method: 'POST'
    });
    if (error) {
        throw new Error(error.message);
    }
    // Logout is handled automatically by auth state change
  };

  const handleUpdateMessage = useCallback(async (sessionId: string, messageId: string, newContent: string) => {
      setAllMessages(prev => ({
          ...prev,
          [sessionId]: prev[sessionId].map(m => m.id === messageId ? { ...m, content: newContent } : m)
      }));
      try {
          await dataService.updateMessageContent(messageId, newContent);
      } catch (error) {
          console.error(error);
          addToast({ type: 'error', title: 'Update Failed', message: 'Could not save message changes.' });
          // Note: A full rollback implementation would be more complex. For now, we show an error.
          loadMessages(sessionId); // Refetch to get the correct state
      }
  }, [addToast, loadMessages]);

  const handleDeleteMessage = useCallback(async (sessionId: string, messageId: string) => {
      const originalMessages = allMessages[sessionId];
      setAllMessages(prev => ({
          ...prev,
          [sessionId]: prev[sessionId].filter(m => m.id !== messageId)
      }));
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messageCount: s.messageCount > 0 ? s.messageCount - 1 : 0 } : s));
      try {
          await dataService.deleteMessage(messageId);
      } catch (error) {
          console.error(error);
          addToast({ type: 'error', title: 'Delete Failed', message: 'Could not delete the message.' });
          setAllMessages(prev => ({ ...prev, [sessionId]: originalMessages })); // Rollback
      }
  }, [allMessages, addToast]);
  
    const handlePinMessage = async (sessionId: string, messageId: string, isPinned: boolean) => {
        try {
            // Optimistic UI update
            setAllMessages(prev => ({
                ...prev,
                [sessionId]: prev[sessionId].map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m),
            }));
            await dataService.updateMessagePinnedStatus(messageId, isPinned);
            addToast({ type: 'success', title: isPinned ? 'Message Pinned' : 'Message Unpinned' });
        } catch (error) {
             // Rollback on error
            setAllMessages(prev => ({
                ...prev,
                [sessionId]: prev[sessionId].map(m => m.id === messageId ? { ...m, is_pinned: !isPinned } : m),
            }));
            addToast({ type: 'error', title: 'Error', message: 'Could not update pin status.' });
        }
    };
  
    const handleSkillAction = async (skill: SkillPack, originalPrompt: string, sessionId: string, isAuto: boolean) => {
        if (!user) return;
        
        if (isAuto) {
            const actionText = skill.isInstalled ? 'Activating' : 'Installing and activating';
            const systemMessage: Message = {
                id: `temp-system-${Date.now()}`,
                session_id: sessionId,
                content: `Auto-Pilot: ${actionText} the '${skill.name}' skill to best handle your request.`,
                role: 'system',
                timestamp: new Date().toISOString(),
                is_pinned: false,
            };
            setAllMessages(prev => ({
                ...prev,
                [sessionId]: [...(prev[sessionId] || []), systemMessage]
            }));
        }
        
        if (!skill.isInstalled) {
            await installSkillPack(skill.id);
        }
        toggleSkillPack(skill.id, true);
        sendMessage(originalPrompt, true, null, skill);
    };

  const sendMessage = useCallback(async (content: string, skipRecommendation = false, imageData: string | null = null, overrideSkill?: SkillPack) => {
    if (!user) return;

    setIsLoading(true);
    abortController.current = new AbortController();

    let sessionId = currentSessionId;
    let isNewSession = false;

    // If there's no active session, create one.
    if (!sessionId) {
        isNewSession = true;
        try {
            const newSession = await dataService.createSession({
                user_id: user.id,
                name: 'New Chat',
                last_message: content.substring(0, 100),
                timestamp: new Date().toISOString(),
                message_count: 0,
            });
            setSessions(prev => [newSession, ...prev]);
            setAllMessages(prev => ({ ...prev, [newSession.id]: [] }));
            setCurrentSessionId(newSession.id);
            sessionId = newSession.id;
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', title: 'Error', message: 'Could not start a new session.' });
            setIsLoading(false);
            return;
        }
    }

    if (!sessionId) { // Safeguard
        setIsLoading(false);
        return;
    }

    const userMessage: Message = {
        id: `temp-user-${Date.now()}`,
        session_id: sessionId,
        content: content,
        role: 'user',
        timestamp: new Date().toISOString(),
        image_data: imageData,
        is_pinned: false,
    };

    const conversationHistoryForApi = [...(allMessages[sessionId] || []), userMessage];

    setAllMessages(prev => ({
        ...prev,
        [sessionId!]: conversationHistoryForApi,
    }));
    
    // By removing `is_pinned` from the insert object, we prevent the app from crashing
    // if the column doesn't exist in the database. The DB will use its default value if
    // the column has been migrated, ensuring forward compatibility.
    const { id, recommendation, originalPrompt, is_pinned, ...dbUserMessage } = userMessage;
    const savedUserMessage = await dataService.addMessage(dbUserMessage as Database['public']['Tables']['messages']['Insert']);
    
    // FIX: Update state with the real message from DB to ensure UUID is stored locally
    setAllMessages(prev => ({
        ...prev,
        [sessionId!]: prev[sessionId!].map(m => m.id === userMessage.id ? savedUserMessage : m)
    }));


    let skillsToUse: SkillPack[];

    if (overrideSkill) {
      skillsToUse = [overrideSkill];
    } else {
      skillsToUse = skillPacks.filter(sp => sp.isActive);
    }

    if (skillsToUse.length === 0 && !skipRecommendation) {
        const availableSkills = skillPacks;
        // Pass the last 3 messages for conversational context
        const conversationContext = (allMessages[sessionId!] || []).slice(-4, -1);
        const recommendedSkillId = await recommendSkill(content, conversationContext, availableSkills, apiKeys);
        
        const recommendedSkill = skillPacks.find(sp => sp.id === recommendedSkillId);
        
        if (recommendedSkill && recommendedSkillId !== GENERAL_SKILL_ID) {
            if (isAutoPilot) {
                handleSkillAction(recommendedSkill, content, sessionId, true);
            } else {
                const assistantMessage: Message = {
                    id: `temp-assist-${Date.now()}`,
                    session_id: sessionId,
                    content: `It looks like the '${recommendedSkill.name}' skill could help with this. Would you like to use it?`,
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                    recommendation: recommendedSkill,
                    originalPrompt: content,
                    is_pinned: false,
                };
                setAllMessages(prev => ({ ...prev, [sessionId!]: [...(prev[sessionId!] || []), assistantMessage] }));
                const { id: assistId, recommendation: assistRec, originalPrompt: assistPrompt, is_pinned: assistIsPinned, ...dbAssistantMessage } = assistantMessage;
                if (dbAssistantMessage.role !== 'system') {
                    await dataService.addMessage(dbAssistantMessage as Database['public']['Tables']['messages']['Insert']);
                }
                setIsLoading(false);
            }
            return;
        }
    }
    
    if (skillsToUse.length === 0) {
        const generalSkill = skillPacks.find(sp => sp.id === GENERAL_SKILL_ID);
        if (generalSkill) {
            skillsToUse = [generalSkill];
        } else {
            console.error("General Conversation skill pack is missing.");
            addToast({ type: 'error', title: 'Configuration Error', message: 'The General Conversation skill is missing.' });
            setIsLoading(false);
            return;
        }
    }
    
    const assistantMessage: Message = {
        id: `temp-assist-${Date.now()}`,
        session_id: sessionId,
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        skill_packs_used: skillsToUse.map(sp => sp.name),
        is_pinned: false,
    };
    
    setAllMessages(prev => ({
        ...prev,
        [sessionId!]: [...(prev[sessionId!] || []), assistantMessage]
    }));
    
    try {
        const stream = generateResponseStream(skillsToUse, conversationHistoryForApi, apiKeys, customProviders, abortController.current.signal);
        let fullResponse = '';
        let groundingChunks: any[] | null = null;

        for await (const part of stream) {
            if (part.chunk) {
                fullResponse += part.chunk;
                setAllMessages(prev => ({
                    ...prev,
                    [sessionId!]: prev[sessionId!].map(m => m.id === assistantMessage.id ? { ...m, content: fullResponse } : m)
                }));
            }
            if (part.groundingChunks) {
                groundingChunks = part.groundingChunks;
                setAllMessages(prev => ({
                    ...prev,
                    [sessionId!]: prev[sessionId!].map(m => m.id === assistantMessage.id ? { ...m, grounding_chunks: groundingChunks as any } : m)
                }));
            }
        }
        
        let finalResponse = fullResponse;
        const primaryPack = skillsToUse[0];
        if (primaryPack && primaryPack.skill_type === 'code-enhanced') {
           try {
              finalResponse = await postprocessResponse(primaryPack, fullResponse);
           } catch(error) {
                console.error("Post-processing error:", error);
                addToast({ type: 'error', title: 'Post-processing Error', message: error instanceof Error ? error.message : "Skill failed to process response."});
           }
        }
        
        const inputTokens = Math.ceil(content.length / 4);
        const outputTokens = Math.ceil(finalResponse.length / 4);
        let messageCost = 0;
        if (primaryPack && primaryPack.cost_per_1k_tokens) {
            messageCost = ((inputTokens + outputTokens) / 1000) * (primaryPack.cost_per_1k_tokens / 100);
        }
        setTotalCost(prevCost => prevCost + messageCost);
        
        const finalAssistantMessage: Message = {
            ...assistantMessage,
            content: finalResponse,
            timestamp: new Date().toISOString(),
            tokens_in: inputTokens,
            tokens_out: outputTokens,
            cost: messageCost,
            grounding_chunks: groundingChunks as any,
        };

        setAllMessages(prev => ({
            ...prev,
            [sessionId!]: prev[sessionId!].map(m => m.id === assistantMessage.id ? finalAssistantMessage : m)
        }));
        
        const { id: finalAssistId, recommendation: finalRec, originalPrompt: finalPrompt, is_pinned: finalIsPinned, ...dbFinalAssistantMessage } = finalAssistantMessage;
        const savedAssistantMessage = await dataService.addMessage(dbFinalAssistantMessage as Database['public']['Tables']['messages']['Insert']);

        // FIX: Update state with the real message from DB to ensure UUID is stored locally
        setAllMessages(prev => ({
            ...prev,
            [sessionId!]: prev[sessionId!].map(m => m.id === finalAssistantMessage.id ? savedAssistantMessage : m)
        }));
        
        const currentSessionDetails = sessions.find(s => s.id === sessionId);
        const updatesForSession: Partial<AppSession> = {
            lastMessage: savedAssistantMessage.content.substring(0, 100),
            timestamp: new Date().toISOString(),
            messageCount: conversationHistoryForApi.length + 1,
        };

        if(isNewSession || currentSessionDetails?.name === 'New Chat') {
            updatesForSession.name = content.substring(0, 40) || 'New Chat';
        }

        const updatedSession = await dataService.updateSession(sessionId, updatesForSession);
        setSessions(prevSessions => prevSessions.map(s => s.id === sessionId ? updatedSession : s));

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const finalAssistantMessage = { ...assistantMessage, content: `Error: ${errorMessage}` };
      
        setAllMessages(prev => ({
            ...prev,
            [sessionId!]: prev[sessionId!].map(m => m.id === assistantMessage.id ? finalAssistantMessage : m)
        }));
        addToast({ type: 'error', title: 'AI Response Error', message: errorMessage });
    } finally {
        setIsLoading(false);
        abortController.current = null;
    }
}, [currentSessionId, user, allMessages, skillPacks, apiKeys, customProviders, addToast, sessions, isAutoPilot, handleSkillAction]);


  const handleRegenerate = () => {
      if (!currentSessionId || isLoading) return;
      const lastUserMessage = allMessages[currentSessionId]?.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
          // Remove the last assistant message before resending
          setAllMessages(prev => ({
              ...prev,
              [currentSessionId]: prev[currentSessionId].filter(m => m.role !== 'assistant' || m.id !== prev[currentSessionId].slice().reverse().find(m => m.role==='assistant')?.id)
          }));
          sendMessage(lastUserMessage.content, false, lastUserMessage.image_data);
      }
  };

  const handleStop = () => {
    if (abortController.current) {
        abortController.current.abort();
    }
  };

  const toggleSkillPack = useCallback((id: string, forceActive?: boolean) => {
    setSkillPacks(prev => prev.map(sp => {
        if (sp.id === id) {
            const isActive = forceActive !== undefined ? forceActive : !sp.isActive;
            if (user) {
                dataService.toggleSkillActive(user.id, id, isActive);
            }
            return { ...sp, isActive };
        }
        return sp;
    }));
  }, [user]);

  const installSkillPack = async (id: string) => {
    if (!user) return;
    try {
        const skillToInstall = skillPacks.find(s => s.id === id);
        if (!skillToInstall) throw new Error("Skill not found");
        await dataService.installSkill(user.id, id, skillToInstall.version);
        setSkillPacks(prev => prev.map(sp => (sp.id === id ? { ...sp, isInstalled: true, isActive: true, installedVersion: skillToInstall.version } : sp)));
        addToast({ type: 'success', title: 'Skill Installed!', message: `${skillToInstall.name} is ready to use.` });
        
        if (!onboardingState.completed.installSkill) {
          setOnboardingState(prev => ({ ...prev, completed: { ...prev.completed, installSkill: true } }));
        }

    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Installation Failed', message: error instanceof Error ? error.message : "Could not install skill." });
    }
  };
  
  const uninstallSkillPack = async (id: string) => {
      if (!user) return;
      try {
        const skillToUninstall = skillPacks.find(s => s.id === id);
        if (!skillToUninstall) throw new Error("Skill not found");
        await dataService.uninstallSkill(user.id, id);
        setSkillPacks(prev => prev.map(sp => (sp.id === id ? { ...sp, isInstalled: false, isActive: false, installedVersion: null } : sp)));
        addToast({ type: 'success', title: 'Skill Uninstalled', message: `${skillToUninstall.name} has been removed.` });
      } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Uninstall Failed', message: error instanceof Error ? error.message : "Could not uninstall skill." });
      }
  };

  const createSkillPack = async (data: any) => {
    if (!user) return;
    try {
        const newSkillPack = await dataService.createSkillPack(user.id, data);
        setSkillPacks(prev => [...prev, newSkillPack]);
        // Toast is handled in the BuildSkillPack component
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Creation Failed', message: error instanceof Error ? error.message : "Could not create skill pack." });
    }
  };
  
  const handleOpenShareModal = (content: string) => {
      setShareModalConfig({ isOpen: true, content: content });
  };
  
  const handleCreateShareLink = async (): Promise<string | null> => {
      if (!currentSessionId || !user) return null;
      const session = sessions.find(s => s.id === currentSessionId);
      const messagesToShare = allMessages[currentSessionId];
      if (!session || !messagesToShare) return null;
      
      try {
          const shareId = await dataService.createSharedSession(user.id, session.name, messagesToShare);
          const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
          return shareUrl;
      } catch(error) {
          addToast({ type: 'error', title: 'Sharing Failed', message: 'Could not create a share link.' });
          return null;
      }
  };
  
  const handleOpenLegalModal = (type: 'privacy' | 'terms') => {
      const legalContent = {
        privacy: { title: "Privacy Policy", content: `Last updated: ${new Date().toLocaleDateString()}

Your privacy is important to us. It is SuperModel AI's policy to respect your privacy regarding any information we may collect from you across our website.

1. Information We Collect
- Log data: When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.
- Personal Information: We may ask for personal information, such as your name and email address for account creation and communication.

2. Security of Your Data
- API Keys: Your API keys for third-party services (like Google, OpenAI, etc.) are stored exclusively in your browser's local storage. They are never transmitted to our servers. This "Bring Your Own Key" model means you have full control over your keys and associated costs.
- Conversation Data: Your chat sessions and messages are stored in our secure database, protected by Supabase's Row-Level Security. This ensures that only you, the authenticated user, can access your own conversation data. We do not use your conversation data to train our models.

3. Use of Information
We use the information we collect to operate, maintain, and provide the features and functionality of the Service, and to communicate with you.` },
        terms: { title: "Terms of Service", content: `Last updated: ${new Date().toLocaleDateString()}

By accessing the website at SuperModel AI, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.

1. Use License
Permission is granted to temporarily download one copy of the materials (information or software) on SuperModel AI's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.

2. Disclaimer
The materials on SuperModel AI's website are provided on an 'as is' basis. SuperModel AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of a intellectual property or other violation of rights.

3. Limitations
In no event shall SuperModel AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on SuperModel AI's website.

4. User-Generated Content
You are solely responsible for the content you generate using our service. You agree not to use the service for any illegal activities or to generate harmful, unethical, or malicious content. We reserve the right to terminate accounts that violate this policy.` }
      };
      setLegalModalContent(legalContent[type]);
      setIsLegalModalOpen(true);
  };
  
  const currentMessages = useMemo(() => {
    return currentSessionId ? allMessages[currentSessionId] || [] : [];
  }, [currentSessionId, allMessages]);
  
  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === currentSessionId);
  }, [currentSessionId, sessions]);

  // -- Render Logic --
  if (isCheckingShare) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      );
  }

  if (sharedSessionData) {
      return <PublicSessionView sessionData={sharedSessionData} />;
  }

  if (!supabaseSession) {
    return (
        <>
            <LandingPage
                onLogin={() => { setAuthModalView('login'); setIsAuthModalOpen(true); }}
                onSignup={() => { setAuthModalView('signup'); setIsAuthModalOpen(true); }}
                onViewLegal={handleOpenLegalModal}
            />
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialIsLogin={authModalView === 'login'}
                onViewLegal={handleOpenLegalModal}
            />
            <LegalModal
                isOpen={isLegalModalOpen}
                onClose={() => setIsLegalModalOpen(false)}
                title={legalModalContent?.title || ''}
                content={legalModalContent?.content || ''}
            />
        </>
    );
  }

  if (isAppLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const renderPage = () => {
    if (selectedSkillId) {
        const skill = skillPacks.find(s => s.id === selectedSkillId);
        if (skill) {
            return (
              <SkillDetail
                  skillPack={skill}
                  user={user}
                  onBack={() => setSelectedSkillId(null)}
                  onInstall={installSkillPack}
                  onAddReview={async (reviewData) => {
                     const reviewWithUser = { ...reviewData, user_id: user!.id };
                     return await dataService.addReview(reviewWithUser);
                  }}
              />
            );
        }
    }
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
                  skillPacks={skillPacks} 
                  sessions={sessions}
                  allMessages={allMessages}
                  totalCostToday={totalCost}
                  isAppLoading={isAppLoading}
                  setCurrentPage={setCurrentPage}
                  startNewSession={startNewSession}
                  startSessionFromTemplate={(template) => startNewSession(template)}
                  selectSession={selectSession}
                  user={user}
                  showApiKeyBanner={showApiKeyBanner}
                  onDismissApiBanner={handleDismissApiBanner}
                  onboardingState={onboardingState}
                  setOnboardingState={setOnboardingState}
                />;
      case 'chat':
        return <Chat 
                 sessionId={currentSessionId}
                 sessionName={currentSession?.name}
                 messages={currentMessages}
                 skillPacks={skillPacks}
                 isLoading={isLoading}
                 sendMessage={sendMessage}
                 updateMessage={handleUpdateMessage}
                 deleteMessage={handleDeleteMessage}
                 toggleSkillPack={toggleSkillPack}
                 handleSkillAction={handleSkillAction}
                 onRegenerate={handleRegenerate}
                 onStop={handleStop}
                 updateSession={updateSession}
                 startNewSession={startNewSession}
                 openShareModal={handleOpenShareModal}
                 openSessionShareModal={() => setShareSessionModalOpen(true)}
                 initialPrompt={pendingInitialPrompt}
                 clearInitialPrompt={() => setPendingInitialPrompt(null)}
                 isAutoPilot={isAutoPilot}
                 setIsAutoPilot={setIsAutoPilot}
                 handlePinMessage={handlePinMessage}
               />;
      case 'marketplace':
        return <Marketplace 
                  skillPacks={skillPacks}
                  isAppLoading={isAppLoading}
                  installSkillPack={installSkillPack}
                  uninstallSkillPack={uninstallSkillPack}
                  purchaseSkillPack={async (id) => console.log("Purchasing", id)}
                  setCurrentPage={setCurrentPage}
                  onViewSkill={(skillId) => setSelectedSkillId(skillId)}
               />;
      case 'sessions':
        return <Sessions
                  sessions={sessions}
                  isAppLoading={isAppLoading}
                  selectSession={selectSession}
                  startNewSession={startNewSession}
                  updateSession={updateSession}
                  deleteSession={deleteSession}
                />;
      case 'settings':
        return <Settings 
                 theme={theme} 
                 setTheme={setTheme}
                 user={user}
                 updateUser={updateUser}
                 changePassword={changePassword}
                 deleteAccount={deleteAccount}
                 apiKeys={apiKeys}
                 setApiKeys={setApiKeys}
                 customProviders={customProviders}
                 setCustomProviders={setCustomProviders}
                 onSettingsDraftChange={setSettingsDraft}
               />;
      case 'buildskillpack':
        return <BuildSkillPack 
                  setCurrentPage={setCurrentPage} 
                  createSkillPack={createSkillPack} 
                  customProviders={customProviders}
                  apiKeys={apiKeys}
                />;
      case 'analytics':
        return <Analytics allMessages={allMessages} skillPacks={skillPacks} user={user}/>
      case 'admin':
        return <Admin user={user} />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className={`flex h-screen font-sans bg-slate-100 dark:bg-slate-950 ${theme}`}>
      <Sidebar 
        currentPage={currentPage}
        setCurrentPage={(page) => { setSelectedSkillId(null); setCurrentPage(page); }}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        user={user}
        onLogout={handleLogout}
        onOpenSupportModal={() => setIsSupportModalOpen(true)}
        isMobileNavOpen={isMobileNavOpen}
        setIsMobileNavOpen={setIsMobileNavOpen}
        tempUserOverrides={settingsDraft}
      />
       <div 
        className={`fixed inset-0 z-20 bg-black/50 md:hidden ${isMobileNavOpen ? 'block' : 'hidden'}`}
        onClick={() => setIsMobileNavOpen(false)}
      ></div>

      <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out md:${sidebarCollapsed ? 'pl-20' : 'pl-64'}`}>
        <Header
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <AnimatePresence mode="wait">
                <MotionDiv
                    key={selectedSkillId ? `skill-${selectedSkillId}` : currentPage}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    {renderPage()}
                </MotionDiv>
            </AnimatePresence>
        </main>
      </div>

      {/* Modals and Global Components */}
      <ToastContainer />
      {showOnboarding && <OnboardingTour onComplete={() => {setShowOnboarding(false); localStorage.setItem('onboarding_completed', 'true');}}/>}
      <ShareModal
        isOpen={shareModalConfig.isOpen}
        onClose={() => setShareModalConfig({ isOpen: false, content: null })}
        content={shareModalConfig.content || ""}
        apiKeys={apiKeys}
      />
      <ShareSessionModal
        isOpen={shareSessionModalOpen}
        onClose={() => setShareSessionModalOpen(false)}
        onShare={handleCreateShareLink}
      />
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
       <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        sessions={sessions}
        skillPacks={skillPacks}
        theme={theme}
        setCurrentPage={(page: Page) => { setSelectedSkillId(null); setCurrentPage(page); }}
        selectSession={selectSession}
        onViewSkill={(skillId: string) => { setCurrentPage('marketplace'); setSelectedSkillId(skillId); }}
        startNewSession={startNewSession}
        setTheme={setTheme}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
