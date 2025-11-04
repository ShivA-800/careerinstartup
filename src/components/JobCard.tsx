import { ExternalLink, MapPin, Globe } from 'lucide-react';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  onFilterByPassout?: (year: number) => void;
}

export default function JobCard({ job, onFilterByPassout }: JobCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-900/50">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 flex-shrink-0 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
          {job.logo_url ? (
            <img src={job.logo_url} alt={`${job.company} logo`} className="w-full h-full object-contain" />
          ) : (
            <span className="text-zinc-500 text-2xl font-bold">{job.company.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-white mb-2 truncate">{job.title}</h3>
          <p className="text-lg text-zinc-300 mb-3 font-medium">{job.company}</p>

          <div className="flex flex-wrap gap-3 mb-4 text-sm text-zinc-400">
            <div className="flex items-center gap-1">
              <Globe size={16} />
              <span>{job.country}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span>{job.location}</span>
            </div>
            {job.type && <span className="ml-1 px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">{job.type === 'internship' ? 'Internship' : 'Job'}</span>}
            {job.passout && (
              <button
                onClick={() => onFilterByPassout?.(Number(job.passout))}
                title={`Filter by passout ${job.passout}`}
                className="ml-1 px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs border border-zinc-700 hover:bg-zinc-700"
              >
                Passout {job.passout}
              </button>
            )}
          </div>

          <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{job.description}</p>

          <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-zinc-200 transition-colors">
            Apply Now <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
