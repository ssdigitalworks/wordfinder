import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { getRateLimitStatus, getClientIp } from '../../lib/rateLimiter';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus('log-error:' + ip, 10, 60 * 1000); // 10 requests per minute

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
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await request.text();
    if (rawBody.length > 5000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const errorLog = JSON.parse(rawBody);

    if (!errorLog || typeof errorLog !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, stack, url } = errorLog;
    if (message !== undefined && typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (stack !== undefined && typeof stack !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid stack format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url !== undefined && typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid url format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.error('[CLIENT ERROR LOGGER]', JSON.stringify(errorLog, null, 2));

    const errorReportingUrl =
      process.env.PUBLIC_ERROR_REPORTING_URL || process.env.ERROR_REPORTING_URL;
    if (errorReportingUrl) {
      try {
        await fetch(errorReportingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorLog),
        });
      } catch (postErr) {
        logger.error('Failed to forward client error to PUBLIC_ERROR_REPORTING_URL:', postErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to process error log' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
