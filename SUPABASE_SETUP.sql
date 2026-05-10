-- SUPABASE BACKEND SETUP FOR MR. TIMETABLE
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. EXTEND SESSIONS TABLE FOR ROBUST PERMISSIONS
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS allow_edit_emails TEXT[] DEFAULT '{}';

-- 2. CREATE TEACHER ACCESS TABLE (FOR ROSTER MANAGEMENT)
CREATE TABLE IF NOT EXISTS public.teacher_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id TEXT NOT NULL,
  school_name TEXT NOT NULL,
  teacher_email TEXT NOT NULL,
  teacher_name TEXT,
  role TEXT DEFAULT 'teacher', -- 'admin', 'teacher'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(school_id, teacher_email)
);

-- ENABLE RLS ON NEW TABLE
ALTER TABLE public.teacher_access ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR TEACHER ACCESS
CREATE POLICY "Teachers can view their own access records" 
ON public.teacher_access FOR SELECT 
USING (teacher_email = auth.jwt() ->> 'email');

CREATE POLICY "School admins can manage teacher access" 
ON public.teacher_access FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE public.sessions.school_id = public.teacher_access.school_id 
    AND public.sessions.owner_id = auth.uid()
  )
);

-- 3. STORAGE SETUP
-- Note: Buckets often need to be created via UI or a dedicated script, 
-- but we can set up policies here assuming a bucket 'school-data' exists.
-- You should manually create a bucket named 'school-data' in Supabase Storage.

-- Policy: Allow authenticated users to manage files in their school's folder
-- Path format: school_id/timetable.json
CREATE POLICY "Manage school data" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'school-data')
WITH CHECK (bucket_id = 'school-data');

-- 4. VIEW FOR AGGREGATED ACCESS (Optional but useful)
CREATE OR REPLACE VIEW teacher_timetable_view AS
  SELECT s.id as session_id, s.name, s.data, ta.teacher_email, ta.role as access_role
  FROM public.sessions s
  JOIN public.teacher_access ta ON s.school_id = ta.school_id;

-- 5. FUNCTION TO HANDLES JSON UPDATE
CREATE OR REPLACE FUNCTION update_timetable_json()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_timetable_modtime ON public.sessions;
CREATE TRIGGER update_timetable_modtime
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_timetable_json();
