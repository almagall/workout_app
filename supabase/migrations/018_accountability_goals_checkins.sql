-- Weekly workout goal per person in a pair
ALTER TABLE accountability_pairs
  ADD COLUMN IF NOT EXISTS requester_weekly_goal int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS partner_weekly_goal int DEFAULT NULL;

-- Short check-in messages between accountability partners
CREATE TABLE IF NOT EXISTS accountability_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES accountability_pairs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(message) <= 160),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accountability_checkins ENABLE ROW LEVEL SECURITY;

-- Pair members can read and write check-ins for their own pairs
-- Note: accountability_pairs uses TEXT for requester_id/partner_id, so cast auth.uid()
CREATE POLICY "pair members can read write checkins"
  ON accountability_checkins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM accountability_pairs ap
      WHERE ap.id = pair_id
        AND (ap.requester_id = auth.uid()::text OR ap.partner_id = auth.uid()::text)
    )
  );

-- Index for fast lookup by pair
CREATE INDEX IF NOT EXISTS accountability_checkins_pair_id_idx ON accountability_checkins (pair_id, created_at DESC);
