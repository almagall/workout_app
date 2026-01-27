-- Add set_type to exercise_logs: 'warmup' | 'working' | 'cooldown'
-- Only working sets count for ratings, feedback, targets, and progressive overload logic.
-- Default 'working' for backward compatibility with existing rows.

ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS set_type TEXT DEFAULT 'working';

UPDATE exercise_logs SET set_type = 'working' WHERE set_type IS NULL;

ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_set_type_check;
ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_set_type_check
  CHECK (set_type IN ('warmup', 'working', 'cooldown'));
