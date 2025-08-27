


export type Page = 'dashboard' | 'chat' | 'marketplace' | 'sessions' | 'settings' | 'buildskillpack' | 'analytics' | 'skillDetail' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  isCreator?: boolean;
  stripeConnected?: boolean;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
  };
  integrations?: {
    [key:string]: boolean;
  };
}

export interface Message {
  id:string;
  session_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  skill_packs_used?: string[];
  recommendation?: SkillPack;
  originalPrompt?: string; // To store the prompt that triggered the recommendation
  // Fields for Analytics
  cost?: number;
  tokens_in?: number;
  tokens_out?: number;
  // New fields for multi-modal and search grounding
  image_data?: string | null; // base64 encoded image with data URI scheme
  grounding_chunks?: { web: { uri: string; title: string; } }[] | null;
  // New field for pinning messages
  is_pinned?: boolean | null;
}

export interface Session {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  isPinned?: boolean;
  status?: 'active' | 'archived';
}

export interface SkillPack {
  id:string;
  name: string;
  description: string;
  category: string;
  author: string;
  version: string;
  rating: number; // This will now come from get_skill_packs_with_stats
  downloads: number;
  price: number;
  purchase_type: 'free' | 'one-time';
  isInstalled: boolean;
  isActive: boolean;
  installedVersion?: string | null; // New field for versioning
  icon: string;
  tags: string[];
  prompt_template: string | null;
  system_instructions: string | null;
  // New OS-level fields
  provider: string;
  base_model: string;
  lora_url: string | null;
  cost_per_1k_tokens: number; // in cents
  permissions: ('file_system' | 'network')[] | null;
  tests: { input: string; output: string; }[] | null;
  // New fields for code-enhanced skills
  skill_type: 'prompt' | 'code-enhanced';
  preprocessing_code: string | null;
  postprocessing_code: string | null;
  // New field for performance optimization
  low_latency?: boolean;
  // New fields for reviews
  average_rating: number | null;
  review_count: number;
  // New fields for Admin Management
  is_featured?: boolean;
  status?: 'published' | 'unpublished' | 'archived';
}

export interface SkillPackReview {
    id: string;
    skill_pack_id: string;
    user_id: string;
    user_name: string; // Joined from users table
    rating: number;
    content: string | null;
    created_at: string;
}

export interface TaskProgress {
  id: string;
  name: string;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  eta?: string;
}

export interface SessionTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    skillPackIds: string[];
    initialPrompt: string;
}

export interface SupportTicket {
    id: string;
    user_id: string;
    user_email?: string; // Joined from users table for admin view
    type: 'feedback' | 'bug' | 'feature';
    subject: string;
    description: string;
    status: 'open' | 'in_progress' | 'closed';
    created_at: string;
}

export interface CustomProvider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
}