import { supabase } from './supabaseClient.ts';
import type { Database, Json } from './supabaseClient.ts';
import type { User, Session, SkillPack, Message, SkillPackReview, SupportTicket } from '../types.ts';
import { seedSkillPacks } from './seedData.ts';

// --- Helper Types ---
interface AuthUser {
    id: string;
    email?: string;
    user_metadata: {
        [key: string]: any;
        name?: string;
    };
}

// --- Data Mapping Helpers ---
const dbUserToUser = (dbUser: Database['public']['Tables']['users']['Row']): User => ({
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    isCreator: dbUser.is_creator,
    stripeConnected: dbUser.is_creator && dbUser.stripe_connected,
    notificationPreferences: (dbUser.notification_preferences as any) || { email: true, push: false },
    integrations: (dbUser.integrations as any) || {},
});

// --- User Management ---
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null; // No user found is not an error here
        throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
    if (!data) return null;
    return dbUserToUser(data);
};

export const ensureUserProfileExists = async (): Promise<void> => {
    const { error } = await supabase.rpc('ensure_user_profile_exists');
    if (error) {
        throw new Error(`RPC Error: ${error.message}`);
    }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
    // Map camelCase from app to snake_case for DB
    const dbUpdates: Database['public']['Tables']['users']['Update'] = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.isCreator !== undefined) dbUpdates.is_creator = updates.isCreator;
    if (updates.stripeConnected !== undefined) dbUpdates.stripe_connected = updates.stripeConnected;
    if (updates.notificationPreferences !== undefined) dbUpdates.notification_preferences = updates.notificationPreferences as any;
    if (updates.integrations !== undefined) dbUpdates.integrations = updates.integrations as any;

    const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    if (!data) throw new Error('Failed to update user: no data returned.');
    return dbUserToUser(data);
};

export const deleteUserAccount = async (): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-user');
    if (error) {
        throw new Error(`Failed to delete user account: ${error.message}`);
    }
};

// --- Skill Pack Management ---
export const getSkillPacks = async (userId: string): Promise<SkillPack[]> => {
    const seedMap = new Map(seedSkillPacks.map(s => [s.id, s]));

    const skillsToUpsert: Database['public']['Tables']['skill_packs']['Insert'][] = seedSkillPacks.map(({ created_at, low_latency, ...rest }) => ({...rest}));

    const { error: upsertError } = await supabase
        .from('skill_packs')
        .upsert(skillsToUpsert, { onConflict: 'id' });

    if (upsertError) {
        console.error("Failed to synchronize seed skill packs:", upsertError);
        if (upsertError.message.includes('column')) {
             throw new Error(`Database schema mismatch. Please run the latest SQL updates from services/supabaseClient.ts. Original error: ${upsertError.message}`);
        }
        throw new Error(`Failed to synchronize skill packs: ${upsertError.message}`);
    }

    // --- FIX START: Replace RPC with separate queries to avoid timeout/fetch errors ---
    const { data: skillsData, error: skillsError } = await supabase
        .from('skill_packs')
        .select('*');
    if (skillsError) throw new Error(`Failed to fetch skill_packs: ${skillsError.message}`);
    if (!skillsData) throw new Error('Could not retrieve skill packs.');


    const { data: installedSkillsData, error: installedError } = await supabase
        .from('user_installed_skills')
        .select('*')
        .eq('user_id', userId);
    if (installedError) throw new Error(`Failed to fetch user_installed_skills: ${installedError.message}`);
    if (!installedSkillsData) throw new Error('Could not retrieve installed skills.');


    const { data: reviewsData, error: reviewsError } = await supabase
        .from('skill_pack_reviews')
        .select('skill_pack_id, rating');
    if (reviewsError) throw new Error(`Failed to fetch skill_pack_reviews: ${reviewsError.message}`);
    if (!reviewsData) throw new Error('Could not retrieve reviews.');

    // Join data on the client
    const installedMap = new Map<string, { isActive: boolean; installedVersion: string | null; }>(installedSkillsData.map(s => [s.skill_pack_id, { isActive: s.is_active, installedVersion: s.installed_version }]));
    
    const reviewsAggregated = reviewsData.reduce((acc, r) => {
        if (!acc[r.skill_pack_id]) {
            acc[r.skill_pack_id] = { totalRating: 0, count: 0 };
        }
        acc[r.skill_pack_id].totalRating += r.rating;
        acc[r.skill_pack_id].count += 1;
        return acc;
    }, {} as Record<string, { totalRating: number, count: number }>);

    return skillsData.map((dbSkill): SkillPack => {
        const seedSkill = seedMap.get(dbSkill.id);
        const installedInfo = installedMap.get(dbSkill.id);
        const reviewInfo = reviewsAggregated[dbSkill.id];

        const { ...restOfDbSkill } = dbSkill;

        return {
            ...restOfDbSkill,
            rating: dbSkill.rating,
            price: dbSkill.price,
            cost_per_1k_tokens: dbSkill.cost_per_1k_tokens,
            average_rating: reviewInfo ? reviewInfo.totalRating / reviewInfo.count : 0,
            review_count: reviewInfo ? reviewInfo.count : 0,
            isInstalled: !!installedInfo,
            isActive: installedInfo?.isActive ?? false,
            installedVersion: installedInfo?.installedVersion ?? null,
            low_latency: seedSkill ? seedSkill.low_latency : false,
            permissions: (dbSkill.permissions as ('file_system' | 'network')[] | null),
            tests: dbSkill.tests as { input: string; output: string; }[] | null,
            purchase_type: dbSkill.purchase_type as 'free' | 'one-time',
            provider: dbSkill.provider,
            base_model: dbSkill.base_model as string,
            skill_type: dbSkill.skill_type as 'prompt' | 'code-enhanced',
            is_featured: dbSkill.is_featured,
            status: dbSkill.status as SkillPack['status'],
        };
    });
    // --- FIX END ---
};

