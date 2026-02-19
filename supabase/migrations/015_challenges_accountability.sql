-- 1v1 Workout Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id TEXT NOT NULL,
  challenged_id TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('workout_count', 'e1rm')),
  exercise_name TEXT,
  duration_days INTEGER NOT NULL DEFAULT 7,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled')),
  winner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX idx_challenges_status ON challenges(status);

-- Accountability Partners / Shared Streaks
CREATE TABLE accountability_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_both_trained_week TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, partner_id)
);

CREATE INDEX idx_accountability_requester ON accountability_pairs(requester_id);
CREATE INDEX idx_accountability_partner ON accountability_pairs(partner_id);
CREATE INDEX idx_accountability_status ON accountability_pairs(status);

-- Extend notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'friend_request', 'friend_accepted', 'pr_kudos', 'pr_comment', 'achievement_unlocked',
    'challenge_received', 'challenge_accepted', 'challenge_completed',
    'accountability_request', 'accountability_accepted', 'accountability_nudge'
  ));

ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_pairs DISABLE ROW LEVEL SECURITY;
