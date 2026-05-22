-- Add single-writer lease fields to sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS leader_id TEXT;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS leader_expires_at TIMESTAMPTZ;