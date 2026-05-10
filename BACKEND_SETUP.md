# Supabase Backend Setup Prompt

Copy and paste this prompt into your favorite AI or use it to manually configure your Supabase project.

---

## Part 1: SQL Migration Script

Execute this in your Supabase SQL Editor to create the necessary tables and enable realtime.

```sql
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

-- 2. Create Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'teacher',
    can_edit BOOLEAN DEFAULT FALSE,
    default_session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Realtime for Timetables
ALTER PUBLICATION supabase_realtime ADD TABLE timetables;

-- 4. Set up Row Level Security (RLS)
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can do everything
CREATE POLICY "Owners have full access" ON public.timetables
    FOR ALL
    USING (auth.jwt() ->> 'email' = created_by)
    WITH CHECK (auth.jwt() ->> 'email' = created_by);

-- Policy: Teachers with permission can read
CREATE POLICY "Shared users can read" ON public.timetables
    FOR SELECT
    USING (
        (auth.jwt() ->> 'email' = ANY(teacher_email)) OR
        (auth.jwt() ->> 'email' = ANY(allow_edit_emails)) OR
        allow_edit = true
    );

-- Policy: Teachers with explicit edit permission can update
CREATE POLICY "Editors can update" ON public.timetables
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = ANY(allow_edit_emails))
    WITH CHECK (auth.jwt() ->> 'email' = ANY(allow_edit_emails));

-- 5. Profile Trigger for New Users
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
```

---

## Part 2: Configuration Instructions

1.  **Enable Google Auth**: Go to `Authentication` -> `Providers` -> `Google` and follow the instructions to set up your Google Client ID and Secret.
2.  **Add Domain to Redirects**: Ensure your App URL (from AI Studio Preview) is added to the `Redirect URLs` in the Supabase Auth settings.
3.  **Environment Variables**:
    -   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    -   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon/Public Key.
