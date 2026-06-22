import { SITE_URL } from '@lib/config';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const sitemaps = [
    'sitemap-0.xml',
    'sitemaps/tools.xml',
    'sitemaps/lengths.xml',
    'sitemaps/starting-letters.xml',
    'sitemaps/ending-letters.xml',
    'sitemaps/contains-letters.xml',
    'sitemaps/words-index.xml',
    'sitemaps/blog.xml',
  ];

  for (const sitemap of sitemaps) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${SITE_URL}/${sitemap}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
};