export const getSkillPackWithDetails = async (skillId: string, userId: string): Promise<SkillPack | null> => {
    // This is less efficient than getting all at once, but simpler for a single detail view
    const allSkills = await getSkillPacks(userId);
    return allSkills.find(s => s.id === skillId) || null;
};

export const installSkill = async (userId: string, skillPackId: string, version: string): Promise<void> => {
    const { error } = await supabase
        .from('user_installed_skills')
        .upsert({ user_id: userId, skill_pack_id: skillPackId, is_active: true, installed_version: version }, { onConflict: 'user_id, skill_pack_id' });
    if (error) throw new Error(`Failed to install skill: ${error.message}`);
};

export const uninstallSkill = async (userId: string, skillPackId: string): Promise<void> => {
    const { error } = await supabase
        .from('user_installed_skills')
        .delete()
        .match({ user_id: userId, skill_pack_id: skillPackId });
    if (error) throw new Error(`Failed to uninstall skill: ${error.message}`);
};

export const toggleSkillActive = async (userId: string, skillPackId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
        .from('user_installed_skills')
        .update({ is_active: isActive })
        .match({ user_id: userId, skill_pack_id: skillPackId });
    if (error) throw new Error(`Failed to toggle skill activation: ${error.message}`);
};

export const createSkillPack = async (userId: string, skillData: Omit<SkillPack, 'id' | 'version' | 'rating' | 'downloads' | 'isInstalled' | 'isActive' | 'icon' | 'tags' | 'average_rating' | 'review_count'>): Promise<SkillPack> => {
    
    const { low_latency, ...dbSafeSkillData } = skillData;

    const dbSkillData: Database['public']['Tables']['skill_packs']['Insert'] = {
        ...dbSafeSkillData,
        version: '1.0.0',
        rating: 0,
        downloads: 0,
        icon: '💡',
        tags: [skillData.category],
        skill_type: skillData.skill_type ?? 'prompt',
    };
    
    const { data, error } = await supabase
        .from('skill_packs')
        .insert(dbSkillData)
        .select()
        .single();
    if (error) throw new Error(`Failed to create skill pack: ${error.message}`);
    if (!data) throw new Error('Failed to create skill pack: no data returned.');

    await installSkill(userId, data.id, data.version);
    
    const { ...restOfData } = data;

    return { 
        ...restOfData, 
        isInstalled: true, 
        isActive: true,
        installedVersion: data.version,
        low_latency: low_latency ?? false,
        permissions: (data.permissions as ('file_system' | 'network')[] | null),
        tests: data.tests as { input: string; output: string; }[] | null,
        average_rating: 0,
        review_count: 0,
        provider: data.provider,
        status: data.status as SkillPack['status'],
        is_featured: data.is_featured,
    };
};

