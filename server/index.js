import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Log which Supabase project we're connecting to (safe to show URL)
console.log('Using SUPABASE_URL=', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Ensure 'logos' bucket exists (runs at startup). Uses service role key so it's safe for server-side.
(async function ensureLogosBucket() {
  try {
  // create bucket as private by default for production safety
  const { error } = await supabase.storage.createBucket('logos', { public: false });
    if (error) {
      const msg = (error && error.message) || String(error);
      if (!/already exists|duplicate/i.test(msg)) {
        console.error('Error creating logos bucket:', error);
      } else {
        console.debug('logos bucket already exists');
      }
    } else {
      console.log('Created logos bucket (private)');
    }
  } catch (err) {
    console.error('Failed to ensure logos bucket exists:', err);
  }
})();

// multer in-memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Upload logo endpoint: accepts multipart/form-data with `logo` file field.
// Upload endpoint: require admin token and return a signed URL (private bucket)
app.post('/api/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    const admin = verifyAdminToken(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const filename = `logos/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload to Supabase Storage (private bucket: 'logos')
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message || 'Upload failed' });
    }

    // Create a signed URL valid for 24 hours
    const expiresIn = 60 * 60 * 24; // seconds
    const { data: signedData, error: signedErr } = await supabase.storage.from('logos').createSignedUrl(filename, expiresIn);
    if (signedErr) {
      console.error('Signed URL error:', signedErr);
      return res.status(500).json({ error: signedErr.message || 'Signed URL failed' });
    }

    return res.json({ signedUrl: signedData?.signedUrl || null, path: filename, expiresIn });
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

function getTokenFromReq(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const parts = h.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
}

