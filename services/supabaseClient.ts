import { createClient } from '@supabase/supabase-js';

// =================================================================================
// IMPORTANT: PRODUCTION DATABASE SETUP
// =================================================================================
// To make this application ready for production, you MUST run the following SQL
// commands in your Supabase SQL Editor (Database -> SQL Editor -> "New query").
// This script does two critical things:
// 1. Creates a trigger to automatically add new users to the `users` table.
// 2. Enables Row-Level Security (RLS) to ensure users can only access their own data.
// =================================================================================
/*
-- =================================================================================
-- URGENT: DATABASE SCHEMA UPDATE REQUIRED TO FIX STARTUP ERROR
-- =================================================================================
-- The errors "Could not find the 'provider' column" and "policy ... already exists"
-- mean your database schema is out of date.
--
-- TO FIX: Please copy and run this ENTIRE script (from top to bottom) in your
-- Supabase SQL Editor. This is a one-time update that will safely bring your
-- database schema up to date and resolve the errors. This script is idempotent,
-- meaning it is safe to run multiple times.
-- =================================================================================

-- 0. Drop the obsolete 'execution_type' column to align with the new client-side architecture.
-- This is the primary fix for the "violates not-null constraint" error.
ALTER TABLE public.skill_packs DROP COLUMN IF EXISTS execution_type;


-- 1. Create a function to automatically insert a new user into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, is_creator)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    (new.email = 'yashsoni20052507@gmail.com')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a trigger to call the function after a new user signs up in auth.users
-- This ensures a user profile is created immediately and reliably.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; -- Drop existing trigger to prevent duplicates
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Create a self-healing function that can be called from the client to ensure a profile exists.
-- This is a fallback if the trigger is slow or fails for any reason.
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists()
RETURNS void AS $$
BEGIN
  -- Check if a profile already exists for the current authenticated user
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) THEN
    -- If not, insert a new profile using data from the auth schema
    INSERT INTO public.users (id, email, name, is_creator)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
      ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'yashsoni20052507@gmail.com')
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists() TO authenticated;


-- 4. Enable Row-Level Security (RLS) for all relevant tables
-- RLS is disabled by default. This is a critical security step.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_installed_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_packs ENABLE ROW LEVEL SECURITY; -- Also secure skill_packs

-- 5. Create policies for the 'users' table
DROP POLICY IF EXISTS "Allow individual user read access" ON public.users;
CREATE POLICY "Allow individual user read access" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow individual user update access" ON public.users;
CREATE POLICY "Allow individual user update access" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- NOTE (Security Enhancement): The INSERT policy for users has been removed.
-- User profile creation should ONLY be handled by the secure, server-side
-- `handle_new_user` trigger or the `ensure_user_profile_exists` function.


-- 6. Create policies for the 'sessions' table
DROP POLICY IF EXISTS "Allow full access to own sessions" ON public.sessions;
CREATE POLICY "Allow full access to own sessions" ON public.sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Create policies for the 'user_installed_skills' table
DROP POLICY IF EXISTS "Allow full access to own installed skills" ON public.user_installed_skills;
CREATE POLICY "Allow full access to own installed skills" ON public.user_installed_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8a. Create a helper function to check session ownership.
-- Using a SECURITY DEFINER function is a robust way to check ownership on a related table
-- without worrying about nested RLS policies.
CREATE OR REPLACE FUNCTION public.is_session_owner(session_id_to_check uuid)
RETURNS boolean AS $$
BEGIN
  -- The function runs with the permissions of the user who defined it (the admin),
  -- so it can bypass the session table's RLS to check for the user_id.
  RETURN EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE id = session_id_to_check AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant authenticated users permission to execute this function
GRANT EXECUTE ON FUNCTION public.is_session_owner(uuid) TO authenticated;

-- 8b. Create policies for the 'messages' table using the helper function
-- This is more robust than a subquery and fixes the error.
DROP POLICY IF EXISTS "Allow full access to messages in own sessions" ON public.messages;
CREATE POLICY "Allow full access to messages in own sessions" ON public.messages FOR ALL
  USING (public.is_session_owner(session_id))
  WITH CHECK (public.is_session_owner(session_id));


-- 9. Grant public read access to skill_packs (they are not user-specific)
DROP POLICY IF EXISTS "Allow public read access to skill packs" ON public.skill_packs;
CREATE POLICY "Allow public read access to skill packs" ON public.skill_packs FOR SELECT USING (true);

-- 10. Create INSERT/UPDATE policies for 'skill_packs' table
-- This allows the app's seed data synchronization and the "Build Skill Pack" feature to work.
-- NOTE: For a multi-creator production app, you would add an `author_id` column to this
-- table and restrict UPDATE/DELETE policies to the record owner.
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.skill_packs;
CREATE POLICY "Allow insert for authenticated users" ON public.skill_packs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =================================================================================
-- NEW: SQL for Session Sharing, Analytics, and Reviews
-- =================================================================================

-- 11. Create the 'shared_sessions' table for public sharing links
CREATE TABLE IF NOT EXISTS public.shared_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for the new table
ALTER TABLE public.shared_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for 'shared_sessions'
DROP POLICY IF EXISTS "Allow public read access to shared sessions" ON public.shared_sessions;
CREATE POLICY "Allow public read access to shared sessions" ON public.shared_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow owner to create shared sessions" ON public.shared_sessions;
CREATE POLICY "Allow owner to create shared sessions" ON public.shared_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow owner to delete their own shared sessions" ON public.shared_sessions;
CREATE POLICY "Allow owner to delete their own shared sessions" ON public.shared_sessions FOR DELETE
  USING (auth.uid() = user_id);


-- 12. Add analytics columns to the 'messages' table
-- Run these ALTER TABLE commands separately.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS cost NUMERIC;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tokens_in INTEGER;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tokens_out INTEGER;

-- 13. Create 'skill_pack_reviews' table
CREATE TABLE IF NOT EXISTS public.skill_pack_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_pack_id uuid REFERENCES public.skill_packs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_skill_review UNIQUE (user_id, skill_pack_id)
);

-- Enable RLS and create policies for reviews
ALTER TABLE public.skill_pack_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to reviews" ON public.skill_pack_reviews;
CREATE POLICY "Allow public read access to reviews" ON public.skill_pack_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to insert own reviews for installed skills" ON public.skill_pack_reviews;
CREATE POLICY "Allow users to insert own reviews for installed skills" ON public.skill_pack_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_installed_skills
      WHERE user_installed_skills.user_id = auth.uid()
      AND user_installed_skills.skill_pack_id = skill_pack_reviews.skill_pack_id
    )
  );

DROP POLICY IF EXISTS "Allow users to update/delete their own reviews" ON public.skill_pack_reviews;
CREATE POLICY "Allow users to update/delete their own reviews" ON public.skill_pack_reviews FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- 14. Create RPC function to get skills with review stats
-- FIX: Add DROP FUNCTION to handle changes in the function's return signature
DROP FUNCTION IF EXISTS public.get_skill_packs_with_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_skill_packs_with_stats(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    category text,
    author text,
    version text,
    rating numeric,
    downloads integer,
    price numeric,
    purchase_type text,
    icon text,
    tags text[],
    prompt_template text,
    system_instructions text,
    provider text,
    base_model text,
    lora_url text,
    cost_per_1k_tokens numeric,
    permissions text[],
    tests jsonb,
    skill_type text,
    preprocessing_code text,
    postprocessing_code text,
    created_at timestamptz,
    is_featured boolean,
    status text,
    average_rating numeric,
    review_count bigint,
    is_installed boolean,
    is_active boolean,
    installed_version text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.description,
    sp.category,
    sp.author,
    sp.version,
    sp.rating,
    sp.downloads,
    sp.price,
    sp.purchase_type,
    sp.icon,
    sp.tags,
    sp.prompt_template,
    sp.system_instructions,
    sp.provider,
    sp.base_model,
    sp.lora_url,
    sp.cost_per_1k_tokens,
    sp.permissions,
    sp.tests,
    sp.skill_type,
    sp.preprocessing_code,
    sp.postprocessing_code,
    sp.created_at,
    sp.is_featured,
    sp.status,
    COALESCE(rev.avg_rating, 0) as average_rating,
    COALESCE(rev.review_count, 0) as review_count,
    (uis.skill_pack_id IS NOT NULL) as is_installed,
    COALESCE(uis.is_active, false) as is_active,
    uis.installed_version
  FROM
    public.skill_packs sp
  LEFT JOIN (
    SELECT
      spr.skill_pack_id,
      AVG(spr.rating) as avg_rating,
      COUNT(spr.id) as review_count
    FROM
      public.skill_pack_reviews spr
    GROUP BY
      spr.skill_pack_id
  ) rev ON sp.id = rev.skill_pack_id
  LEFT JOIN public.user_installed_skills uis ON sp.id = uis.skill_pack_id AND uis.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permission to call the function
GRANT EXECUTE ON FUNCTION public.get_skill_packs_with_stats(uuid) TO authenticated;


-- =================================================================================
-- NEW: Production Readiness Enhancements
-- =================================================================================

-- 15. Add ON DELETE CASCADE to foreign keys to ensure data is cleaned up
-- when a user is deleted. This is critical for the "Delete Account" feature.

-- NOTE: Run these ALTER TABLE commands if your tables were created without CASCADE.
-- ALTER TABLE public.sessions DROP CONSTRAINT sessions_user_id_fkey, ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
-- ALTER TABLE public.user_installed_skills DROP CONSTRAINT user_installed_skills_user_id_fkey, ADD CONSTRAINT user_installed_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 16. Recommended Indexes for Performance
-- As your application grows, adding indexes to frequently queried columns,
-- especially foreign keys, will be crucial for maintaining performance.

-- CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
-- CREATE INDEX IF NOT EXISTS idx_user_installed_skills_user_id ON public.user_installed_skills(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_installed_skills_skill_pack_id ON public.user_installed_skills(skill_pack_id);
-- CREATE INDEX IF NOT EXISTS idx_skill_pack_reviews_skill_pack_id ON public.skill_pack_reviews(skill_pack_id);


-- =================================================================================
-- NEW: Schema changes for full feature implementation
-- =================================================================================

-- 17. Add installed_version to user_installed_skills for versioning
ALTER TABLE public.user_installed_skills ADD COLUMN IF NOT EXISTS installed_version TEXT;

-- 18. Add columns to users table for persistent settings
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb;

-- 19. Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create a helper function to check creator status securely, avoiding RLS recursion.
CREATE OR REPLACE FUNCTION public.is_current_user_creator()
RETURNS boolean AS $$
BEGIN
  -- This function runs with the permissions of the user who defined it (the admin),
  -- so it can bypass the user table's RLS to check the is_creator flag.
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND is_creator = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.is_current_user_creator() TO authenticated;


-- Enable RLS and create policies for support tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to insert their own tickets" ON public.support_tickets;
CREATE POLICY "Allow users to insert their own tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to access all tickets" ON public.support_tickets;
CREATE POLICY "Allow admins to access all tickets" ON public.support_tickets FOR ALL
  USING ( public.is_current_user_creator() );

-- 20. Allow admins to read all user data
DROP POLICY IF EXISTS "Allow admin read access" ON public.users;
CREATE POLICY "Allow admin read access" ON public.users FOR SELECT
  USING ( public.is_current_user_creator() );

-- 21. Create RPC function for Admin Dashboard data
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data()
RETURNS json AS $$
DECLARE
  users_data json;
  skills_data json;
  tickets_data json;
BEGIN
  -- Ensure only creators can run this
  IF NOT (SELECT is_creator FROM public.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'User is not authorized to perform this action';
  END IF;

  SELECT json_agg(json_build_object('id', id, 'name', name, 'email', email, 'isCreator', is_creator))
  INTO users_data
  FROM public.users;

  SELECT json_agg(sp.*)
  INTO skills_data
  FROM public.skill_packs sp;

  SELECT json_agg(json_build_object(
    'id', st.id,
    'user_id', st.user_id,
    'user_email', u.email,
    'type', st.type,
    'subject', st.subject,
    'description', st.description,
    'status', st.status,
    'created_at', st.created_at
  ))
  INTO tickets_data
  FROM public.support_tickets st
  LEFT JOIN public.users u ON st.user_id = u.id;

  RETURN json_build_object(
    'users', COALESCE(users_data, '[]'::json),
    'skills', COALESCE(skills_data, '[]'::json),
    'tickets', COALESCE(tickets_data, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_data() TO authenticated;

-- 22. Add management columns to skill_packs table
ALTER TABLE public.skill_packs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.skill_packs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- 23. Update RLS policies for admin actions
-- Allow admins to update any user's profile
DROP POLICY IF EXISTS "Allow admin update access" ON public.users;
CREATE POLICY "Allow admin update access" ON public.users FOR UPDATE
  USING ( public.is_current_user_creator() )
  WITH CHECK ( public.is_current_user_creator() );

-- Restrict skill pack updates/deletes to admins
DROP POLICY IF EXISTS "Allow update for admins" ON public.skill_packs;
CREATE POLICY "Allow update for admins" ON public.skill_packs FOR UPDATE
  USING ( public.is_current_user_creator() );
  
DROP POLICY IF EXISTS "Allow delete for admins" ON public.skill_packs;
CREATE POLICY "Allow delete for admins" ON public.skill_packs FOR DELETE
  USING ( public.is_current_user_creator() );

-- =================================================================================
-- NEW: Schema changes for Custom Provider support
-- =================================================================================
-- 24. Add provider column to skill_packs
ALTER TABLE public.skill_packs ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'google';

-- Optional: Run this to migrate existing skills based on model names.
-- UPDATE public.skill_packs SET provider = 'openai' WHERE base_model LIKE 'gpt%';


-- =================================================================================
-- NEW: RPC function for cost tracking
-- =================================================================================

CREATE OR REPLACE FUNCTION public.get_today_cost(p_user_id uuid)
RETURNS numeric AS $$
DECLARE
  total_cost numeric;
BEGIN
  -- Ensure the user calling this can only get their own cost
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'User is not authorized to perform this action';
  END IF;

  SELECT COALESCE(SUM(m.cost), 0)
  INTO total_cost
  FROM public.messages m
  JOIN public.sessions s ON m.session_id = s.id
  WHERE s.user_id = p_user_id
  AND m.created_at >= date_trunc('day', now() at time zone 'utc');
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_today_cost(uuid) TO authenticated;


-- =================================================================================
-- NEW: SQL for Multi-modal and Search Grounding
-- =================================================================================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS skill_packs_used TEXT[];
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS grounding_chunks JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
*/
// =================================================================================
// END OF DATABASE SETUP
// =================================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

