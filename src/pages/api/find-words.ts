import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { findWords } from '../../lib/wordEngine';
import { getRateLimitStatus, getClientIp } from '../../lib/rateLimiter';

export const prerender = false;

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus('find-words:' + ip, 60, 60 * 1000);
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
    const url = new URL(request.url);
    const letters = url.searchParams.get('letters');
    const dict = url.searchParams.get('dict');
    const minLengthParam = url.searchParams.get('minLength');
    const maxLengthParam = url.searchParams.get('maxLength');
    const startsWith = url.searchParams.get('startsWith') || undefined;
    const endsWith = url.searchParams.get('endsWith') || undefined;
    const contains = url.searchParams.get('contains') || undefined;

    if (!letters) {
      return new Response(JSON.stringify({ error: 'letters parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!dict) {
      return new Response(JSON.stringify({ error: 'dict parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const upperDict = dict.toUpperCase();
    if (upperDict !== 'TWL' && upperDict !== 'SOWPODS' && upperDict !== 'ENABLE') {
      return new Response(JSON.stringify({ error: 'dict must be TWL, SOWPODS, or ENABLE' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanedLetters = letters.toUpperCase().replace(/[^A-Z?]/g, '');
    if (cleanedLetters.length === 0 || cleanedLetters.length > 15) {
      return new Response(JSON.stringify({ error: 'letters must be between 1 and 15 letters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const blankCount = (cleanedLetters.match(/\?/g) || []).length;
    if (blankCount > 2) {
      return new Response(JSON.stringify({ error: 'Maximum 2 blank tiles allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let minLength = 2;
    if (minLengthParam) {
      const val = parseInt(minLengthParam, 10);
      if (isNaN(val) || val < 1) {
        return new Response(JSON.stringify({ error: 'minLength must be a positive integer' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      minLength = val;
    }

    let maxLength = cleanedLetters.length;
    if (maxLengthParam) {
      const val = parseInt(maxLengthParam, 10);
      if (isNaN(val) || val < minLength) {
        return new Response(
          JSON.stringify({ error: 'maxLength must be an integer >= minLength' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      maxLength = val;
    }

    if (startsWith && !/^[A-Za-z]+$/.test(startsWith)) {
      return new Response(JSON.stringify({ error: 'startsWith must contain only letters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (endsWith && !/^[A-Za-z]+$/.test(endsWith)) {
      return new Response(JSON.stringify({ error: 'endsWith must contain only letters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (contains && !/^[A-Za-z]+$/.test(contains)) {
      return new Response(JSON.stringify({ error: 'contains must contain only letters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const words = await findWords({
      letters: cleanedLetters,
      dictionary: upperDict as 'TWL' | 'SOWPODS' | 'ENABLE',
      minLength,
      maxLength,
      startsWith,
      endsWith,
      mustInclude: contains,
    });

    return new Response(JSON.stringify({ words }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    logger.error('API Error in /api/find-words:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected internal server error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
