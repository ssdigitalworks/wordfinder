import { SITE_URL } from '@lib/config';
import type { APIRoute } from 'astro';
import { loadMergedWordList } from '../../lib/dictionaryLoader';

export const prerender = false;

export const GET: APIRoute = async () => {
  const allWords = await loadMergedWordList();
  const count = allWords.length;
  const sitemapCount = Math.ceil(count / 50000);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (let i = 1; i <= sitemapCount; i++) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${new URL(`/sitemaps/words-${i}.xml`, SITE_URL).href}</loc>\n`;
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
