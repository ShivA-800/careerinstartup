import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EDGE_FUNCTIONS } from '../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  // handle oauth redirect with token in query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const email = params.get('email');
    if (token) {
      localStorage.setItem('admin_token', token);
      if (email) localStorage.setItem('admin_email', email);
      navigate('/admin/dashboard');
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white border rounded-lg p-12 max-w-lg w-full shadow-md text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center border">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L12 7" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 9L18 9" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 15L18 15" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17L12 21" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-black mb-4">Admin Panel</h1>
        <p className="text-sm text-gray-600 mb-6">Secure access for administrators. Please sign in to manage site content.</p>

        <a href={EDGE_FUNCTIONS.adminGoogleLogin} className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-lg">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
