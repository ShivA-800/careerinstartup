import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seed(email, password) {
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('admins').insert([{ email, password_hash: hash }]).select().maybeSingle();
  if (error) {
    console.error('Error inserting admin:', error.message || error);
    process.exit(1);
  }
  console.log('Inserted admin:', data);
}

(async () => {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@example.com';
  const password = args[1] || 'changeme123';
  await seed(email, password);
  process.exit(0);
})();
