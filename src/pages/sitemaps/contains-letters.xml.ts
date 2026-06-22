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

  // 1. Single letter containings (/words-containing-a to z)
  for (const letter of alphabet) {
    xml += '  <url>\n';
    xml += `    <loc>${host}/words-containing-${letter}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  // 2. Common containing substrings
  const containings = [
    'th',
    'he',
    'an',
    'in',
    'er',
    're',
    'on',
    'at',
    'es',
    'ea',
    'st',
    'ou',
    'ow',
    'ch',
    'sh',
    'ph',
    'gh',
    'oo',
    'ee',
    'ai',
    'ay',
    'ab',
    'ing',
    'tion',
    'ly',
    'ness',
  ];
  for (const p of containings) {
    xml += '  <url>\n';
    xml += `    <loc>${host}/words-containing-${p}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  // 3. Common prefixes (/words-starting-with-[prefix])
  const prefixes = [
    'un',
    're',
    'in',
    'dis',
    'de',
    'sub',
    'pre',
    'pro',
    'con',
    'ad',
    'ex',
    'over',
    'mis',
    'non',
    'anti',
    'mono',
    'multi',
    'semi',
    'inter',
    'trans',
    'super',
    'under',
  ];
  for (const p of prefixes) {
    xml += '  <url>\n';
    xml += `    <loc>${host}/words-starting-with-${p}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  // 4. Common suffixes (/words-ending-in-[suffix] & /words-that-end-in/[suffix])
  const suffixes = [
    'er',
    'ed',
    'ing',
    'tion',
    'ly',
    'ness',
    'ment',
    'able',
    'ful',
    'less',
    'ous',
    'ive',
    'que',
    'ize',
    'ise',
    'ism',
    'ist',
    'al',
    'ic',
    'ity',
    'logy',
    'ship',
    'hood',
  ];
  for (const p of suffixes) {
    xml += '  <url>\n';
    xml += `    <loc>${host}/words-ending-in-${p}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';

    xml += '  <url>\n';
    xml += `    <loc>${host}/words-that-end-in/${p}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  // 5. Special high-value Scrabble combination pages (like /scrabble-words-with/q/and/z, etc.)
  const highValue = ['q', 'z', 'x', 'j', 'k'];
  for (const l1 of highValue) {
    for (const l2 of alphabet) {
      if (l1 !== l2) {
        xml += '  <url>\n';
        xml += `    <loc>${host}/scrabble-words-with/${l1}/and/${l2}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';

        xml += '  <url>\n';
        xml += `    <loc>${host}/scrabble-words-with/${l1}/and-no/${l2}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
    }
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
