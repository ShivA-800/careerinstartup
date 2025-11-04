// Build API endpoints. Prefer VITE_API_BASE (Render/Netlify backend) or
// VITE_FUNCTIONS_BASE (Supabase Edge Functions). Do NOT fall back to
// VITE_SUPABASE_URL here — that caused accidental attempts to call
// <project>.supabase.co/api/... which doesn't exist and triggers CORS errors.
const backendBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_FUNCTIONS_BASE || null;

export const EDGE_FUNCTIONS = {
  // Render/Express server expects /api/* — only build when backendBase is present
  adminLogin: backendBase ? `${backendBase.replace(/\/$/, '')}/api/admin-login` : '',
  adminJobs: backendBase ? `${backendBase.replace(/\/$/, '')}/api/jobs` : '',
  adminGoogleLogin: backendBase ? `${backendBase.replace(/\/$/, '')}/api/admin-google/login` : '',
  adminSettings: backendBase ? `${backendBase.replace(/\/$/, '')}/api/admin/settings` : '',
  publicSettings: backendBase ? `${backendBase.replace(/\/$/, '')}/api/settings` : '',
};

// Helper to indicate whether a backend base is configured
export const HAS_BACKEND = Boolean(backendBase);
