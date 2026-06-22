import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock virtual modules for Vitest
vi.mock('astro:middleware', () => ({
  defineMiddleware: (fn: any) => fn,
  sequence: (...middlewares: any[]) => {
    return async (context: any, next: any) => {
      let index = 0;
      const execute = async (): Promise<any> => {
        if (index >= middlewares.length) {
          return next();
        }
        const middleware = middlewares[index++];
        return middleware(context, execute);
      };
      return execute();
    };
  },
}));

import { POST as checkWordPost } from '../src/pages/api/check-word';
import { GET as definitionGet } from '../src/pages/api/definition';
import { POST as logErrorPost } from '../src/pages/api/log-error';
import { onRequest as middlewareOnRequest } from '../src/middleware';

import { fetchWordDefinition } from '../src/lib/definition';

// Mock getRateLimitStatus to bypass rate limiting during endpoint tests
vi.mock('../src/lib/rateLimiter', () => ({
  getRateLimitStatus: vi.fn().mockResolvedValue({ success: true, count: 1, limit: 100, remaining: 99, reset: 0 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Mock fetchWordDefinition for definition endpoint testing
vi.mock('../src/lib/definition', () => ({
  fetchWordDefinition: vi.fn(),
}));

describe('/api/check-word endpoint', () => {
  it('should return 400 if word parameter is missing', async () => {
    const request = new Request('http://localhost/api/check-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await checkWordPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Word is required');
  });

  it('should return 400 if word parameter is empty or non-alphabetical', async () => {
    const request = new Request('http://localhost/api/check-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: '1234' }),
    });
    const response = await checkWordPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid word');
  });

  it('should return 200 and valid dict matches for a valid word', async () => {
    const request = new Request('http://localhost/api/check-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'CAT' }),
    });
    const response = await checkWordPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.word).toBe('CAT');
    expect(body.validInTWL).toBe(true);
    expect(body.scores.twl).toBe(5);
  });
});

describe('/api/definition endpoint', () => {
  it('should return 400 if word searchParam is missing', async () => {
    const request = new Request('http://localhost/api/definition');
    const response = await definitionGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Word parameter is required');
  });

  it('should return 400 if word searchParam is invalid', async () => {
    const request = new Request('http://localhost/api/definition?word=123');
    const response = await definitionGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid word');
  });

  it('should return 200 and mocked definition payload on success', async () => {
    const mockDef = {
      word: 'DOG',
      definitions: [{ partOfSpeech: 'noun', synonyms: [], antonyms: [], definitions: [{ definition: 'A canine.' }] }],
      source: 'Mock Dict',
    };
    vi.mocked(fetchWordDefinition).mockResolvedValueOnce(mockDef as any);

    const request = new Request('http://localhost/api/definition?word=DOG');
    const response = await definitionGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.word).toBe('DOG');
    expect(body.source).toBe('Mock Dict');
    expect(body.definitions[0].partOfSpeech).toBe('noun');
  });
});

describe('/api/log-error endpoint', () => {
  it('should return 413 if content-length is too large', async () => {
    const request = new Request('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Length': '6000' },
      body: 'a'.repeat(6000),
    });
    const response = await logErrorPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(413);
  });

  it('should return 400 if body JSON is invalid', async () => {
    const request = new Request('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    });
    const response = await logErrorPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
  });

  it('should return 400 if fields are wrong types', async () => {
    const request = new Request('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 1234 }), // Should be string
    });
    const response = await logErrorPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
  });

  it('should return 200 for a valid error log', async () => {
    const request = new Request('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'TypeError', stack: 'at main.js:1:1', url: 'http://localhost/' }),
    });
    const response = await logErrorPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
  });
});

describe('Astro CORS Middleware', () => {
  const mockNext = vi.fn().mockResolvedValue(new Response('NextCalled'));

  beforeEach(() => {
    mockNext.mockClear();
  });

  it('should bypass CORS checks for non-API routes', async () => {
    const context = {
      request: new Request('http://localhost/about'),
    };
    const response = (await middlewareOnRequest(context as any, mockNext)) as Response;
    expect(mockNext).toHaveBeenCalled();
    const text = await response.text();
    expect(text).toBe('NextCalled');
  });

  it('should bypass CORS checks in local development', async () => {
    const context = {
      request: new Request('http://localhost/api/check-word', {
        headers: { host: 'localhost:3000' },
      }),
    };
    await middlewareOnRequest(context as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should block non-local requests with missing origin/referer', async () => {
    const context = {
      request: new Request('http://production.com/api/check-word', {
        headers: { host: 'production.com' },
      }),
    };
    const response = (await middlewareOnRequest(context as any, mockNext)) as Response;
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('CORS policy: Direct API access not allowed.');
  });

  it('should allow requests with permitted origin', async () => {
    const context = {
      request: new Request('http://production.com/api/check-word', {
        headers: {
          host: 'production.com',
          origin: 'https://www.scrabblewordfinder.com',
        },
      }),
    };
    await middlewareOnRequest(context as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should allow requests with permitted referer', async () => {
    const context = {
      request: new Request('http://production.com/api/check-word', {
        headers: {
          host: 'production.com',
          referer: 'https://www.scrabblewordfinder.com/some-page',
        },
      }),
    };
    await middlewareOnRequest(context as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should block requests with forbidden origin', async () => {
    const context = {
      request: new Request('http://production.com/api/check-word', {
        headers: {
          host: 'production.com',
          origin: 'https://malicious-site.com',
        },
      }),
    };
    const response = (await middlewareOnRequest(context as any, mockNext)) as Response;
    expect(response.status).toBe(403);
  });
});
