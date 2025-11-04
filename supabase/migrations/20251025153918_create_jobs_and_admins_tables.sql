/*
  # Create Jobs and Admins Tables for Carrer IN Startup

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `title` (text) - Job title/role
      - `company` (text) - Company name
      - `logo_url` (text) - Company logo URL
      - `country` (text) - Country where job is located
      - `location` (text) - City/region
      - `description` (text) - Job description
      - `apply_link` (text) - External application URL
      - `status` (text) - pending/published/rejected
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `admins`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Admin email
      - `password_hash` (text) - Hashed password
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Jobs: Public read access for published jobs, admin-only write access
    - Admins: No public access, admin operations handled via Edge Functions

  3. Important Notes
    - Public users can submit jobs (status defaults to 'pending')
    - Only admins can approve/reject/publish jobs
    - Job listings are filtered to show only 'published' status
*/

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  logo_url text,
  country text NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  apply_link text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Jobs policies
-- Public can view published jobs
CREATE POLICY "Anyone can view published jobs"
  ON jobs FOR SELECT
  USING (status = 'published');

-- Public can insert jobs (they will be pending)
CREATE POLICY "Anyone can submit jobs"
  ON jobs FOR INSERT
  WITH CHECK (status = 'pending');

-- Only service role can update jobs (admin operations via Edge Functions)
CREATE POLICY "Service role can update jobs"
  ON jobs FOR UPDATE
  USING (false);

-- Only service role can delete jobs
CREATE POLICY "Service role can delete jobs"
  ON jobs FOR DELETE
  USING (false);

-- Admins policies - no public access (handled via Edge Functions with service role)
CREATE POLICY "No public access to admins"
  ON admins FOR ALL
  USING (false);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);