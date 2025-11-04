-- Add passout column to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS passout integer;

-- Optional index for passout filtering
CREATE INDEX IF NOT EXISTS idx_jobs_passout ON jobs(passout);
