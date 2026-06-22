import { SITE_URL } from '@lib/config';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const host = SITE_URL;
  const lastmod = new Date().toISOString().split('T')[0];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 1. Core Length Pages (/2-letter-words to /15-letter-words)
  // Note: /2-letter-words is handled by /two-letter-scrabble-words and /3-letter-words by /3-letter-words, but we include them here too
  sitemapXml += '  <url>\n';
  sitemapXml += `    <loc>${host}/two-letter-scrabble-words</loc>\n`;
  sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
  sitemapXml += '    <changefreq>weekly</changefreq>\n';
  sitemapXml += '    <priority>0.8</priority>\n';
  sitemapXml += '  </url>\n';

  sitemapXml += '  <url>\n';
  sitemapXml += `    <loc>${host}/3-letter-words</loc>\n`;
  sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
  sitemapXml += '    <changefreq>weekly</changefreq>\n';
  sitemapXml += '    <priority>0.8</priority>\n';
  sitemapXml += '  </url>\n';

  for (let len = 2; len <= 15; len++) {
    sitemapXml += '  <url>\n';
    sitemapXml += `    <loc>${host}/${len}-letter-words</loc>\n`;
    sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
    sitemapXml += '    <changefreq>weekly</changefreq>\n';
    sitemapXml += '    <priority>0.8</priority>\n';
    sitemapXml += '  </url>\n';
  }

  // 2. Length starting & ending combinations (lengths 2..8, letters a..z)
  const lengths = [2, 3, 4, 5, 6, 7, 8];
  for (const n of lengths) {
    for (const letter of alphabet) {
      // Hyphenated variants (our new clean landing paths)
      sitemapXml += '  <url>\n';
      sitemapXml += `    <loc>${host}/${n}-letter-words-starting-with-${letter}</loc>\n`;
      sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemapXml += '    <changefreq>weekly</changefreq>\n';
      sitemapXml += '    <priority>0.8</priority>\n';
      sitemapXml += '  </url>\n';

      sitemapXml += '  <url>\n';
      sitemapXml += `    <loc>${host}/${n}-letter-words-ending-in-${letter}</loc>\n`;
      sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemapXml += '    <changefreq>weekly</changefreq>\n';
      sitemapXml += '    <priority>0.8</priority>\n';
      sitemapXml += '  </url>\n';

      // Folder variants (legacy indexing support)
      sitemapXml += '  <url>\n';
      sitemapXml += `    <loc>${host}/${n}-letter-words-starting-with/${letter}</loc>\n`;
      sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemapXml += '    <changefreq>weekly</changefreq>\n';
      sitemapXml += '    <priority>0.8</priority>\n';
      sitemapXml += '  </url>\n';

      sitemapXml += '  <url>\n';
      sitemapXml += `    <loc>${host}/${n}-letter-words-ending-in/${letter}</loc>\n`;
      sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemapXml += '    <changefreq>weekly</changefreq>\n';
      sitemapXml += '    <priority>0.8</priority>\n';
      sitemapXml += '  </url>\n';
    }
  }

  sitemapXml += '</urlset>';

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
};
