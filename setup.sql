-- Robust Migration Script for Mr. TMS
-- Execute this in the Supabase SQL Editor

-- 1. Ensure Timetables Table exists with correct structure
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL,
    teacher_email TEXT[] DEFAULT '{}',
    allow_edit BOOLEAN DEFAULT FALSE,
    allow_edit_emails TEXT[] DEFAULT '{}',
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Ensure all columns exist (in case table was created manually elsewhere)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timetables' AND COLUMN_NAME = 'created_at') THEN
        ALTER TABLE public.timetables ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timetables' AND COLUMN_NAME = 'created_by') THEN
        ALTER TABLE public.timetables ADD COLUMN created_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timetables' AND COLUMN_NAME = 'teacher_email') THEN
        ALTER TABLE public.timetables ADD COLUMN teacher_email TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timetables' AND COLUMN_NAME = 'allow_edit') THEN
        ALTER TABLE public.timetables ADD COLUMN allow_edit BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timetables' AND COLUMN_NAME = 'allow_edit_emails') THEN
        ALTER TABLE public.timetables ADD COLUMN allow_edit_emails TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'timetables' AND COLUMN_NAME = 'data') THEN
        ALTER TABLE public.timetables ADD COLUMN data JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'teacher',
    can_edit BOOLEAN DEFAULT FALSE,
    default_session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'timetables'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE timetables;
    END IF;
END $$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Recreate Policies
DROP POLICY IF EXISTS "Owners have full access" ON public.timetables;
DROP POLICY IF EXISTS "Shared users can read" ON public.timetables;
DROP POLICY IF EXISTS "Editors can update" ON public.timetables;

-- Policy: Owners have full access
CREATE POLICY "Owners have full access" ON public.timetables
    FOR ALL
    USING (auth.jwt() ->> 'email' = created_by)
    WITH CHECK (auth.jwt() ->> 'email' = created_by);

-- Policy: Shared users (teachers or explicitly allowed) can see the timetable
CREATE POLICY "Shared users can read" ON public.timetables
    FOR SELECT
    USING (
        (auth.jwt() ->> 'email' = ANY(teacher_email)) OR
        (auth.jwt() ->> 'email' = ANY(allow_edit_emails)) OR
        allow_edit = true
    );

-- Policy: Explicit editors can update
CREATE POLICY "Editors can update" ON public.timetables
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = ANY(allow_edit_emails))
    WITH CHECK (auth.jwt() ->> 'email' = ANY(allow_edit_emails));

-- 7. Profile Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 8. Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'teacher');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
