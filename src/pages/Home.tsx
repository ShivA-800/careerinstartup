import { useEffect, useState, useCallback } from 'react';
import { Job } from '../types';
import { EDGE_FUNCTIONS } from '../lib/supabase';
import publicSupabase, { getPublicSupabase } from '../lib/publicSupabase';
import Header from '../components/Header';
import SearchFilters from '../components/SearchFilters';
import JobCard from '../components/JobCard';
import Footer from '../components/Footer';
import PostJobModal from '../components/PostJobModal';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  // keep a copy of the full list we fetched so we can filter by clicking passout badges
  const [fullJobs, setFullJobs] = useState<Job[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dataSourceInfo, setDataSourceInfo] = useState<{
    source: 'backend' | 'supabase' | null;
    latencyMs?: number;
    lastFetchedAt?: string;
  } | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      // If a dedicated backend API is configured (VITE_API_BASE), call it first.
      // Otherwise skip calling <supabase>.co/api/... which does not exist and will 404/CORS.
      const API_BASE = import.meta.env.VITE_API_BASE;
      let fetched: Job[] | null = null;

      if (API_BASE) {
        try {
          const url = new URL(EDGE_FUNCTIONS.adminJobs);
          url.searchParams.set('status', 'published');
          const start = Date.now();
          const res = await fetch(url.toString());
          const latency = Date.now() - start;
          if (res.ok) {
            fetched = (await res.json()) || [];
            setDataSourceInfo({ source: 'backend', latencyMs: latency, lastFetchedAt: new Date().toISOString() });
            console.debug('Jobs fetched from backend', { latencyMs: latency });
          }
        } catch (e) {
          // ignore — we'll try public Supabase fallback below
          console.debug('Backend fetch failed, will try supabase anon fallback', e);
        }
      }

      if (!fetched) {
        // fallback to Supabase public client if available
        if (publicSupabase) {
          const start = Date.now();
          const supa = getPublicSupabase();
          const { data, error } = await supa.from('jobs').select('*').eq('status', 'published').order('created_at', { ascending: false });
          const latency = Date.now() - start;
          if (error) throw error;
          fetched = (data as Job[]) || [];
          setDataSourceInfo({ source: 'supabase', latencyMs: latency, lastFetchedAt: new Date().toISOString() });
          console.debug('Jobs fetched from supabase anon', { latencyMs: latency });
        } else {
          fetched = [];
        }
      }

  setFullJobs(fetched);
  setJobs(fetched);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // keep empty jobs
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobSubmitSuccess = () => {
    setSuccessMessage('Job submitted successfully! It will be reviewed by our team.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Jobs are now fetched from the backend with filters/search applied.
  const filteredJobs = jobs;

  const handleFilterByPassout = (year: number) => {
    setLoading(true);
    try {
      const filtered = fullJobs.filter((j) => j.passout && Number(j.passout) === Number(year));
      setJobs(filtered);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setJobs(fullJobs);
    // increment resetSignal to notify SearchFilters to clear its internal state
    setResetSignal((s) => s + 1);
    setDataSourceInfo(null);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
  <Header onPostJobClick={() => setShowPostJobModal(true)} onBrandClick={clearFilters} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-6">
              {successMessage}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Discover Startup Jobs Globally
            </h2>
            <p className="text-zinc-400 text-lg">
              Find opportunities at innovative startups from India, USA, UK, Singapore, and beyond
            </p>
            {/* Source badge removed — do not reveal backend/storage source to users */}
          </div>

          <SearchFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            resetSignal={resetSignal}
            onApplyFilters={async (f) => {
              // Prefer the explicit search term passed from SearchFilters (debounced) if provided
              const q = f.q ?? searchTerm;
              setSearchTerm(q);

              // Build query and fetch backend published jobs (backend may also filter, but we apply client-side filtering)
              const API_BASE = import.meta.env.VITE_API_BASE;
              let url: URL | null = null;
              if (API_BASE) {
                url = new URL(EDGE_FUNCTIONS.adminJobs);
                url.searchParams.set('status', 'published');
                if (q) url.searchParams.set('q', q);
                if (f.role) url.searchParams.set('role', f.role);
                if (f.location) url.searchParams.set('location', f.location);
                if (f.type) url.searchParams.set('type', f.type);
              }

              setLoading(true);
              try {
                let fetched: Job[] | null = null;

                if (url) {
                  try {
                    const start = Date.now();
                    const res = await fetch(url.toString());
                    const latency = Date.now() - start;
                    if (res.ok) {
                      fetched = (await res.json()) || [];
                      setDataSourceInfo({ source: 'backend', latencyMs: latency, lastFetchedAt: new Date().toISOString() });
                      console.debug('Filtered jobs fetched from backend', { latencyMs: latency });
                    }
                  } catch (e) {
                    console.warn('Backend fetch failed, falling back to supabase anon', e);
                  }
                }

                if (!fetched) {
                  if (publicSupabase) {
                    const start = Date.now();
                    const supa = getPublicSupabase();
                    const { data, error } = await supa.from('jobs').select('*').eq('status', 'published').order('created_at', { ascending: false });
                    const latency = Date.now() - start;
                    if (error) throw error;
                    fetched = (data as Job[]) || [];
                    setDataSourceInfo({ source: 'supabase', latencyMs: latency, lastFetchedAt: new Date().toISOString() });
                    console.debug('Filtered jobs fetched from supabase anon', { latencyMs: latency });
                  } else {
                    fetched = [];
                    setDataSourceInfo(null);
                  }
                }

                const all = fetched;
                setFullJobs(all);

                const passoutFilter = f.passout ? Number(f.passout) : null;
                const qLower = (q || '').toLowerCase();
                const filtered = all.filter(job => {
                  if (qLower) {
                    const hay = `${job.title} ${job.company} ${job.location} ${job.country}`.toLowerCase();
                    if (!hay.includes(qLower)) return false;
                  }
                  if (f.role && !job.title.toLowerCase().includes(f.role.toLowerCase())) return false;
                  if (f.location && !job.location.toLowerCase().includes(f.location.toLowerCase())) return false;
                  if (f.type && job.type && job.type.toLowerCase() !== f.type.toLowerCase()) return false;
                  if (passoutFilter && job.passout && Number(job.passout) !== passoutFilter) return false;
                  return job.status === 'published' || job.status === undefined;
                });

                setJobs(filtered);
              } catch (err) {
                console.error('Error fetching filtered jobs', err);
                setJobs([]);
              } finally {
                setLoading(false);
              }
            }}
          />

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              <p className="text-zinc-400 mt-4">Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 text-lg">
                {searchTerm ? 'No jobs found matching your search' : 'No jobs available yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} onFilterByPassout={handleFilterByPassout} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <PostJobModal
        isOpen={showPostJobModal}
        onClose={() => setShowPostJobModal(false)}
        onSuccess={handleJobSubmitSuccess}
      />
    </div>
  );
}
