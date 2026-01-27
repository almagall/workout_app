-- Simple Users Table (for cross-device sync)
-- This table stores username/password mappings so users can sign in from any device

CREATE TABLE IF NOT EXISTS simple_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_simple_users_username ON simple_users(username);
CREATE INDEX IF NOT EXISTS idx_simple_users_user_id ON simple_users(user_id);

-- Disable RLS (access control handled in application layer)
ALTER TABLE simple_users DISABLE ROW LEVEL SECURITY;
