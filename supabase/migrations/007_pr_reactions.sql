-- PR reactions (kudos) for social features

-- Store reactions on friends' PRs
CREATE TABLE IF NOT EXISTS pr_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  template_day_id UUID NOT NULL,
  workout_date DATE NOT NULL,
  pr_type TEXT NOT NULL CHECK (pr_type IN ('heaviestSet', 'e1RM')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  -- One reaction per user per specific PR
  UNIQUE(from_user_id, to_user_id, exercise_name, template_day_id, workout_date, pr_type)
);

CREATE INDEX IF NOT EXISTS idx_pr_reactions_to_user ON pr_reactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_pr_reactions_from_user ON pr_reactions(from_user_id);

-- Add metadata column to notifications for pr_kudos details
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update notifications type constraint to include pr_kudos
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('friend_request', 'friend_accepted', 'pr_kudos'));
