import { useState } from 'react';
import { X } from 'lucide-react';
import { EDGE_FUNCTIONS } from '../lib/supabase';

import { useEffect } from 'react';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  job?: import('../types').Job | null;
}

export default function PostJobModal({ isOpen, onClose, onSuccess, job = null }: PostJobModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    logo_url: '',
    country: '',
    location: '',
    description: '',
    apply_link: '',
    passout: '',
    type: 'job',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // initialize form when editing
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        company: job.company || '',
        logo_url: job.logo_url || '',
        country: job.country || '',
        location: job.location || '',
        description: job.description || '',
        apply_link: job.apply_link || '',
        passout: job.passout ? String(job.passout) : '',
        type: job.type || 'job',
      });
      setLogoPreview(job.logo_url || null);
    } else {
      setFormData({
        title: '',
        company: '',
        logo_url: '',
        country: '',
        location: '',
        description: '',
        apply_link: '',
        passout: '',
        type: 'job',
      });
      setLogoPreview(null);
    }
  }, [job]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const adminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const url = job ? `${EDGE_FUNCTIONS.adminJobs}/${job.id}` : EDGE_FUNCTIONS.adminJobs;
      const method = job ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to submit job');
      }

      // reset only when creating; when editing, keep state until close
      if (!job) {
        setFormData({
          title: '',
          company: '',
          logo_url: '',
          country: '',
          location: '',
          description: '',
          apply_link: '',
          passout: '',
          type: 'job',
        });
        setLogoPreview(null);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to submit job');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);
      const API_BASE = import.meta.env.VITE_API_BASE;
      const uploadUrl = API_BASE ? `${API_BASE}/api/upload-logo` : '/api/upload-logo';
      const fd = new FormData();
      fd.append('logo', file, file.name);
      // include admin token if present
      const adminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
      const res = await fetch(uploadUrl, { method: 'POST', body: fd, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      // server returns { signedUrl, path, expiresIn }
      if (data?.path) {
        // store the storage path in the job record (so we can create fresh signed URLs on read)
        setFormData(prev => ({ ...prev, logo_url: data.path }));
        // use the signed URL (if provided) for preview
        if (data?.signedUrl) setLogoPreview(data.signedUrl);
      } else if (data?.signedUrl) {
        // fallback: if server returns only signedUrl
        setFormData(prev => ({ ...prev, logo_url: data.signedUrl }));
        setLogoPreview(data.signedUrl);
      }
    } catch (err: unknown) {
      console.error('Logo upload error', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // show a temporary local preview while uploading
    const url = URL.createObjectURL(f);
    setLogoPreview(url);
    uploadLogo(f);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Post a Job</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              placeholder="e.g. Senior Full Stack Developer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              name="company"
              required
              value={formData.company}
              onChange={handleChange}
              className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              placeholder="e.g. Tech Startup Inc"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Company Logo URL
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              placeholder="https://example.com/logo.png"
            />
            {localStorage.getItem('admin_token') ? (
              <div className="mt-2">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Or upload logo (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e)} className="text-sm text-zinc-400" />
                {uploading && (
                  <div className="mt-2 text-sm text-zinc-400">Uploading...</div>
                )}
                {logoPreview && (
                  <div className="mt-2">
                    <img src={logoPreview} alt="logo preview" className="h-16 w-auto rounded-md border border-zinc-700" />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-zinc-500">
                To upload a logo directly, please log in as an admin. Public users can paste a logo URL above.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Country *
              </label>
              <input
                type="text"
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
                className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                placeholder="e.g. India, USA, UK"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                placeholder="e.g. Bangalore, Remote"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Passout (Year)
              </label>
              <select
                name="passout"
                value={formData.passout}
                onChange={handleChange}
                className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="">Any year</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="job">Job</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Job Description *
            </label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700 resize-none"
              placeholder="Describe the role, requirements, and what you're looking for..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Application Link *
            </label>
            <input
              type="url"
              name="apply_link"
              required
              value={formData.apply_link}
              onChange={handleChange}
              className="w-full bg-zinc-800 text-white px-4 py-2.5 rounded-lg border border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              placeholder="https://example.com/apply"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Job'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-sm text-zinc-500 text-center">
            Your job will be reviewed by our team before being published
          </p>
        </form>
      </div>
    </div>
  );
}
