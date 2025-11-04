import { Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface Filters {
  role: string;
  passout: string;
  location: string;
  type: string;
  q?: string;
}

 
interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (_value: string) => void;
  onApplyFilters?: (_filters: Filters) => void;
  // resetSignal increments to tell the component to clear its internal state
  resetSignal?: number;
}
 

export default function SearchFilters({ searchTerm, onSearchChange, onApplyFilters, resetSignal }: SearchFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    role: '',
    passout: '',
    location: '',
    type: '',
  });
  const lastAppliedRef = useRef<string | null>(null);

  const handleChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const payload = { ...filters, q: searchTerm };
    onApplyFilters?.(payload);
    lastAppliedRef.current = JSON.stringify(payload);
  };

  // Auto-apply filters (debounced) when filters or searchTerm change
  useEffect(() => {
    if (!onApplyFilters) return;
    const payload = { ...filters, q: searchTerm };
    // avoid re-applying identical filters repeatedly
    if (lastAppliedRef.current === JSON.stringify(payload)) return;

    const t = setTimeout(() => {
      onApplyFilters(payload);
      lastAppliedRef.current = JSON.stringify(payload);
    }, 300);
    return () => clearTimeout(t);
  }, [filters, searchTerm, onApplyFilters]);

  // reset local filters when parent increments resetSignal
  useEffect(() => {
    if (typeof resetSignal === 'number') {
      setFilters({ role: '', passout: '', location: '', type: '' });
    }
  }, [resetSignal]);

  const inputBase = 'w-full bg-zinc-800 text-white px-4 py-3 rounded-full border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-400';

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="bg-zinc-900 rounded-2xl p-6">
        <div className="mb-4 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by role, company, location, or country..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-full pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-sm font-semibold text-zinc-300 mb-2 block">Role:</label>
            <input
              className={inputBase + ' placeholder:text-zinc-400'}
              placeholder="Any role"
              value={filters.role}
              onChange={(e) => handleChange('role', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-300 mb-2 block">Location:</label>
            <input
              className={inputBase + ' placeholder:text-zinc-400'}
              placeholder="Any city or Remote"
              value={filters.location}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-300 mb-2 block">Passout (Year):</label>
            <select
              className={inputBase}
              value={filters.passout}
              onChange={(e) => handleChange('passout', e.target.value)}
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
            <label className="text-sm font-semibold text-zinc-300 mb-2 block">Type:</label>
            <select
              className={inputBase}
              value={filters.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="">Any</option>
              <option value="job">Job</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 flex items-center justify-center md:justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setFilters({ role: '', passout: '', location: '', type: '' });
                const payload = { role: '', passout: '', location: '', type: '', q: '' };
                onApplyFilters?.(payload);
                lastAppliedRef.current = JSON.stringify(payload);
              }}
              className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-700 hover:bg-zinc-700"
            >
              Clear filters
            </button>

            <button
              type="submit"
              className="ml-4 bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              Find matches
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