export const updateInstalledSkillVersion = async (skillPackId: string, newVersion: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('user_installed_skills')
        .update({ installed_version: newVersion })
        .match({ user_id: user.id, skill_pack_id: skillPackId });

    if (error) throw new Error(`Failed to update skill version: ${error.message}`);
};

// --- Session & Message Management ---
export const getSessions = async (userId: string): Promise<Session[]> => {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
    if (!data) return [];
    return data.map(s => ({
        id: s.id,
        name: s.name,
        lastMessage: s.last_message,
        timestamp: s.timestamp,
        messageCount: s.message_count,
        isPinned: s.is_pinned,
        status: s.status,
    }));
};

export const getMessagesForSession = async (sessionId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    if (!data) return [];

    return data.map(message => ({
        ...message,
        id: message.id.toString(),
        skill_packs_used: message.skill_packs_used || undefined,
        cost: message.cost || undefined,
        tokens_in: message.tokens_in || undefined,
        tokens_out: message.tokens_out || undefined,
        role: message.role as 'user' | 'assistant',
        image_data: message.image_data || undefined,
        grounding_chunks: (message.grounding_chunks as any) || undefined,
        is_pinned: message.is_pinned,
    }));
};

export const createSession = async (sessionData: Database['public']['Tables']['sessions']['Insert']): Promise<Session> => {
    const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();
    if (error) throw new Error(`Failed to create session: ${error.message}`);
    if (!data) throw new Error('Failed to create session: no data returned.');
    return {
        id: data.id,
        name: data.name,
        lastMessage: data.last_message,
        timestamp: data.timestamp,
        messageCount: data.message_count,
        isPinned: data.is_pinned,
        status: data.status,
    };
};

export const updateSession = async (sessionId: string, updates: Partial<Session>): Promise<Session> => {
    const dbUpdates: Database['public']['Tables']['sessions']['Update'] = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.lastMessage !== undefined) dbUpdates.last_message = updates.lastMessage;
    if (updates.timestamp !== undefined) dbUpdates.timestamp = updates.timestamp;
    if (updates.messageCount !== undefined) dbUpdates.message_count = updates.messageCount;
    if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { data, error } = await supabase
        .from('sessions')
        .update(dbUpdates)
        .eq('id', sessionId)
        .select()
        .single();
    if (error) throw new Error(`Failed to update session: ${error.message}`);
    if (!data) throw new Error('Failed to update session: no data returned.');
    return {
        id: data.id,
        name: data.name,
        lastMessage: data.last_message,
        timestamp: data.timestamp,
        messageCount: data.message_count,
        isPinned: data.is_pinned,
        status: data.status,
    };
};

export const deleteSession = async (sessionId: string): Promise<void> => {
    // Delete messages first due to foreign key constraint
    const { error: msgError } = await supabase.from('messages').delete().eq('session_id', sessionId);
    if (msgError) throw new Error(`Failed to delete messages for session: ${msgError.message}`);
    
    const { error: sessionError } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (sessionError) throw new Error(`Failed to delete session: ${sessionError.message}`);
};

export const addMessage = async (messageData: Database['public']['Tables']['messages']['Insert']): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
    if (error) throw new Error(`Failed to add message: ${error.message}`);
    if (!data) throw new Error('Failed to add message: no data returned.');

    return {
        ...data,
        id: data.id.toString(),
        skill_packs_used: data.skill_packs_used || undefined,
        cost: data.cost || undefined,
        tokens_in: data.tokens_in || undefined,
        tokens_out: data.tokens_out || undefined,
        role: data.role as 'user' | 'assistant',
        image_data: data.image_data || undefined,
        grounding_chunks: (data.grounding_chunks as any) || undefined,
        is_pinned: data.is_pinned,
    };
};

export const updateMessageContent = async (messageId: string, newContent: string): Promise<void> => {
    const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);
    if (error) throw new Error(`Failed to update message: ${error.message}`);
};

