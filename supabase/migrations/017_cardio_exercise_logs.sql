-- Cardio support: optional duration and distance on exercise_logs.
-- For resistance exercises these stay null; for cardio, store duration_seconds and optionally distance.

ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS distance NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS distance_unit TEXT;

COMMENT ON COLUMN exercise_logs.duration_seconds IS 'For cardio: duration in seconds. Null for resistance.';
COMMENT ON COLUMN exercise_logs.distance IS 'For cardio: distance (e.g. miles or km). Null for resistance.';
COMMENT ON COLUMN exercise_logs.distance_unit IS 'For cardio: mi or km. Null for resistance.';