const supabaseUrl = 'https://myrvolwpcyddgipnkxfj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cnZvbHdwY3lkZGdpcG5reGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDMzODgsImV4cCI6MjA3MTExOTM4OH0.PxEusbseDkOjQyqejgszTkzusihflbAKsaNCyj-bEVI';

// Type definition for our database schema.
// This helps with TypeScript type safety when interacting with Supabase.
export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          session_id: string
          content: string
          role: 'user' | 'assistant'
          timestamp: string
          skill_packs_used: string[] | null
          created_at: string
          cost: number | null
          tokens_in: number | null
          tokens_out: number | null
          image_data: string | null
          grounding_chunks: Json | null
          is_pinned: boolean | null
        }
        Insert: {
          session_id: string
          content: string
          role: 'user' | 'assistant'
          timestamp: string
          skill_packs_used?: string[] | null
          cost?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          image_data?: string | null
          grounding_chunks?: Json | null
          is_pinned?: boolean | null
        }
        Update: {
          content?: string
          role?: 'user' | 'assistant'
          timestamp?: string
          skill_packs_used?: string[] | null
          cost?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          image_data?: string | null
          grounding_chunks?: Json | null
          is_pinned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      },
      sessions: {
        Row: {
          id: string
          user_id: string
          name: string
          last_message: string
          timestamp: string
          message_count: number
          is_pinned: boolean
          status: 'active' | 'archived'
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
          last_message: string
          timestamp: string
          message_count: number
          is_pinned?: boolean
          status?: 'active' | 'archived'
        }
        Update: {
          name?: string
          last_message?: string
          timestamp?: string
          message_count?: number
          is_pinned?: boolean
          status?: 'active' | 'archived'
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      shared_sessions: {
          Row: {
            id: string
            user_id: string
            session_name: string
            messages: Json
            created_at: string
          }
          Insert: {
            user_id: string
            session_name: string
            messages: Json
          }
          Update: {}
          Relationships: [
            {
              foreignKeyName: "shared_sessions_user_id_fkey"
              columns: ["user_id"]
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
      },
      skill_pack_reviews: {
          Row: {
            id: string
            skill_pack_id: string
            user_id: string
            rating: number
            content: string | null
            created_at: string
          }
          Insert: {
            skill_pack_id: string
            user_id: string
            rating: number
            content?: string | null
          }
          Update: {
            rating?: number
            content?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "skill_pack_reviews_skill_pack_id_fkey"
              columns: ["skill_pack_id"]
              referencedRelation: "skill_packs"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "skill_pack_reviews_user_id_fkey"
              columns: ["user_id"]
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
      },
      skill_packs: {
        Row: {
            id:string;
            name: string;
            description: string;
            category: string;
            author: string;
            version: string;
            rating: number;
            downloads: number;
            price: number;
            purchase_type: 'free' | 'one-time';
            icon: string;
            tags: string[];
            prompt_template: string | null;
            system_instructions: string | null;
            provider: string;
            base_model: string;
            lora_url: string | null;
            cost_per_1k_tokens: number;
            permissions: string[] | null;
            tests: Json | null;
            skill_type: 'prompt' | 'code-enhanced';
            preprocessing_code: string | null;
            postprocessing_code: string | null;
            created_at: string;
            is_featured: boolean;
            status: 'published' | 'unpublished' | 'archived';
        }
        Insert: {
            id?: string; // id is optional on insert
            name: string;
            description: string;
            category: string;
            author: string;
            version: string;
            rating: number;
            downloads: number;
            price: number;
            purchase_type: 'free' | 'one-time';
            icon: string;
            tags: string[];
            prompt_template?: string | null;
            system_instructions?: string | null;
            provider: string;
            base_model: string;
            lora_url?: string | null;
            cost_per_1k_tokens: number;
            permissions?: string[] | null;
            tests?: Json | null;
            skill_type: 'prompt' | 'code-enhanced';
            preprocessing_code?: string | null;
            postprocessing_code?: string | null;
            is_featured?: boolean;
            status?: 'published' | 'unpublished' | 'archived';
        }
        Update: {
            name?: string;
            description?: string;
            category?: string;
            author?: string;
            version?: string;
            rating?: number;
            downloads?: number;
            price?: number;
            purchase_type?: 'free' | 'one-time';
            icon?: string;
            tags?: string[];
            prompt_template?: string | null;
            system_instructions?: string | null;
            provider?: string;
            base_model?: string;
            lora_url?: string | null;
            cost_per_1k_tokens?: number;
            permissions?: string[] | null;
            tests?: Json | null;
            skill_type?: 'prompt' | 'code-enhanced';
            preprocessing_code?: string | null;
            postprocessing_code?: string | null;
            is_featured?: boolean;
            status?: 'published' | 'unpublished' | 'archived';
        }
        Relationships: []
      },
      support_tickets: {
        Row: {
            id: string;
            user_id: string | null;
            type: string;
            subject: string;
            description: string;
            status: 'open' | 'in_progress' | 'closed';
            created_at: string;
        }
        Insert: {
            user_id: string;
            type: string;
            subject: string;
            description: string;
        }
        Update: {
            status?: 'open' | 'in_progress' | 'closed';
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      user_installed_skills: {
          Row: {
            id: string
            user_id: string
            skill_pack_id: string
            is_active: boolean
            installed_version: string | null
            created_at: string
          },
          Insert: {
              user_id: string
              skill_pack_id: string
              is_active?: boolean
              installed_version?: string | null
          },
          Update: {
              is_active?: boolean
              installed_version?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "user_installed_skills_skill_pack_id_fkey"
              columns: ["skill_pack_id"]
              referencedRelation: "skill_packs"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "user_installed_skills_user_id_fkey"
              columns: ["user_id"]
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
      },
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          is_creator: boolean;
          stripe_connected: boolean;
          created_at: string;
          notification_preferences: Json;
          integrations: Json;
        }
        Insert: {
          id: string;
          name: string;
          email: string;
          is_creator?: boolean;
          stripe_connected?: boolean;
          notification_preferences?: Json;
          integrations?: Json;
        },
        Update: {
          name?: string;
          is_creator?: boolean;
          stripe_connected?: boolean;
          notification_preferences?: Json;
          integrations?: Json;
        }
        Relationships: []
      }
    },
    Views: {
      [_ in never]: never
    },
    Functions: {
      ensure_user_profile_exists: {
        Args: {},
        Returns: undefined
      },
      get_admin_dashboard_data: {
          Args: {},
          Returns: Json
      },
      get_skill_packs_with_stats: {
        Args: { p_user_id: string },
        Returns: {
            id: string;
            name: string;
            description: string;
            category: string;
            author: string;
            version: string;
            rating: number;
            downloads: number;
            price: number;
            purchase_type: 'free' | 'one-time';
            icon: string;
            tags: string[];
            prompt_template: string | null;
            system_instructions: string | null;
            provider: string;
            base_model: string;
            lora_url: string | null;
            cost_per_1k_tokens: number;
            permissions: string[] | null;
            tests: Json | null;
            skill_type: 'prompt' | 'code-enhanced';
            preprocessing_code: string | null;
            postprocessing_code: string | null;
            created_at: string;
            is_featured: boolean;
            status: 'published' | 'unpublished' | 'archived';
            average_rating: number;
            review_count: number;
            is_installed: boolean;
            is_active: boolean;
            installed_version: string | null;
        }[]
      },
      get_today_cost: {
        Args: { p_user_id: string },
        Returns: number
      },
    },
    Enums: {
      [_ in never]: never
    },
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);