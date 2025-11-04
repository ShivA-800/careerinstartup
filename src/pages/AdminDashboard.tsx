import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job } from '../types';
import { EDGE_FUNCTIONS } from '../lib/supabase';
import { Plus, Edit2, LogOut } from 'lucide-react';
import PostJobModal from '../components/PostJobModal';

export default function AdminDashboard(): JSX.Element {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('admin_token');
  const adminEmail = localStorage.getItem('admin_email') || '';

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(EDGE_FUNCTIONS.adminJobs, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      
      console.error('Failed to load jobs', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/secure-admin-login');
      return;
    }
    void fetchJobs();
    void fetchSettings();
  }, [fetchJobs, navigate, token]);

  const [isCreating, setIsCreating] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Site settings editable via admin panel
  const [settings, setSettings] = useState<{ contact_email?: string; privacy?: string; terms?: string; footer_text?: string }>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(EDGE_FUNCTIONS.adminSettings, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await res.json();
      setSettings(json || {});
    } catch (e) {
      console.error('Failed to load admin settings', e);
    }
  }, [token]);



  const handleApprove = async (id: string, status: 'published' | 'rejected') => {
    if (!token) return;
    await fetch(`${EDGE_FUNCTIONS.adminJobs}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchJobs();
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    await fetch(`${EDGE_FUNCTIONS.adminJobs}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await fetchJobs();
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    navigate('/secure-admin-login');
  };

  const handleSaveSettings = async () => {
    if (!token) return;
    setSavingSettings(true);
    try {
      const payload = {
        contact_email: settings.contact_email || '',
        privacy: settings.privacy || '',
        terms: settings.terms || '',
        footer_text: settings.footer_text || '',
      };
      const res = await fetch(EDGE_FUNCTIONS.adminSettings, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      await fetchSettings();
      alert('Settings saved');
    } catch (e) {
      console.error('Save settings failed', e);
      alert('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl">Admin Dashboard</h1>
              <div className="text-zinc-400 text-sm">Signed in as {adminEmail}</div>
              <div className="mt-2 text-green-400 text-sm italic">Welcome to the RSK empire....</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              <Plus size={16} />
              Create Job
            </button>

            <button onClick={handleLogout} className="ml-2 px-3 py-1 border border-zinc-700 text-zinc-300 rounded flex items-center gap-2">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 p-4 rounded border border-zinc-800 mb-6">
          <h2 className="text-white text-lg mb-2">Site Settings</h2>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-zinc-400 text-sm">Contact email (used in footer)</label>
            <input
              className="bg-black border border-zinc-800 text-white px-3 py-2 rounded"
              value={settings.contact_email ?? ''}
              onChange={(e) => setSettings(s => ({ ...s, contact_email: e.target.value }))}
              placeholder="shivacherry800888@gmail.com"
            />

            <label className="text-zinc-400 text-sm">Footer text</label>
            <input
              className="bg-black border border-zinc-800 text-white px-3 py-2 rounded"
              value={settings.footer_text ?? ''}
              onChange={(e) => setSettings(s => ({ ...s, footer_text: e.target.value }))}
              placeholder="Connecting founders, builders and opportunities globally."
            />

            <label className="text-zinc-400 text-sm">Privacy policy HTML / text</label>
            <textarea
              rows={4}
              className="bg-black border border-zinc-800 text-white px-3 py-2 rounded"
              value={settings.privacy ?? ''}
              onChange={(e) => setSettings(s => ({ ...s, privacy: e.target.value }))}
            />

            <label className="text-zinc-400 text-sm">Terms & Conditions HTML / text</label>
            <textarea
              rows={4}
              className="bg-black border border-zinc-800 text-white px-3 py-2 rounded"
              value={settings.terms ?? ''}
              onChange={(e) => setSettings(s => ({ ...s, terms: e.target.value }))}
            />

            <div className="flex items-center gap-2">
              <button onClick={handleSaveSettings} disabled={savingSettings} className="px-4 py-2 bg-white text-black rounded">
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              <button onClick={fetchSettings} className="px-4 py-2 border border-zinc-700 text-zinc-200 rounded">Reload</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {jobs.length === 0 && <div className="text-zinc-500">No jobs found.</div>}

          {jobs.map(job => (
            <div key={job.id} className="bg-zinc-900 p-4 rounded border border-zinc-800 flex justify-between items-center">
              <div>
                <div className="text-white font-semibold">{job.title} — {job.company}</div>
                <div className="text-zinc-400 text-sm">{job.location} • {job.country} • {job.passout ?? 'N/A'}</div>
              </div>

              <div className="flex gap-2">
                {job.status === 'pending' && (
                  <>
                    <button onClick={() => void handleApprove(job.id, 'published')} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                    <button onClick={() => void handleApprove(job.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                  </>
                )}
                <button onClick={() => setEditingJob(job)} title="Edit" className="px-3 py-1 bg-zinc-800 text-zinc-200 rounded"> <Edit2 size={14} /> </button>
                <button onClick={() => void handleDelete(job.id)} className="px-3 py-1 bg-gray-700 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {(isCreating || editingJob) && (
        <PostJobModal
          isOpen={Boolean(isCreating || editingJob)}
          job={editingJob ?? undefined}
          onClose={() => {
            setIsCreating(false);
            setEditingJob(null);
          }}
          onSuccess={() => {
            setIsCreating(false);
            setEditingJob(null);
            void fetchJobs();
          }}
        />
      )}
    </div>
  );
}
