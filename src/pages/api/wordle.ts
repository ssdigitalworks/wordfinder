import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { solveWordle } from '../../lib/wordEngine';
import { getRateLimitStatus, getClientIp } from '../../lib/rateLimiter';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus('wordle:' + ip, 30, 60 * 1000);
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
    const { green, yellow, gray, dictionary = 'TWL' } = body;

    // Validate inputs
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
    if (!Array.isArray(green) || green.length !== 5) {
      return new Response(
        JSON.stringify({ error: 'Green constraints must be an array of length 5' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (!Array.isArray(yellow) || yellow.length !== 5) {
      return new Response(
        JSON.stringify({
          error: 'Yellow constraints must be an array of length 5 containing letter arrays',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (!Array.isArray(gray)) {
      return new Response(JSON.stringify({ error: 'Gray constraints must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = await solveWordle({
      dictionary: upperDict,
      green: green.map((s) =>
        String(s || '')
          .toUpperCase()
          .trim(),
      ),
      yellow: yellow.map((arr) =>
        Array.isArray(arr)
          ? arr.map((s) =>
              String(s || '')
                .toUpperCase()
                .trim(),
            )
          : [],
      ),
      gray: gray.map((s) =>
        String(s || '')
          .toUpperCase()
          .trim(),
      ),
    });

    return new Response(JSON.stringify({ results, count: results.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    logger.error('API Error in /api/wordle:', e);
    return new Response(
      JSON.stringify({ error: 'An unexpected internal server error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
