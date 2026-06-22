import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { fetchWordDefinition } from '../../lib/definition';
import { getRateLimitStatus, getClientIp } from '../../lib/rateLimiter';

export const prerender = false;

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  // Rate limit: 60 requests per minute
  const rateLimit = await getRateLimitStatus('definition:' + ip, 60, 60 * 1000);
  if (!rateLimit.success) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfter),
      },
    });
  }

  const url = new URL(request.url);
  const word = url.searchParams.get('word');

  if (!word || typeof word !== 'string') {
    return new Response(JSON.stringify({ error: 'Word parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanWord = word
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (cleanWord.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid word' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await fetchWordDefinition(cleanWord);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
      },
    });
  } catch (e: unknown) {
    logger.error('API Error in /api/definition:', e);
    // Graceful degradation instead of 500 error
    return new Response(
      JSON.stringify({ definitions: [], source: '' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
