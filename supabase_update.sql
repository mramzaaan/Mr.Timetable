-- Update timetables table to include allow_edit column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_attribute 
                   WHERE  attrelid = 'timetables'::regclass 
                   AND    attname = 'allow_edit' 
                   AND    NOT attisdropped) THEN
        ALTER TABLE timetables ADD COLUMN allow_edit BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update timetables table to include allow_edit_emails column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_attribute 
                   WHERE  attrelid = 'timetables'::regclass 
                   AND    attname = 'allow_edit_emails' 
                   AND    NOT attisdropped) THEN
        ALTER TABLE timetables ADD COLUMN allow_edit_emails TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Ensure real-time is enabled for timetables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE timetables, profiles;
COMMIT;

-- Update RLS policies for better permission handling
DROP POLICY IF EXISTS "Users can view relevant timetables" ON timetables;
CREATE POLICY "Users can view relevant timetables" ON timetables
    FOR SELECT USING (
        created_by = auth.jwt() ->> 'email' OR
        teacher_email @> ARRAY[auth.jwt() ->> 'email'] OR
        allow_edit_emails @> ARRAY[auth.jwt() ->> 'email']
    );

DROP POLICY IF EXISTS "Owners and editors can update timetables" ON timetables;
CREATE POLICY "Owners and editors can update timetables" ON timetables
    FOR UPDATE USING (
        created_by = auth.jwt() ->> 'email' OR
        allow_edit_emails @> ARRAY[auth.jwt() ->> 'email']
    );