function verifyAdminToken(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

app.post('/api/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle();

      console.debug('admin-login: fetched admin?', !!admin, 'error?', !!error);
      if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, admin.password_hash);
      console.debug('admin-login: password match?', ok);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ adminId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// Google OAuth flow for admin sign-in
// Google OAuth flow for admin sign-in
app.get('/api/admin-google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).send('GOOGLE_CLIENT_ID not configured');

  // prefer explicit SERVER_BASE env for consistent redirect_uri; fall back to host
  const serverBase = (process.env.SERVER_BASE || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const redirectUri = `${serverBase}/api/admin-google/callback`;

  // debug log to help diagnose redirect_uri_mismatch problems during deploy
  console.log('Google OAuth redirect_uri ->', redirectUri);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');

  res.redirect(authUrl.toString());
});

app.get('/api/admin-google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const serverBase = process.env.SERVER_BASE || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${serverBase.replace(/\/$/, '')}/api/admin-google/callback`;

    if (!clientId || !clientSecret) return res.status(500).send('Google OAuth not configured');

    // Exchange authorization code for tokens
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenResp.json();
    const idToken = tokenJson.id_token;
    if (!idToken) return res.status(500).send('Failed to obtain id_token');

    // Validate id_token via Google's tokeninfo endpoint
    const infoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const info = await infoResp.json();
    const email = info.email;
    const emailVerified = info.email_verified === 'true' || info.email_verified === true;
    if (!email || !emailVerified) return res.status(403).send('Email not verified');

    // Only allow configured admin emails
    const allowed = (process.env.ADMIN_GOOGLE_ALLOWED || process.env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(email)) {
      return res.status(403).send('Email not authorized');
    }

    // Upsert admin row; ensure password_hash exists (random) because schema requires it
    const randomPass = Math.random().toString(36).slice(2, 12);
    const passHash = await bcrypt.hash(randomPass, 10);
    const { data: upserted, error: upsertErr } = await supabase
      .from('admins')
      .upsert({ email, password_hash: passHash }, { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (upsertErr) {
      console.error('Admin upsert error', upsertErr);
      return res.status(500).send('Failed to create admin');
    }

    const adminId = upserted?.id || upserted?.data?.id || null;
    // create JWT for the frontend
    const token = jwt.sign({ adminId: adminId || null, email }, JWT_SECRET, { expiresIn: '24h' });

    // redirect to frontend login handler with token in query params
    const frontendBase = process.env.FRONTEND_BASE || process.env.VITE_API_BASE || (process.env.FRONTEND_URL || '') || `${req.protocol}://${req.get('host')}`;
  const redirectTo = (frontendBase || '').replace(/\/$/, '') + `/secure-admin-login?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    // If frontendBase wasn't configured, just show a small HTML page with token and link
    if (!frontendBase) {
      // send a minimal page that stores token to localStorage and redirects without printing token visibly
      const safeToken = encodeURIComponent(token);
      const safeEmail = encodeURIComponent(email);
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>
      try {
        localStorage.setItem('admin_token', decodeURIComponent('${safeToken}'));
        localStorage.setItem('admin_email', decodeURIComponent('${safeEmail}'));
  // Redirect to secure-admin-login (assumes frontend is served on the same origin)
  window.location.replace('/secure-admin-login');
      } catch (e) {
  // fallback: navigate to secure-admin-login with token as query param (not visible in page body)
  window.location.replace('/secure-admin-login?token=${safeToken}&email=${safeEmail}');
      }
      </script></body></html>`;
      return res.set('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self';").send(html);
    }

    res.redirect(redirectTo);
  } catch (err) {
    console.error('Google callback error', err);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const isAdmin = !!verifyAdminToken(req);
    const { q, role, location, passout, status, page = '1', limit = '20', offset: offsetQuery } = req.query;
    const type = req.query.type;
    const lim = Math.min(500, Math.max(1, Number(limit) || 20));
    const offset = typeof offsetQuery !== 'undefined' ? Math.max(0, Number(offsetQuery)) : (Math.max(Number(page), 1) - 1) * lim;

    let query = supabase.from('jobs').select('*');

    // enforce published for public users; admins may pass status explicitly
    if (!isAdmin) {
      query = query.eq('status', 'published');
    } else if (status) {
      query = query.eq('status', String(status));
    }

    // full-text-ish / substring search across multiple columns
    if (q) {
      const safe = String(q).replace(/%/g, '\\%').replace(/_/g, '\\_');
      // search title, company, location, country, description
      query = query.or(`title.ilike.%${safe}%,company.ilike.%${safe}%,location.ilike.%${safe}%,country.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

  if (role) query = query.ilike('title', `%${String(role)}%`);
  if (location) query = query.ilike('location', `%${String(location)}%`);
  if (type) query = query.eq('type', String(type));
  if (passout) query = query.eq('passout', Number(passout));

    query = query.order('created_at', { ascending: false }).range(offset, offset + lim - 1);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Convert stored logo paths (e.g. 'logos/..') into signed URLs for display
    if (Array.isArray(data) && data.length > 0) {
      const expiresIn = 60 * 60 * 24; // 24 hours
      const rows = await Promise.all(data.map(async (row) => {
        try {
          if (row.logo_url && typeof row.logo_url === 'string' && !/^https?:\/\//i.test(row.logo_url)) {
            const path = row.logo_url;
            const { data: signedData, error: signedErr } = await supabase.storage.from('logos').createSignedUrl(path, expiresIn);
            if (!signedErr && signedData?.signedUrl) {
              return { ...row, logo_url: signedData.signedUrl };
            }
          }
        } catch (e) {
          // ignore per-row errors and return original row
           
          console.error('Signed URL generation failed for', row?.logo_url, e);
        }
        return row;
      }));
      return res.json(rows);
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// Public settings endpoint (used by site footer and public pages)
app.get('/api/settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('site_settings').select('key, value');
    if (error) return res.status(500).json({ error: error.message });
    const obj = {};
    (data || []).forEach((r) => { obj[r.key] = r.value; });
    return res.json(obj);
  } catch (err) {
    console.error('settings read error', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

// Admin-only settings endpoints
app.get('/api/admin/settings', async (req, res) => {
  try {
    const admin = verifyAdminToken(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabase.from('site_settings').select('key, value');
    if (error) return res.status(500).json({ error: error.message });
    const obj = {};
    (data || []).forEach((r) => { obj[r.key] = r.value; });
    return res.json(obj);
  } catch (err) {
    console.error('admin settings read error', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

// Accepts JSON body with keys to upsert, e.g. { contact_email: 'a@b.com', privacy: '...' }
app.post('/api/admin/settings', async (req, res) => {
  try {
    const admin = verifyAdminToken(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const payload = req.body || {};
    const entries = Object.entries(payload).filter(([k, v]) => typeof v === 'string' || typeof v === 'number');
    if (entries.length === 0) return res.status(400).json({ error: 'No valid settings provided' });

    const rows = entries.map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('admin settings upsert error', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const isAdmin = !!verifyAdminToken(req);
    const job = req.body || {};
    job.status = isAdmin ? (job.status || 'published') : 'pending';
    // coerce passout to integer if provided (frontend may send as string)
    // If passout is an empty string the DB will reject it for integer columns
    // so delete the field when it's empty. Otherwise try to coerce to Number
    // and delete if the conversion fails.
    if (typeof job.passout !== 'undefined') {
      if (job.passout === null || job.passout === '') {
        delete job.passout;
      } else {
        job.passout = Number(job.passout);
        if (Number.isNaN(job.passout)) delete job.passout;
      }
    }
    // normalize type field (job | internship)
    if (typeof job.type === 'string') {
      const t = job.type.toLowerCase();
      if (t === 'job' || t === 'internship') job.type = t; else delete job.type;
    } else {
      job.type = job.type || 'job';
    }
    job.created_at = new Date().toISOString();
    const { data, error } = await supabase.from('jobs').insert([job]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

app.put('/api/jobs/:id', async (req, res) => {
  try {
    const admin = verifyAdminToken(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    // coerce passout if present; delete empty-string/null to avoid DB integer cast errors
    if (typeof updates.passout !== 'undefined') {
      if (updates.passout === null || updates.passout === '') {
        delete updates.passout;
      } else {
        updates.passout = Number(updates.passout);
        if (Number.isNaN(updates.passout)) delete updates.passout;
      }
    }
    // normalize type if present
    if (typeof updates.type !== 'undefined' && updates.type !== null && updates.type !== '') {
      const tt = String(updates.type).toLowerCase();
      if (tt === 'job' || tt === 'internship') updates.type = tt; else delete updates.type;
    }
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const admin = verifyAdminToken(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server running on port', port));
