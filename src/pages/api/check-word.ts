import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { loadDictionary } from '../../lib/dictionaryLoader';
import { calculateWordScore } from '../../lib/scoreCalculator';
import { getRateLimitStatus, getClientIp } from '../../lib/rateLimiter';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus('check-word:' + ip, 60, 60 * 1000);
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
    const { word } = body;

    if (!word || typeof word !== 'string') {
      return new Response(JSON.stringify({ error: 'Word is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clean = word
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    if (clean.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid word' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [twl, sowpods, enable] = await Promise.all([
      loadDictionary('TWL'),
      loadDictionary('SOWPODS'),
      loadDictionary('ENABLE'),
    ]);

    const result = {
      word: clean,
      validInTWL: twl.has(clean),
      validInSOWPODS: sowpods.has(clean),
      validInENABLE: enable.has(clean),
      scores: {
        twl: calculateWordScore(clean, 'TWL'),
        sowpods: calculateWordScore(clean, 'SOWPODS'),
        enable: calculateWordScore(clean, 'ENABLE'),
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    logger.error('API Error in /api/check-word:', e);
    return new Response(
      JSON.stringify({ error: 'An unexpected internal server error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
