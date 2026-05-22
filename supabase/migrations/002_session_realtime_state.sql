-- Add session reconciliation fields for cross-device realtime sync
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS current_phase_index INTEGER DEFAULT 0;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS phase_end_at TIMESTAMPTZ;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS pause_remaining_ms INTEGER;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_in_forced_trough BOOLEAN DEFAULT FALSE;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS pause_count_used INTEGER DEFAULT 0;