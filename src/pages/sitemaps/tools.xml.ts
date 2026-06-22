import { SITE_URL } from '@lib/config';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const host = SITE_URL;
  const lastmod = new Date().toISOString().split('T')[0];

  const tools = [
    '/anagram-solver',
    '/unscramble-words',
    '/word-generator',
    '/crossword-solver',
    '/wordle-solver',
    '/word-checker',
    '/word-statistics',
    '/word-lists',
    // Original routes to preserve indexing
    '/dictionary-checker',
    '/words-with-friends-cheat',
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const tool of tools) {
    xml += '  <url>\n';
    xml += `    <loc>${host}${tool}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
};
