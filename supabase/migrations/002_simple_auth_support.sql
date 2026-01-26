-- Migration to support simple auth system (TEXT user_id instead of UUID)
-- This allows the app to work with localStorage-based auth while using Supabase for data storage

-- Step 1: Drop ALL policies on all tables (must be done before altering columns)
-- Drop policies on exercise_logs first (they depend on workout_sessions)
DROP POLICY IF EXISTS "Users can view their own exercise logs" ON exercise_logs CASCADE;
DROP POLICY IF EXISTS "Users can insert their own exercise logs" ON exercise_logs CASCADE;
DROP POLICY IF EXISTS "Users can update their own exercise logs" ON exercise_logs CASCADE;
DROP POLICY IF EXISTS "Users can delete their own exercise logs" ON exercise_logs CASCADE;

-- Drop policies on workout_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON workout_sessions CASCADE;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON workout_sessions CASCADE;
DROP POLICY IF EXISTS "Users can update their own sessions" ON workout_sessions CASCADE;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON workout_sessions CASCADE;

-- Drop policies on progressive_overload_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON progressive_overload_settings CASCADE;
DROP POLICY IF EXISTS "Users can insert their own settings" ON progressive_overload_settings CASCADE;
DROP POLICY IF EXISTS "Users can update their own settings" ON progressive_overload_settings CASCADE;
DROP POLICY IF EXISTS "Users can delete their own settings" ON progressive_overload_settings CASCADE;

-- Drop policies on template_exercises (they depend on template_days)
DROP POLICY IF EXISTS "Users can view their own template exercises" ON template_exercises CASCADE;
DROP POLICY IF EXISTS "Users can insert their own template exercises" ON template_exercises CASCADE;
DROP POLICY IF EXISTS "Users can update their own template exercises" ON template_exercises CASCADE;
DROP POLICY IF EXISTS "Users can delete their own template exercises" ON template_exercises CASCADE;

-- Drop policies on template_days (they depend on workout_templates)
DROP POLICY IF EXISTS "Users can view their own template days" ON template_days CASCADE;
DROP POLICY IF EXISTS "Users can insert their own template days" ON template_days CASCADE;
DROP POLICY IF EXISTS "Users can update their own template days" ON template_days CASCADE;
DROP POLICY IF EXISTS "Users can delete their own template days" ON template_days CASCADE;

-- Drop policies on workout_templates
DROP POLICY IF EXISTS "Users can view their own templates" ON workout_templates CASCADE;
DROP POLICY IF EXISTS "Users can insert their own templates" ON workout_templates CASCADE;
DROP POLICY IF EXISTS "Users can update their own templates" ON workout_templates CASCADE;
DROP POLICY IF EXISTS "Users can delete their own templates" ON workout_templates CASCADE;

-- Drop foreign key constraints
ALTER TABLE workout_templates DROP CONSTRAINT IF EXISTS workout_templates_user_id_fkey;
ALTER TABLE progressive_overload_settings DROP CONSTRAINT IF EXISTS progressive_overload_settings_user_id_fkey;
ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_user_id_fkey;

-- Change user_id columns from UUID to TEXT
ALTER TABLE workout_templates ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE progressive_overload_settings ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE workout_sessions ALTER COLUMN user_id TYPE TEXT;

-- Disable RLS (we'll handle access control in the application layer)
ALTER TABLE workout_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE progressive_overload_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs DISABLE ROW LEVEL SECURITY;
