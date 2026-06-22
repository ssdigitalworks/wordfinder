import { SITE_URL } from '@lib/config';
import type { APIRoute } from 'astro';
import { loadMergedWordList } from '../../lib/dictionaryLoader';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { index } = params;
  const pageNumber = Number(index);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return new Response('Not Found', { status: 404 });
  }

  const allWords = await loadMergedWordList();

  const start = (pageNumber - 1) * 50000;
  const end = pageNumber * 50000;

  if (start >= allWords.length) {
    return new Response('Not Found', { status: 404 });
  }

  const chunk = allWords.slice(start, end);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const word of chunk) {
    xml += '  <url>\n';
    xml += `    <loc>${new URL(`/word/${word.toLowerCase()}`, SITE_URL).href}</loc>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.6</priority>\n';
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
