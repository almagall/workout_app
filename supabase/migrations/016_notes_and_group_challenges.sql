-- Migration 016: Workout notes, group challenges, and expanded challenge types

-- 1. Add freeform notes fields
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS note_tags TEXT[];

ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS exercise_notes TEXT;

-- 2. Expand challenge types (drop old constraint, add new)
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_challenge_type_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_challenge_type_check
  CHECK (challenge_type IN ('workout_count', 'e1rm', 'total_volume', 'consistency'));

-- 3. Group challenges
CREATE TABLE IF NOT EXISTS group_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,
  challenge_type TEXT CHECK (challenge_type IN ('workout_count', 'e1rm', 'total_volume', 'consistency')),
  exercise_name TEXT,
  duration_days INTEGER DEFAULT 7,
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_challenge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('invited', 'accepted', 'declined')) DEFAULT 'invited',
  final_score NUMERIC(10,2),
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE group_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenge_members DISABLE ROW LEVEL SECURITY;
