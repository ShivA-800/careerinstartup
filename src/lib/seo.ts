/* eslint-disable @typescript-eslint/no-explicit-any */
export function injectJobPostingJsonLd(job: any) {
  if (!job) return;
  const json: any = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.created_at || new Date().toISOString(),
    validThrough: job.validThrough || undefined,
    employmentType: job.type === 'internship' ? 'INTERNSHIP' : 'FULL_TIME',
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      sameAs: job.company_url || undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: job.country || undefined,
        addressLocality: job.location || undefined,
      },
    },
    url: `https://careerinstartup.app/job/${job.id}`,
  };

  const id = 'jobposting-jsonld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

export function removeJobPostingJsonLd() {
  const el = document.getElementById('jobposting-jsonld');
  if (el) el.remove();
}
