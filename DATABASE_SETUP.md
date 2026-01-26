# Database Setup Instructions

## Step 1: Cleanup (If You've Run SQL Before)

If you've previously run any SQL in your Supabase project, clean up first:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/000_cleanup.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the cleanup
6. This will remove any existing tables, types, and functions

## Step 2: Running the Migration

To set up the database schema in your Supabase project:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. **Clear the SQL Editor** (remove any previous SQL)
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL Editor
6. Click "Run" to execute the migration

This will create:
- All necessary tables (workout_templates, template_days, template_exercises, workout_sessions, exercise_logs, progressive_overload_settings)
- Row Level Security (RLS) policies to ensure users can only access their own data
- Indexes for optimal query performance
- Triggers for automatic timestamp updates

## Verification

After running the migration, verify the tables were created by:
1. Going to the Table Editor in Supabase
2. You should see all 6 tables listed
3. Check that RLS is enabled on all tables (indicated by a shield icon)

## Important Notes

- The migration includes RLS policies that ensure data isolation between users
- All foreign keys reference `auth.users(id)` for user authentication
- The `exercise_logs` table doesn't have a direct `user_id` column - it's accessed through `workout_sessions`
