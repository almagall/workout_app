-- Add workout duration (seconds) to workout_sessions.
-- Set when user completes a workout; existing rows remain NULL.
ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
