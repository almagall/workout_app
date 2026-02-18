-- Per-exercise strength/hypertrophy override. NULL = use template plan_type.
ALTER TABLE template_exercises
  ADD COLUMN IF NOT EXISTS focus TEXT CHECK (focus IN ('strength', 'hypertrophy'));
