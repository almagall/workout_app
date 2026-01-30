-- Add optional preset_id to workout_templates so we can apply preset-specific target logic (e.g. 5/3/1).
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS preset_id TEXT;
