import { createClient } from '@supabase/supabase-js';

// Simple script to seed example jobs into Supabase using the SERVICE_ROLE key.
// Usage (PowerShell):
// $env:SUPABASE_URL='https://...'; $env:SUPABASE_SERVICE_ROLE_KEY='service_role_xxx'; node server/scripts/seed-jobs.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SAMPLE_JOBS = [
  {
    title: 'Frontend Engineer (React/TypeScript)',
    company: 'RippleWorks',
    logo_url: null,
    country: 'India',
    location: 'Remote — India',
    description: 'Build delightful interfaces for our developer tools. Work with React, TypeScript and Tailwind.',
    apply_link: 'https://jobs.rippleworks.example/apply/1',
    status: 'published',
    passout: 2024,
    type: 'job',
  },
  {
    title: 'Growth Marketing Intern',
    company: 'SeedSprint',
    logo_url: null,
    country: 'USA',
    location: 'San Francisco, CA (Hybrid)',
    description: 'Help design and run growth experiments across acquisition channels.',
    apply_link: 'https://jobs.seedsprint.example/apply/2',
    status: 'published',
    passout: 2025,
    type: 'internship',
  },
  {
    title: 'Backend Engineer (Go)',
    company: 'Nimbus Labs',
    logo_url: null,
    country: 'United Kingdom',
    location: 'London (Remote OK)',
    description: 'Design and implement scalable services in Go. Experience with Postgres a plus.',
    apply_link: 'https://jobs.nimbus.example/apply/3',
    status: 'published',
    passout: 2023,
    type: 'job',
  },
];

async function seed() {
  try {
    const now = new Date().toISOString();
    const rows = SAMPLE_JOBS.map(j => ({ ...j, created_at: now, updated_at: now }));
    const { data, error } = await supabase.from('jobs').insert(rows).select();
    if (error) {
      console.error('Seed error:', error.message || error);
      process.exit(1);
    }
    console.log('Inserted jobs:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

seed();
