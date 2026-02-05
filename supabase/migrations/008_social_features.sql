-- Social features expansion: multiple reactions, comments, user stats

-- 1. Add reaction_type to pr_reactions (multiple reaction types)
ALTER TABLE pr_reactions ADD COLUMN IF NOT EXISTS reaction_type TEXT NOT NULL DEFAULT 'kudos';

-- Add check constraint for reaction_type (drop first if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'pr_reactions_reaction_type_check'
  ) THEN
    ALTER TABLE pr_reactions ADD CONSTRAINT pr_reactions_reaction_type_check 
      CHECK (reaction_type IN ('kudos', 'strong', 'fire'));
  END IF;
END $$;

-- 2. PR Comments table
CREATE TABLE IF NOT EXISTS pr_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  template_day_id UUID NOT NULL,
  workout_date DATE NOT NULL,
  pr_type TEXT NOT NULL CHECK (pr_type IN ('heaviestSet', 'e1RM')),
  comment TEXT NOT NULL CHECK (char_length(comment) <= 200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_pr_comments_to_user ON pr_comments(to_user_id);
CREATE INDEX IF NOT EXISTS idx_pr_comments_pr ON pr_comments(to_user_id, exercise_name, template_day_id, workout_date, pr_type);

-- 3. User stats columns for profiles/leaderboards
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS total_prs INTEGER DEFAULT 0;
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS total_workouts INTEGER DEFAULT 0;

-- 4. Update notifications type constraint for pr_comment
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('friend_request', 'friend_accepted', 'pr_kudos', 'pr_comment'));
