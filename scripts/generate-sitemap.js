const fs = require('fs');
const axios = require('axios');

(async () => {
  try {
    const API = process.env.VITE_API_BASE || 'https://careerinstartup.onrender.com';
    const jobsRes = await axios.get(`${API}/api/jobs`);
    const jobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];

    const staticUrls = [
      { url: '/', priority: 1.0 },
      { url: '/admin', priority: 0.5 },
      { url: '/jobs', priority: 0.8 }
    ];

    const urls = staticUrls.concat(
      jobs.map((j) => ({ url: `/job/${j.id}`, lastmod: j.updated_at || j.created_at }))
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `\n  <url>\n    <loc>https://careerinstartup.app${u.url}</loc>\n    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority ?? 0.6}</priority>\n  </url>`).join('')}\n</urlset>`;

    if (!fs.existsSync('./dist')) fs.mkdirSync('./dist', { recursive: true });
    fs.writeFileSync('./dist/sitemap.xml', xml, 'utf8');
    console.log('sitemap.xml written to ./dist/sitemap.xml');
  } catch (err) {
    console.error('Sitemap generation failed', err.message || err);
    process.exit(1);
  }
})();
