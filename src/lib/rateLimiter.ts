import { logger } from '../lib/logger';
import { Redis } from '@upstash/redis';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitInfo>();
let lastCleanTime = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // clean every 5 minutes

export interface RateLimitStatus {
  success: boolean;
  retryAfter: number; // seconds remaining until reset
}

// Initialize Upstash Redis client if environment variables are present
const kvUrl =
  process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  kvUrl && kvToken
    ? new Redis({
        url: kvUrl,
        token: kvToken,
      })
    : null;

if (redis) {
  logger.info('Rate Limiter: Using Upstash Redis database.');
} else {
  if (import.meta.env.PROD) {
    throw new Error(
      'CRITICAL SECURITY FAULT: Rate limiting Redis is not configured. In-memory rate limiting does not work in serverless environments. You MUST set KV_REST_API_URL and KV_REST_API_TOKEN in production.'
    );
  }
  logger.info('Rate Limiter: Using local in-memory fallback.');
}

/**
 * Detailed check returning rate limit status and remaining seconds.
 * Automatically prunes expired records in the background to prevent memory leaks.
 */
export async function getRateLimitStatus(
  ip: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitStatus> {
  const now = Date.now();

  if (redis) {
    try {
      const key = `rate_limit:${ip}`;
      // Atomic: increment first, then check — no race condition
      const newCount = await redis.incr(key);
      if (newCount === 1) {
        // First request in this window — set the expiry
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      if (newCount > limit) {
        const ttl = await redis.ttl(key);
        return {
          success: false,
          retryAfter: ttl > 0 ? ttl : Math.ceil(windowMs / 1000),
        };
      }
      return { success: true, retryAfter: 0 };
    } catch (err) {
      logger.error('Upstash Redis Rate Limit error, falling back to memory:', err);
    }
  } else {
    // IMPORTANT: In-memory rate limiting does NOT work in serverless environments
    // (Vercel, Netlify, AWS Lambda) because each function invocation may get a
    // fresh instance with an empty map. Configure KV_REST_API_URL and
    // KV_REST_API_TOKEN environment variables in Vercel to enable Redis.
    logger.warn(
      '[RateLimiter] WARNING: Using in-memory fallback. Rate limiting is NOT reliable in serverless. Set up Upstash Redis.',
    );
  }

  // In-memory fallback (only reliable in long-running server environments)
  if (now - lastCleanTime > CLEANUP_INTERVAL_MS) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) rateLimitMap.delete(key);
    }
    lastCleanTime = now;
  }

  let rateInfo = rateLimitMap.get(ip);
  if (!rateInfo || now > rateInfo.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, retryAfter: 0 };
  }
  if (rateInfo.count >= limit) {
    return { success: false, retryAfter: Math.ceil(Math.max(0, rateInfo.resetTime - now) / 1000) };
  }
  rateInfo.count++;
  return { success: true, retryAfter: 0 };
}

/**
 * Checks if a given IP address exceeds the allowed request limit.
 * Keeps backward compatibility for existing code.
 */
export async function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const status = await getRateLimitStatus(ip, limit, windowMs);
  return status.success;
}

/**
 * Resolves the client's real IP address securely, prioritizing Astro clientAddress (set by the Vercel adapter),
 * then Vercel's x-real-ip, and falling back to the first address in x-forwarded-for.
 */
export function getClientIp(request: Request, clientAddress: string | undefined): string {
  if (clientAddress && clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    return clientAddress;
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return clientAddress || 'unknown';
}
