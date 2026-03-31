-- Copy and paste this into your Supabase Dashboard SQL Editor and hit Run.

-- 1. Grant usage on the public schema (you already ran this, but it's safe to run again)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant table-level permissions to anon and authenticated roles.
-- (Row Level Security policies will then restrict exactly which rows they can see/edit)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. Grant sequence permissions so auto-increment/UUID generation works properly
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Set Default Privileges so any FUTURE tables you create automatically get these grants!
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
