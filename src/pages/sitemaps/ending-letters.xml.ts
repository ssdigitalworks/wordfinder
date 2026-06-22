import { SITE_URL } from '@lib/config';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const host = SITE_URL;
  const lastmod = new Date().toISOString().split('T')[0];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 1. Add /words-ending-in-[letter]
  for (const letter of alphabet) {
    xml += '  <url>\n';
    xml += `    <loc>${host}/words-ending-in-${letter}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  // 2. Add /words-ending-in/[letter] (prerendered folder version)
  for (const letter of alphabet) {
    xml += '  <url>\n';
    xml += `    <loc>${host}/words-ending-in/${letter}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
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
