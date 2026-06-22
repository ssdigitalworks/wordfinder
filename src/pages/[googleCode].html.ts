import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { googleCode } = params;

  // Strict alphanumeric validation to prevent XSS
  if (!googleCode || !/^google[a-f0-9]{10,}$/i.test(googleCode)) {
    return new Response('Not Found', { status: 404 });
  }

  const content = `google-site-verification: ${googleCode}.html\n`;
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
