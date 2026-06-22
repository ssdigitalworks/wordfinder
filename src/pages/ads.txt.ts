import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const adsenseClientId =
    import.meta.env.PUBLIC_ADSENSE_CLIENT_ID || 'pub-[YOUR_PUBLISHER_ID_HERE]';
  // Strip 'ca-' prefix if present, e.g. 'ca-pub-12345' -> 'pub-12345'
  const pubId = adsenseClientId.startsWith('ca-') ? adsenseClientId.substring(3) : adsenseClientId;

  const content = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
