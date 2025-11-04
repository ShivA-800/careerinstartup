#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
  const conn = process.env.PG_CONNECTION_STRING || process.env.SUPABASE_DB_URL;
  if (!conn) {
    console.error('Please set PG_CONNECTION_STRING (or SUPABASE_DB_URL) environment variable to your Postgres connection string');
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), '..', '..', 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No migration files found in', migrationsDir);
    return;
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    for (const file of files) {
      const full = path.join(migrationsDir, file);
      console.log('Running migration:', file);
      const sql = fs.readFileSync(full, 'utf8');
      await client.query(sql);
      console.log('Applied', file);
    }
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
