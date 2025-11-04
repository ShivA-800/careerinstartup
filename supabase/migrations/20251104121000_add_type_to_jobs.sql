-- Add type column to jobs table (job vs internship)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'job' CHECK (type IN ('job', 'internship'));

CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
