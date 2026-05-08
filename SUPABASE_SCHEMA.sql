-- Run this script in the Supabase SQL Editor to set up the necessary tables and policies

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'teacher',
  can_edit BOOLEAN DEFAULT false,
  default_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_date TEXT,
  end_date TEXT,
  school_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable row level security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. Enable Realtime for the sessions table to allow instant syncing
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- 5. Profiles Policies
-- Allow anyone to read profiles (or limit to authenticated if preferred)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'teacher');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We drop the trigger first to make the script idempotent (rerunnable)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sessions Policies
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions FOR SELECT USING (true);

CREATE POLICY "Users can insert own session" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner and editors can update session" ON public.sessions FOR UPDATE USING (
  auth.uid() = owner_id OR 
  coalesce((data->'admins')::jsonb, '[]'::jsonb) ? (auth.jwt() ->> 'email') OR
  coalesce((data->'editors')::jsonb, '[]'::jsonb) ? (auth.jwt() ->> 'email')
);

CREATE POLICY "Owner can delete session" ON public.sessions FOR DELETE USING (auth.uid() = owner_id);
