-- Training goals: users can set public goals visible to friends
CREATE TABLE IF NOT EXISTS training_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 100),
  exercise_name text,
  target_value numeric,
  goal_type text NOT NULL DEFAULT 'custom', -- 'e1rm' | 'weight' | 'streak' | 'custom'
  target_date date,
  note text CHECK (char_length(note) <= 300),
  is_achieved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_goals ENABLE ROW LEVEL SECURITY;

-- Users can manage their own goals
CREATE POLICY "users manage own goals"
  ON training_goals FOR ALL
  USING (user_id = auth.uid());

-- Friends can read each other's goals (friend_requests uses TEXT for user ids)
CREATE POLICY "friends can read goals"
  ON training_goals FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE fr.status = 'accepted'
        AND (
          (fr.from_user_id = auth.uid()::text AND fr.to_user_id = user_id::text)
          OR (fr.to_user_id = auth.uid()::text AND fr.from_user_id = user_id::text)
        )
    )
  );

CREATE INDEX IF NOT EXISTS training_goals_user_id_idx ON training_goals (user_id, created_at DESC);
