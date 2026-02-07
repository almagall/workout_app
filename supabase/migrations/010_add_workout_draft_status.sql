-- Add is_complete column to workout_sessions table
-- This allows tracking draft vs completed workouts
ALTER TABLE workout_sessions 
ADD COLUMN is_complete BOOLEAN NOT NULL DEFAULT true;

-- Add index for efficient querying of draft workouts
CREATE INDEX idx_workout_sessions_is_complete ON workout_sessions(is_complete);

-- Add composite index for querying user's draft workouts
CREATE INDEX idx_workout_sessions_user_draft ON workout_sessions(user_id, is_complete);
