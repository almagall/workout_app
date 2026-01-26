-- Cleanup script: Run this BEFORE running 001_initial_schema.sql
-- This will remove any existing tables, types, and policies from previous attempts

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS exercise_logs CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS template_exercises CASCADE;
DROP TABLE IF EXISTS template_days CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS progressive_overload_settings CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS performance_status CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;

-- Note: We don't drop the uuid-ossp extension as it might be used by other parts of Supabase
