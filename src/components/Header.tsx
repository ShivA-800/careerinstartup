import { Link } from 'react-router-dom';

interface HeaderProps {
  onPostJobClick: () => void;
  onBrandClick?: () => void;
}

export default function Header({ onPostJobClick, onBrandClick }: HeaderProps) {
  return (
    <header className="bg-black border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
                <Link
                  to="/"
                  onClick={() => { onBrandClick?.(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="flex items-center"
                  aria-label="Go to homepage"
                >
                  {/* use a very large project logo per request (800x800) */}
                  <img
                    src="/favicon.ico"
                    alt="career IN startup"
                    className="rounded-md object-cover"
                    style={{ width: '170px', height: '65px' }}
                  />
            </Link>
          </div>

          <button
            onClick={onPostJobClick}
            className="bg-white text-black px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            Post a Job
          </button>
        </div>
      </div>
    </header>
  );
}
