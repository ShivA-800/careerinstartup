import { useEffect, useState } from 'react';
import { Mail, ExternalLink } from 'lucide-react';
import { EDGE_FUNCTIONS } from '../lib/supabase';

export default function Footer() {
  const [settings, setSettings] = useState<{ contact_email?: string; footer_text?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch(EDGE_FUNCTIONS.publicSettings);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setSettings(json || {});
      } catch (e) {
        console.error('Failed to load site settings', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const contact = settings?.contact_email || 'shivacherry800888@gmail.com';
  const footerText = settings?.footer_text || 'Connecting founders, builders and opportunities globally.';
  const mailtoHref = `mailto:${contact}?subject=${encodeURIComponent('RSK — Contact from website')}`;

  return (
    <footer className="bg-black border-t border-zinc-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="text-center md:text-left text-zinc-400">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <span className="text-2xl">❤️Shiva Kumar Radharapu</span>
              <span className="text-sm text-zinc-500">Startup Jobs & Internships</span>
            </div>
            <p className="text-sm text-zinc-500">{footerText}</p>
          </div>

          <div className="mt-6 md:mt-0 text-center md:text-right text-zinc-400">
            <div className="flex items-center justify-center md:justify-end gap-4">
              <a href="/terms" className="hover:text-white flex items-center gap-2">
                Terms
                <ExternalLink size={14} />
              </a>
              <a href="/privacy" className="hover:text-white flex items-center gap-2">
                Privacy
                <ExternalLink size={14} />
              </a>
              <a href={mailtoHref} aria-label={`Email ${contact}`} title={`Email ${contact}`} className="hover:text-white flex items-center gap-2">
                <Mail size={14} />
                {/* visually hide raw email but keep it for screen-readers if needed */}
                <span className="sr-only">{contact}</span>
                <span className="text-sm">Contact</span>
              </a>
            </div>

            <p className="text-sm mt-3">© {new Date().getFullYear()} ❤️Shiva Kumar Radharapu. All rights reserved.</p>
          </div>
        </div>

        <div className="mt-6 text-center text-zinc-500 text-sm">
          <p>Post a job for free — tap "Post a Job" at the top. Join our newsletter for curated startup roles.</p>
        </div>
      </div>
    </footer>
  );
}
