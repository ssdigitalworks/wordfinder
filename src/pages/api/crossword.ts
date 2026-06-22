import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { solveCrossword } from '../../lib/wordEngine';
import { getRateLimitStatus, getClientIp } from '../../lib/rateLimiter';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus('crossword:' + ip, 30, 60 * 1000);
  if (!rateLimit.success) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfter),
      },
    });
  }

  try {
    const body = await request.json();
    const { pattern, dictionary = 'TWL' } = body;

    if (
      typeof dictionary !== 'string' ||
      !['TWL', 'SOWPODS', 'ENABLE'].includes(dictionary.toUpperCase())
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid dictionary parameter. Must be TWL, SOWPODS, or ENABLE.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const upperDict = dictionary.toUpperCase() as 'TWL' | 'SOWPODS' | 'ENABLE';

    if (!pattern || typeof pattern !== 'string') {
      return new Response(JSON.stringify({ error: 'Pattern is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanPattern = pattern.replace(/[^A-Za-z.?]/g, '');
    if (cleanPattern.length < 2 || cleanPattern.length > 15) {
      return new Response(
        JSON.stringify({
          error: 'Enter a pattern of 2-15 characters (use dots or question marks for blanks)',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const results = await solveCrossword(cleanPattern, upperDict);
    return new Response(JSON.stringify({ results, count: results.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    logger.error('API Error in /api/crossword:', e);
    return new Response(
      JSON.stringify({ error: 'An unexpected internal server error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
