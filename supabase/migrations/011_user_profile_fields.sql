-- Add profile fields for analytics and strength standards
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2);
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS bodyweight NUMERIC(5,2);
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS bodyweight_unit VARCHAR(3) DEFAULT 'lbs';
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS training_experience VARCHAR(20);
ALTER TABLE simple_users ADD COLUMN IF NOT EXISTS email TEXT;

-- Create bodyweight history table for tracking weight over time
CREATE TABLE IF NOT EXISTS bodyweight_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES simple_users(user_id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL,
  weight_unit VARCHAR(3) DEFAULT 'lbs',
  log_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX idx_bodyweight_history_user_date ON bodyweight_history(user_id, log_date);

-- Update simple_users.bodyweight automatically when new bodyweight_history entry is added
CREATE OR REPLACE FUNCTION update_current_bodyweight()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE simple_users 
  SET bodyweight = NEW.weight, bodyweight_unit = NEW.weight_unit
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_current_bodyweight
AFTER INSERT ON bodyweight_history
FOR EACH ROW
EXECUTE FUNCTION update_current_bodyweight();
