import React, { useState, useEffect } from 'react';
import type { User, CustomProvider } from '../types.ts';
import { Sun, Moon, UserIcon, Bell, Palette, Save, Bot, DollarSign, Link, Lock, AlertTriangle, Loader2, Info, ExternalLink, ChevronDown, Plus, Trash2 } from './icons.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal.tsx';
import { useToast } from '../hooks/useToast.ts';
import { testLocalConnection } from '../services/apiService.ts';
import Switch from './Switch.tsx';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

interface ApiKeys {
    google?: string;
    openai?: string;
    anthropic?: string;
    googleClientId?: string;
    googleApiKey?: string;
}

interface SettingsProps {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    user: User | null;
    updateUser: (user: Partial<User>) => Promise<void>;
    changePassword: (password: string) => Promise<void>;
    deleteAccount: () => Promise<void>;
    apiKeys: ApiKeys;
    setApiKeys: (keys: ApiKeys) => void;
    customProviders: CustomProvider[];
    setCustomProviders: (providers: CustomProvider[]) => void;
    onSettingsDraftChange: (draft: Partial<User> | null) => void;
}

// Helper to convert VAPID key for push subscriptions
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const Settings: React.FC<SettingsProps> = ({ theme, setTheme, user, updateUser, changePassword, deleteAccount, apiKeys, setApiKeys, customProviders, setCustomProviders, onSettingsDraftChange }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [localTheme, setLocalTheme] = useState(theme);
    const [localUser, setLocalUser] = useState(user);
    const [localApiKeys, setLocalApiKeys] = useState(apiKeys);
    const [localCustomProviders, setLocalCustomProviders] = useState(customProviders);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const { addToast } = useToast();
    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    useEffect(() => {
        setLocalTheme(theme);
        setLocalUser(user);
        setLocalApiKeys(apiKeys);
        setLocalCustomProviders(customProviders);
    }, [theme, user, apiKeys, customProviders]);

    const handleLocalUserChange = (updates: Partial<User>) => {
        const newUser = localUser ? { ...localUser, ...updates } : null;
        setLocalUser(newUser);
        onSettingsDraftChange(newUser);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (localUser && user) {
                // Check if there are actual changes before calling updateUser
                const userChanged = localUser.name !== user.name ||
                                    localUser.isCreator !== user.isCreator ||
                                    localUser.stripeConnected !== user.stripeConnected ||
                                    JSON.stringify(localUser.integrations) !== JSON.stringify(user.integrations) ||
                                    JSON.stringify(localUser.notificationPreferences) !== JSON.stringify(user.notificationPreferences);

                if (userChanged) {
                    await updateUser(localUser);
                }
            }
            if (localTheme !== theme) {
                setTheme(localTheme);
            }
            if (JSON.stringify(localApiKeys) !== JSON.stringify(apiKeys)) {
                setApiKeys(localApiKeys);
            }
            if (JSON.stringify(localCustomProviders) !== JSON.stringify(customProviders)) {
                setCustomProviders(localCustomProviders);
            }
            addToast({ type: 'success', title: 'Settings saved!', message: 'Your preferences have been updated.' });
            onSettingsDraftChange(null); // Clear the draft state after saving
        } catch (error) {
            addToast({ type: 'error', title: 'Save Failed', message: error instanceof Error ? error.message : 'Could not save settings.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteAccountConfirm = async () => {
        setIsDeleteModalOpen(false);
        addToast({ type: 'info', title: 'Processing Account Deletion', message: 'This may take a moment. You will be logged out automatically.' });
        try {
            await deleteAccount();
            // App will handle logout via auth state change
        } catch (error) {
            addToast({ type: 'error', title: 'Deletion Failed', message: error instanceof Error ? error.message : 'Could not delete your account.' });
        }
    };

    const handleConnectIntegration = (name: string) => {
        setIsConnecting(name);
        // This is a placeholder for a real OAuth flow.
        const dummyOAuthUrls = {
            'Gmail': 'https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/gmail.send&response_type=code&redirect_uri=YOUR_REDIRECT_URI&client_id=YOUR_CLIENT_ID',
            'Slack': 'https://slack.com/oauth/v2/authorize?scope=chat:write&client_id=YOUR_CLIENT_ID',
            'Google Drive': 'https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/drive.file&response_type=code&redirect_uri=YOUR_REDIRECT_URI&client_id=YOUR_CLIENT_ID'
        }
        window.open(dummyOAuthUrls[name as keyof typeof dummyOAuthUrls], '_blank', 'width=600,height=700');

        addToast({ type: 'info', title: `Connecting to ${name}...`, message: 'Please complete the auth flow in the new window.' });
        
        // In a real app, a callback would handle the success. Here we simulate it.
        setTimeout(() => {
            const lowerCaseName = name.toLowerCase();
            const updatedIntegrations = { ...localUser?.integrations, [lowerCaseName]: true };
            handleLocalUserChange({ integrations: updatedIntegrations });
            setIsConnecting(null);
            addToast({ type: 'success', title: `${name} Connected!`, message: 'Remember to save your changes.' });
        }, 3000);
    };
    
    const handleDisconnectIntegration = (name: string) => {
        const lowerCaseName = name.toLowerCase();
        const updatedIntegrations = { ...localUser?.integrations, [lowerCaseName]: false };
        handleLocalUserChange({ integrations: updatedIntegrations });
        addToast({ type: 'info', title: `${name} Disconnected.`, message: 'Remember to save your changes.' });
    };

    if (!localUser) {
        return <div>Loading settings...</div>;
    }

    return (
        <>
            <div className="space-y-8 max-w-4xl mx-auto">
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your application preferences.</p>
                </MotionDiv>

                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Tabs defaultValue="profile">
                        <TabsTrigger value="profile" icon={UserIcon}>Profile</TabsTrigger>
                        <TabsTrigger value="ai" icon={Bot}>AI Settings</TabsTrigger>
                        <TabsTrigger value="security" icon={Lock}>Security</TabsTrigger>
                        <TabsTrigger value="creator" icon={DollarSign}>Creator</TabsTrigger>
                        <TabsTrigger value="integrations" icon={Link}>Integrations</TabsTrigger>
                        <TabsTrigger value="notifications" icon={Bell}>Notifications</TabsTrigger>
                        <TabsTrigger value="appearance" icon={Palette}>Appearance</TabsTrigger>
                        
                        <TabsContent value="profile">
                            <SettingsCard title="Profile Settings">
                                <ProfileSettings user={localUser} setUser={handleLocalUserChange} />
                            </SettingsCard>
                        </TabsContent>
                         <TabsContent value="security">
                            <SettingsCard title="Security">
                                <SecuritySettings changePassword={changePassword} onDeleteAccount={() => setIsDeleteModalOpen(true)} />
                            </SettingsCard>
                        </TabsContent>
                        <TabsContent value="ai">
                            <SettingsCard title="AI Provider Keys (BYOK)">
                                <AISettings 
                                    apiKeys={localApiKeys} 
                                    setApiKeys={setLocalApiKeys} 
                                    customProviders={localCustomProviders}
                                    setCustomProviders={setLocalCustomProviders}
                                />
                            </SettingsCard>
                        </TabsContent>
                        <TabsContent value="creator">
                            <SettingsCard title="Creator Dashboard">
                                <CreatorSettings user={localUser} onUserChange={handleLocalUserChange} />
                            </SettingsCard>
                        </TabsContent>
                        <TabsContent value="integrations">
                            <SettingsCard title="Connect Your Apps">
                                <IntegrationSettings 
                                    user={localUser}
                                    isConnecting={isConnecting}
                                    onConnect={handleConnectIntegration}
                                    onDisconnect={handleDisconnectIntegration}
                                />
                            </SettingsCard>
                        </TabsContent>
                        <TabsContent value="notifications">
                            <SettingsCard title="Notification Preferences">
                                <NotificationSettings user={localUser} setUser={handleLocalUserChange} />
                            </SettingsCard>
                        </TabsContent>
                        <TabsContent value="appearance">
                            <SettingsCard title="Appearance">
                                <AppearanceSettings theme={localTheme} setTheme={setLocalTheme} />
                            </SettingsCard>
                        </TabsContent>
                    </Tabs>
                </MotionDiv>

                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-end pt-4"
                >
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </MotionDiv>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccountConfirm}
                title="Delete Your Account"
                description="This action is permanent and cannot be undone. All your sessions, messages, and installed skills will be permanently deleted. To confirm, please type 'DELETE MY ACCOUNT' below."
                confirmText="Delete My Account"
                confirmInput="DELETE MY ACCOUNT"
                icon={AlertTriangle}
                variant="danger"
            />
        </>
    );
};

// --- Responsive Tabbed UI Components ---

const TabsTrigger: React.FC<{ value: string; children: React.ReactNode; icon: React.ElementType; }> = () => {
    // This component is declarative and does not render anything itself.
    // Its props are read by the parent Tabs component.
    return null;
};

const TabsContent: React.FC<{ value: string; children: React.ReactNode; }> = ({ children }) => {
    // This component simply returns its children, to be rendered by the parent.
    return <>{children}</>;
};

const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode; }> = ({ defaultValue, children }) => {
    const [activeTab, setActiveTab] = useState(defaultValue);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const triggers = React.useMemo(() =>
        React.Children.toArray(children).filter(child =>
            React.isValidElement(child) && child.type === TabsTrigger
        ) as React.ReactElement<React.ComponentProps<typeof TabsTrigger>>[],
        [children]
    );

    const activeTrigger = triggers.find(t => t.props.value === activeTab);

    const content = React.useMemo(() =>
        React.Children.toArray(children).find(child =>
            React.isValidElement(child) &&
            child.type === TabsContent &&
            (child.props as { value: string }).value === activeTab
        ),
        [children, activeTab]
    );

    return (
        <div>
            {/* Desktop: Horizontal Tabs */}
            <div className="hidden md:block border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {triggers.map(trigger => {
                        const { value, children: triggerChildren, icon } = trigger.props;
                        const isActive = value === activeTab;
                        return (
                            <button
                                key={value}
                                onClick={() => setActiveTab(value)}
                                className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors
                                    ${isActive
                                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
                                    }`}
                            >
                                {React.createElement(icon, { className: 'w-5 h-5', 'aria-hidden': 'true' })}
                                {triggerChildren}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Mobile: Dropdown */}
            <div className="md:hidden relative">
                <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-left"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <div className="flex items-center gap-3">
                        {activeTrigger && React.createElement(activeTrigger.props.icon, { className: 'w-5 h-5 text-slate-500' })}
                        <span className="font-medium text-slate-800 dark:text-slate-200">{activeTrigger?.props.children}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isDropdownOpen && (
                        <MotionDiv
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full mt-1 w-full z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg p-2"
                        >
                            {triggers.map(trigger => (
                                <button
                                    key={trigger.props.value}
                                    className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={() => {
                                        setActiveTab(trigger.props.value);
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    {React.createElement(trigger.props.icon, { className: 'w-5 h-5 text-slate-500' })}
                                    <span>{trigger.props.children}</span>
                                </button>
                            ))}
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {content}
            </div>
        </div>
    );
};

// --- Settings Panels ---

const SettingsCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        <div className="p-6 space-y-6">
            {children}
        </div>
    </div>
);

const SettingRow: React.FC<{ title: React.ReactNode, description: string, children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
            <h3 className="font-medium text-slate-800 dark:text-slate-200">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
            {children}
        </div>
    </div>
);

const ProfileSettings: React.FC<{ user: User, setUser: (user: Partial<User>) => void }> = ({ user, setUser }) => (
    <>
        <SettingRow title="Display Name" description="This will be shown publicly.">
            <input 
                type="text" 
                value={user.name} 
                onChange={e => setUser({ name: e.target.value })}
                className="w-full sm:w-64 p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
        </SettingRow>
        <SettingRow title="Email Address" description="Used for notifications and account recovery.">
            <input type="email" value={user.email} disabled className="w-full sm:w-64 p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed" />
        </SettingRow>
    </>
);

const SecuritySettings: React.FC<{ changePassword: (password: string) => Promise<void>, onDeleteAccount: () => void }> = ({ changePassword, onDeleteAccount }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { addToast } = useToast();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            addToast({ type: 'error', title: 'Password Too Short', message: 'Password must be at least 6 characters.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            addToast({ type: 'error', title: 'Passwords Do Not Match', message: 'Please re-enter your password.' });
            return;
        }

        try {
            await changePassword(newPassword);
            addToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed successfully.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
             addToast({ type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : 'Could not update password.' });
        }
    };

    return (
         <div className="space-y-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">Change Password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Enter a new password for your account.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                     <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                     <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end">
                    <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">Update Password</button>
                </div>
            </form>
             <div className="border-t border-slate-200 dark:border-slate-700"></div>
            <SettingRow title="Delete Account" description="Permanently delete your account and all associated data.">
                <button onClick={onDeleteAccount} className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700">
                    Delete My Account
                </button>
            </SettingRow>
        </div>
    );
};

const CreatorSettings: React.FC<{ user: User, onUserChange: (user: Partial<User>) => void }> = ({ user, onUserChange }) => {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-lg">Coming Soon!</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    Exciting new features for skill creators are on the way! This is where you'll be able to manage your published skills, view creator-specific analytics, and handle monetization. Stay tuned for updates!
                </p>
            </div>
        </div>
    );
};

const API_KEY_INSTRUCTIONS = {
    google: {
        link: 'https://aistudio.google.com/app/apikey',
        steps: [
            'Go to Google AI Studio.',
            'Click on "Get API key".',
            'Create a new API key in your project.',
            'Copy the key and paste it here.',
        ]
    },
    openai: {
        link: 'https://platform.openai.com/api-keys',
        steps: [
            'Log in to your OpenAI account.',
            'Navigate to the "API keys" section.',
            'Click "Create new secret key".',
            'Copy the key and paste it here.',
        ]
    },
    anthropic: {
        link: 'https://console.anthropic.com/settings/keys',
        steps: [
            'Log in to your Anthropic account.',
            'Go to your Account Settings and find "API Keys".',
            'Click "Create Key".',
            'Copy the key and paste it here.',
        ]
    },
    googleOAuth: {
        link: 'https://console.cloud.google.com/apis/credentials',
        steps: [
            'Go to Google Cloud Console Credentials page.',
            'Click "Create Credentials" -> "API key". This is your API Key.',
            'Click "Create Credentials" -> "OAuth client ID".',
            'Select "Web application", add your app URL to "Authorized JavaScript origins".',
            'Copy the Client ID and paste it here.'
        ]
    }
};

const ApiKeyInput: React.FC<{
    provider: 'google' | 'openai' | 'anthropic' | 'googleOAuth';
    apiKeyType?: 'API Key' | 'Client ID';
    value: string;
    onChange: (value: string) => void;
}> = ({ provider, apiKeyType = "API Key", value, onChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const details = API_KEY_INSTRUCTIONS[provider];
    const providerName = provider.startsWith('google') ? 'Google' : provider.charAt(0).toUpperCase() + provider.slice(1);
    const titleText = provider === 'googleOAuth' ? `${providerName} Cloud ${apiKeyType}` : `${providerName} ${apiKeyType}`;
    const descriptionText = provider === 'googleOAuth' ? `For integrations like Google Drive.` : `For skills using ${providerName} models.`;

    const title = (
        <div className="flex items-center gap-2">
            <span>{titleText}</span>
             <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={`Show instructions for ${titleText}`}
                className="text-slate-400 hover:text-blue-500"
            >
                <Info className="w-4 h-4" />
            </button>
        </div>
    );
    
    return (
        <div className="space-y-2">
            <SettingRow 
                title={title} 
                description={descriptionText}
            >
                <input
                    type="password"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={`Enter your ${titleText}`}
                    className="w-full sm:w-80 p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </SettingRow>
            <AnimatePresence>
                {isExpanded && (
                    <MotionDiv
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '0.5rem' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 ml-0 sm:ml-auto max-w-full sm:max-w-md">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">How to get your key:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                {details.steps.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                            <a href={details.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                Go to {providerName} Console <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};


const AISettings: React.FC<{
    apiKeys: ApiKeys,
    setApiKeys: (keys: ApiKeys) => void,
    customProviders: CustomProvider[],
    setCustomProviders: (providers: CustomProvider[]) => void
}> = ({ apiKeys, setApiKeys, customProviders, setCustomProviders }) => {
    const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('supermodel_ollama_url') || 'http://localhost:11434');
    const [isTesting, setIsTesting] = useState(false);
    const { addToast } = useToast();
    const [newProvider, setNewProvider] = useState<Omit<CustomProvider, 'id'>>({ name: '', baseURL: '', apiKey: '' });
    
    const handleKeyChange = (provider: keyof ApiKeys, value: string) => {
        setApiKeys({ ...apiKeys, [provider]: value });
    };
    
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = e.target.value;
        setOllamaUrl(newUrl);
        localStorage.setItem('supermodel_ollama_url', newUrl);
    };
    
    const handleTestConnection = async () => {
        setIsTesting(true);
        const result = await testLocalConnection(ollamaUrl + '/api/tags'); // Test a specific endpoint
        if (result.ok) {
            addToast({ type: 'success', title: 'Connection Successful!', message: 'Successfully connected to local server.' });
        } else {
            addToast({ type: 'error', title: 'Connection Failed', message: result.error });
        }
        setIsTesting(false);
    };
    
    const handleAddCustomProvider = () => {
        if (!newProvider.name || !newProvider.baseURL || !newProvider.apiKey) {
            addToast({ type: 'error', title: 'Missing Fields', message: 'Please fill out all fields for the custom provider.' });
            return;
        }
        if (customProviders.some(p => p.name.toLowerCase() === newProvider.name.toLowerCase())) {
            addToast({ type: 'error', title: 'Name Exists', message: 'A provider with this name already exists.' });
            return;
        }
        const providerToAdd: CustomProvider = { ...newProvider, id: `custom-${Date.now()}` };
        setCustomProviders([...customProviders, providerToAdd]);
        setNewProvider({ name: '', baseURL: '', apiKey: '' });
        addToast({ type: 'success', title: 'Provider Added', message: 'Remember to save your changes.' });
    };

    const handleDeleteCustomProvider = (id: string) => {
        setCustomProviders(customProviders.filter(p => p.id !== id));
        addToast({ type: 'info', title: 'Provider Removed', message: 'Remember to save your changes.' });
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
                This platform operates on a "Bring Your Own Key" (BYOK) model. You provide your own API keys, and all costs are billed directly to you by the respective AI provider. Your keys are stored securely in your browser's local storage and are never sent to our servers.
            </p>
            <ApiKeyInput
                provider="google"
                value={apiKeys.google || ''}
                onChange={value => handleKeyChange('google', value)}
            />
             <ApiKeyInput
                provider="openai"
                value={apiKeys.openai || ''}
                onChange={value => handleKeyChange('openai', value)}
            />
             <ApiKeyInput
                provider="anthropic"
                value={apiKeys.anthropic || ''}
                onChange={value => handleKeyChange('anthropic', value)}
            />

            <div className="border-t border-slate-200 dark:border-slate-700"></div>
            <h3 className="font-medium text-slate-800 dark:text-slate-200 !-mb-2">Integration Keys</h3>
            <ApiKeyInput
                provider="googleOAuth"
                apiKeyType="Client ID"
                value={apiKeys.googleClientId || ''}
                onChange={value => handleKeyChange('googleClientId', value)}
            />
             <ApiKeyInput
                provider="googleOAuth"
                apiKeyType="API Key"
                value={apiKeys.googleApiKey || ''}
                onChange={value => handleKeyChange('googleApiKey', value)}
            />

            <div className="border-t border-slate-200 dark:border-slate-700"></div>
            
            <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200">Custom Model Providers</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Connect to any OpenAI-compatible API endpoint (e.g., Groq, Together AI, DeepSeek, Qwen).</p>
                <div className="space-y-3 mt-4">
                    {customProviders.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20">
                           <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{p.baseURL}</p>
                           </div>
                           <button onClick={() => handleDeleteCustomProvider(p.id)} className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50">
                             <Trash2 className="w-4 h-4 text-red-500" />
                           </button>
                        </div>
                    ))}
                </div>
                 <div className="mt-4 p-4 space-y-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Add New Provider</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="Provider Name (e.g., Groq)" value={newProvider.name} onChange={e => setNewProvider(p => ({...p, name: e.target.value}))} className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <input type="text" placeholder="Base URL (e.g., https://api.groq.com/openai/v1)" value={newProvider.baseURL} onChange={e => setNewProvider(p => ({...p, baseURL: e.target.value}))} className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <input type="password" placeholder="API Key" value={newProvider.apiKey} onChange={e => setNewProvider(p => ({...p, apiKey: e.target.value}))} className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <div className="flex justify-end">
                        <button onClick={handleAddCustomProvider} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                           <Plus className="w-4 h-4"/> Add Provider
                        </button>
                    </div>
                </div>
            </div>


            <div className="border-t border-slate-200 dark:border-slate-700"></div>

            <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200">Local Model Settings</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Connect to a local AI server (e.g., Ollama) for privacy and offline use.</p>
                <div className="flex items-center gap-2 mt-3">
                     <input
                        type="text"
                        value={ollamaUrl}
                        onChange={handleUrlChange}
                        placeholder="http://localhost:11434"
                        className="flex-grow p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={handleTestConnection} disabled={isTesting} className="flex items-center justify-center gap-2 w-36 px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                    </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Note: For Ollama, the API endpoint is typically added automatically. Just enter the base URL (e.g., http://localhost:11434). Remember to save changes.
                </p>
            </div>
        </div>
    );
};

const AppearanceSettings: React.FC<{ theme: 'light' | 'dark', setTheme: (theme: 'light' | 'dark') => void }> = ({ theme, setTheme }) => (
    <SettingRow title="Application Theme" description="Choose between light and dark mode.">
        <div className="flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
            <button 
                onClick={() => setTheme('light')}
                title="Light Mode"
                className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-white shadow' : 'text-slate-500 dark:text-slate-400'}`}
            >
                <Sun className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setTheme('dark')}
                title="Dark Mode"
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}`}
            >
                <Moon className="w-5 h-5" />
            </button>
        </div>
    </SettingRow>
);

const NotificationSettings: React.FC<{ user: User, setUser: (updates: Partial<User>) => void }> = ({ user, setUser }) => {
    const { addToast } = useToast();
    const prefs = user.notificationPreferences || { email: true, push: false };
    const VAPID_PUBLIC_KEY = 'BPhgq4hM92L2r6RMblfYXM_QkWTy_pL6KvjklMbe_MA3FmYIMn1hASs7OMAlHYs3mXXuBDE3o82Qnwd2yq2rJp0';

    const handleEmailToggle = () => {
        const newPrefs = { ...prefs, email: !prefs.email };
        setUser({ notificationPreferences: newPrefs });
        addToast({ type: 'info', title: `Email notifications ${newPrefs.email ? 'enabled' : 'disabled'}. Save changes to apply.` });
    };

    const handlePushToggle = async () => {
        let newPrefs = { ...prefs };
        if (!prefs.push) { // If turning on
            if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                addToast({ type: 'error', title: 'Unsupported', message: 'Your browser does not support push notifications.' });
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                    });
                    
                    console.log('Push Subscription:', JSON.stringify(subscription));
                    addToast({ type: 'success', title: 'Push Notifications Enabled!', message: 'Subscription details logged to console. Send this to your backend. Remember to save changes.' });
                    newPrefs = { ...prefs, push: true };

                } catch (err) {
                    console.error('Failed to subscribe to push notifications:', err);
                    addToast({ type: 'error', title: 'Subscription Failed', message: 'Could not subscribe to push notifications.' });
                }
            } else {
                addToast({ type: 'warning', title: 'Permission Denied', message: 'You need to allow notifications in your browser settings.' });
            }
        } else { // If turning off
             try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                    addToast({ type: 'info', title: 'Push Notifications Disabled. Save changes to apply.' });
                }
                newPrefs = { ...prefs, push: false };
            } catch (err) {
                console.error('Failed to unsubscribe from push notifications:', err);
                addToast({ type: 'error', title: 'Unsubscribe Failed', message: 'Could not unsubscribe.' });
            }
        }
        setUser({ notificationPreferences: newPrefs });
    };
    
    return (
     <>
        <SettingRow title="Email Notifications" description="Receive updates and summaries via email.">
             <Switch isChecked={prefs.email} onToggle={handleEmailToggle} />
        </SettingRow>
         <SettingRow title="Push Notifications" description="Get real-time alerts in your browser.">
             <Switch isChecked={prefs.push} onToggle={handlePushToggle} />
        </SettingRow>
    </>
    );
};

const IntegrationSettings: React.FC<{ user: User, isConnecting: string | null, onConnect: (name: string) => void, onDisconnect: (name: string) => void }> = ({ user, isConnecting, onConnect, onDisconnect }) => {
    const integrations = user.integrations || {};
    return (
    <>
        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2 mb-4">Connect SuperModel AI to your favorite applications to send AI-generated content directly into your workflow.</p>
        <div className="space-y-2">
            <IntegrationRow name="Gmail" description="Send emails directly from the chat." connected={!!integrations['gmail']} isConnecting={isConnecting === 'Gmail'} onConnect={() => onConnect('Gmail')} onDisconnect={() => onDisconnect('Gmail')} />
            <IntegrationRow name="Slack" description="Post messages to your team's channels." connected={!!integrations['slack']} isConnecting={isConnecting === 'Slack'} onConnect={() => onConnect('Slack')} onDisconnect={() => onDisconnect('Slack')} />
            <IntegrationRow name="Google Drive" description="Save responses as documents." connected={!!integrations['google drive']} isConnecting={isConnecting === 'Google Drive'} onConnect={() => onConnect('Google Drive')} onDisconnect={() => onDisconnect('Google Drive')} />
        </div>
    </>
    );
};

const IntegrationRow: React.FC<{ name: string, description: string, connected: boolean, isConnecting: boolean, onConnect: () => void, onDisconnect: () => void }> = ({ name, description, connected, isConnecting, onConnect, onDisconnect }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
        <div>
            <h3 className="font-medium text-slate-800 dark:text-slate-200">{name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {connected ? (
            <button 
                onClick={onDisconnect}
                className="flex items-center justify-center w-32 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
            >
                Disconnect
            </button>
        ) : (
             <button 
                onClick={onConnect}
                disabled={isConnecting} 
                className={`flex items-center justify-center w-32 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-70 disabled:cursor-wait`}
            >
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect'}
            </button>
        )}
    </div>
);

export default Settings;