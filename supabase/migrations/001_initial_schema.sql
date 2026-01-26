-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE plan_type AS ENUM ('hypertrophy', 'strength');
CREATE TYPE performance_status AS ENUM ('overperformed', 'met_target', 'underperformed');

-- Workout Templates Table
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Template Days Table
CREATE TABLE template_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  day_label TEXT NOT NULL,
  day_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Template Exercises Table
CREATE TABLE template_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_day_id UUID NOT NULL REFERENCES template_days(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Progressive Overload Settings Table
CREATE TABLE progressive_overload_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL,
  settings_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, plan_type)
);

-- Workout Sessions Table
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_day_id UUID NOT NULL REFERENCES template_days(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  overall_performance_rating NUMERIC(3, 1),
  overall_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Exercise Logs Table
CREATE TABLE exercise_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight NUMERIC(6, 2) NOT NULL,
  reps INTEGER NOT NULL,
  rpe NUMERIC(3, 1) NOT NULL CHECK (rpe >= 1 AND rpe <= 10),
  target_weight NUMERIC(6, 2),
  target_reps INTEGER,
  target_rpe NUMERIC(3, 1),
  performance_status performance_status,
  exercise_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_template_days_template_id ON template_days(template_id);
CREATE INDEX idx_template_exercises_template_day_id ON template_exercises(template_day_id);
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_template_day_id ON workout_sessions(template_day_id);
CREATE INDEX idx_workout_sessions_workout_date ON workout_sessions(workout_date);
CREATE INDEX idx_exercise_logs_session_id ON exercise_logs(session_id);
CREATE INDEX idx_exercise_logs_exercise_name ON exercise_logs(exercise_name);
CREATE INDEX idx_progressive_overload_settings_user_id ON progressive_overload_settings(user_id);

-- Enable Row Level Security
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressive_overload_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_templates
CREATE POLICY "Users can view their own templates"
  ON workout_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON workout_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON workout_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON workout_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for template_days
CREATE POLICY "Users can view their own template days"
  ON template_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_days.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own template days"
  ON template_days FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_days.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own template days"
  ON template_days FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_days.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own template days"
  ON template_days FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE workout_templates.id = template_days.template_id
      AND workout_templates.user_id = auth.uid()
    )
  );

-- RLS Policies for template_exercises
CREATE POLICY "Users can view their own template exercises"
  ON template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM template_days
      JOIN workout_templates ON workout_templates.id = template_days.template_id
      WHERE template_days.id = template_exercises.template_day_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own template exercises"
  ON template_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM template_days
      JOIN workout_templates ON workout_templates.id = template_days.template_id
      WHERE template_days.id = template_exercises.template_day_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own template exercises"
  ON template_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM template_days
      JOIN workout_templates ON workout_templates.id = template_days.template_id
      WHERE template_days.id = template_exercises.template_day_id
      AND workout_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own template exercises"
  ON template_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM template_days
      JOIN workout_templates ON workout_templates.id = template_days.template_id
      WHERE template_days.id = template_exercises.template_day_id
      AND workout_templates.user_id = auth.uid()
    )
  );

-- RLS Policies for progressive_overload_settings
CREATE POLICY "Users can view their own settings"
  ON progressive_overload_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON progressive_overload_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON progressive_overload_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON progressive_overload_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for workout_sessions
CREATE POLICY "Users can view their own sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for exercise_logs
CREATE POLICY "Users can view their own exercise logs"
  ON exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own exercise logs"
  ON exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own exercise logs"
  ON exercise_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own exercise logs"
  ON exercise_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON workout_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progressive_overload_settings_updated_at BEFORE UPDATE ON progressive_overload_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
