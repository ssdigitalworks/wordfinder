import { describe, it, expect } from 'vitest';
import { getRateLimitStatus, checkRateLimit, getClientIp } from '../src/lib/rateLimiter';

describe('rateLimiter Unit Tests', () => {
  it('should resolve client IP from parameters and headers correctly', () => {
    const req1 = new Request('http://localhost/', { headers: { 'x-real-ip': '203.0.113.195' } });
    expect(getClientIp(req1, undefined)).toBe('203.0.113.195');

    const req2 = new Request('http://localhost/', { headers: { 'x-forwarded-for': '198.51.100.42, 192.0.2.1' } });
    expect(getClientIp(req2, undefined)).toBe('198.51.100.42');

    const req3 = new Request('http://localhost/');
    expect(getClientIp(req3, '8.8.8.8')).toBe('8.8.8.8');
  });

  it('should perform in-memory rate limiting successfully', async () => {
    const testIp = 'memory-test-ip-' + Math.random();
    // 1st request - allowed
    const status1 = await getRateLimitStatus(testIp, 2, 5000);
    expect(status1.success).toBe(true);

    // 2nd request - allowed
    const status2 = await getRateLimitStatus(testIp, 2, 5000);
    expect(status2.success).toBe(true);

    // 3rd request - blocked
    const status3 = await getRateLimitStatus(testIp, 2, 5000);
    expect(status3.success).toBe(false);
    expect(status3.retryAfter).toBeGreaterThan(0);

    const checkSuccess = await checkRateLimit(testIp, 2, 5000);
    expect(checkSuccess).toBe(false);
  });
});