export const updateMessagePinnedStatus = async (messageId: string, isPinned: boolean): Promise<void> => {
    const { error } = await supabase
        .from('messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);
    if (error) throw new Error(`Failed to update message pin status: ${error.message}`);
};

export const deleteMessage = async (messageId: string): Promise<void> => {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
    if (error) throw new Error(`Failed to delete message: ${error.message}`);
};

// --- Session Sharing ---
export const createSharedSession = async (userId: string, sessionName: string, messages: Message[]): Promise<string> => {
    const messagesToStore = messages.map(({ id, session_id, ...rest }) => rest);
    const { data, error } = await supabase
        .from('shared_sessions')
        .insert({
            user_id: userId,
            session_name: sessionName,
            messages: messagesToStore as any,
        })
        .select('id')
        .single();
    if (error) throw new Error(`Failed to create shared session: ${error.message}`);
    if (!data) throw new Error('Failed to create shared session: no ID returned.');
    return data.id;
};

export const getSharedSession = async (shareId: string): Promise<{ session_name: string, messages: Message[] }> => {
    const { data, error } = await supabase
        .from('shared_sessions')
        .select('session_name, messages')
        .eq('id', shareId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') throw new Error('Shared session not found.');
        throw new Error(`Failed to fetch shared session: ${error.message}`);
    }
    if (!data) throw new Error('Shared session not found.');
    return {
        session_name: data.session_name,
        messages: (data.messages as any[]).map((msg, i) => ({ ...msg, id: `shared-${i}` })),
    };
};

// --- Analytics ---
export const getTodaysCost = async (userId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_today_cost', { p_user_id: userId });
    if (error) throw new Error(`Failed to get today's cost: ${error.message}`);
    return data || 0;
};

// --- Reviews ---
export const getReviewsForSkill = async (skillPackId: string): Promise<SkillPackReview[]> => {
    const { data, error } = await supabase
        .from('skill_pack_reviews')
        .select(`
            *,
            user:users ( name )
        `)
        .eq('skill_pack_id', skillPackId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
    if (!data) return [];
    
    return data.map(r => ({
        ...r,
        user_name: (r.user as any)?.name || 'Anonymous'
    }));
};

export const addReview = async (reviewData: { skill_pack_id: string; user_id: string; rating: number; content: string; }): Promise<SkillPackReview> => {
    const { data, error } = await supabase
        .from('skill_pack_reviews')
        .insert(reviewData)
        .select(`*, user:users ( name )`)
        .single();

    if (error) {
        if (error.code === '23505') throw new Error('You have already reviewed this skill pack.');
        throw new Error(`Failed to add review: ${error.message}`);
    }
    if (!data) throw new Error('Failed to add review: no data returned.');
    
    return { ...data, user_name: (data.user as any)?.name || 'Anonymous' };
};

// --- Admin ---
export const getAdminDashboardData = async (): Promise<{ users: User[], skills: SkillPack[], tickets: SupportTicket[] }> => {
    const { data, error } = await supabase.rpc('get_admin_dashboard_data');
    if (error) throw new Error(`RPC Error: ${error.message}`);
    // This is less safe, but necessary for RPC calls returning complex JSON
    const typedData = data as any;
    return {
        users: typedData.users.map(dbUserToUser),
        skills: typedData.skills.map((s: any) => ({...s, isInstalled: false, isActive: false})), // Admin doesn't have installed status
        tickets: typedData.tickets
    };
};

export const updateUserAdmin = async (userId: string, updates: { is_creator: boolean }): Promise<User> => {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) throw new Error(`Admin update failed: ${error.message}`);
    return dbUserToUser(data);
};

export const updateSkillPackAdmin = async (skillId: string, updates: Partial<SkillPack>): Promise<void> => {
    const { error } = await supabase.from('skill_packs').update(updates).eq('id', skillId);
    if (error) throw new Error(`Skill update failed: ${error.message}`);
};

export const deleteSkillPackAdmin = async (skillId: string): Promise<void> => {
    const { error } = await supabase.from('skill_packs').delete().eq('id', skillId);
    if (error) throw new Error(`Skill delete failed: ${error.message}`);
}

// --- Support Tickets ---
export const createSupportTicket = async (ticketData: Omit<SupportTicket, 'id' | 'status' | 'created_at' | 'user_id'>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('support_tickets')
        .insert({ ...ticketData, user_id: user.id });

    if (error) throw new Error(`Failed to create support ticket: ${error.message}`);
};

export const updateSupportTicketStatus = async (ticketId: string, status: SupportTicket['status']): Promise<void> => {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    if (error) throw new Error(`Failed to update ticket status: ${error.message}`);
};

export const deleteSupportTicket = async (ticketId: string): Promise<void> => {
    const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId);
    if (error) throw new Error(`Failed to delete ticket: ${error.message}`);
};
