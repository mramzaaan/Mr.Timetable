-- 1. Create Timetables Table
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL,
    teacher_email TEXT[] DEFAULT '{}',
    allow_edit BOOLEAN DEFAULT FALSE,
    allow_edit_emails TEXT[] DEFAULT '{}',
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'teacher',
    can_edit BOOLEAN DEFAULT FALSE,
    default_session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Realtime
-- This allows the app to update instantly when permissions change
ALTER PUBLICATION supabase_realtime ADD TABLE timetables;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Timetables RLS Policies

-- Policy: Owners (creators) have full access
CREATE POLICY "Owners have full access" ON public.timetables
    FOR ALL
    USING (auth.jwt() ->> 'email' = created_by)
    WITH CHECK (auth.jwt() ->> 'email' = created_by);

-- Policy: Shared users can read
CREATE POLICY "Shared users can read" ON public.timetables
    FOR SELECT
    USING (
        (auth.jwt() ->> 'email' = ANY(teacher_email)) OR
        (auth.jwt() ->> 'email' = ANY(allow_edit_emails)) OR
        allow_edit = true
    );

-- Policy: Editors can update
CREATE POLICY "Editors can update" ON public.timetables
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = ANY(allow_edit_emails))
    WITH CHECK (auth.jwt() ->> 'email' = ANY(allow_edit_emails));

-- 6. Profile RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 7. Trigger: Automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'teacher');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
