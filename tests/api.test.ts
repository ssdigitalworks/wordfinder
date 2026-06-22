import { describe, it, expect, vi } from 'vitest';
import { GET as findWordsGet } from '../src/pages/api/find-words';
import { POST as contactPost } from '../src/pages/api/contact';
import { POST as wordlePost } from '../src/pages/api/wordle';
import { POST as crosswordPost } from '../src/pages/api/crossword';
import { getRateLimitStatus } from '../src/lib/rateLimiter';

// Mock getRateLimitStatus to bypass rate limiting during tests
vi.mock('../src/lib/rateLimiter', () => ({
  getRateLimitStatus: vi.fn().mockResolvedValue({ success: true, count: 1, limit: 10, remaining: 9, reset: 0 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

describe('/api/find-words endpoint validation', () => {
  it('should return 400 if letters parameter is missing', async () => {
    const request = new Request('http://localhost/api/find-words?dict=TWL');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('letters parameter is required');
  });

  it('should return 400 if dict parameter is missing', async () => {
    const request = new Request('http://localhost/api/find-words?letters=CAT');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('dict parameter is required');
  });

  it('should return 400 if dict parameter is invalid', async () => {
    const request = new Request('http://localhost/api/find-words?letters=CAT&dict=INVALID');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('dict must be TWL, SOWPODS, or ENABLE');
  });

  it('should return 400 if letters parameter is empty or > 15 characters', async () => {
    // Empty letters (after regex clean-up of non-alphas)
    const request1 = new Request('http://localhost/api/find-words?letters=123&dict=TWL');
    const response1 = await findWordsGet({ request: request1, clientAddress: '127.0.0.1' } as any);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toBe('letters must be between 1 and 15 letters');

    // Too long letters
    const request2 = new Request('http://localhost/api/find-words?letters=ABCDEFGHIJKLMNOP&dict=TWL');
    const response2 = await findWordsGet({ request: request2, clientAddress: '127.0.0.1' } as any);
    expect(response2.status).toBe(400);
    const body2 = await response2.json();
    expect(body2.error).toBe('letters must be between 1 and 15 letters');
  });

  it('should return 400 if more than 2 blank tiles are used', async () => {
    const request = new Request('http://localhost/api/find-words?letters=CAT???&dict=TWL');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Maximum 2 blank tiles allowed');
  });

  it('should validate filter parameters format', async () => {
    const request = new Request('http://localhost/api/find-words?letters=CAT&dict=TWL&startsWith=123');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('startsWith must contain only letters');
  });

  it('should successfully find words for a valid request', async () => {
    const request = new Request('http://localhost/api/find-words?letters=CAT&dict=TWL');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.words).toBeDefined();
    expect(body.words.length).toBeGreaterThan(0);
  });
});

describe('/api/contact endpoint validation', () => {
  const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'Question about word lists',
    message: 'Hello, I have a question.',
  };

  it('should return 400 if Content-Type is not application/json', async () => {
    const request = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(validPayload),
    });
    const response = await contactPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid request format.');
  });

  it('should validate name length limits', async () => {
    // Missing name
    const request1 = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, name: '' }),
    });
    const response1 = await contactPost({ request: request1, clientAddress: '127.0.0.1' } as any);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toBe('Name is required and must be under 100 characters');

    // Too long name
    const request2 = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, name: 'A'.repeat(101) }),
    });
    const response2 = await contactPost({ request: request2, clientAddress: '127.0.0.1' } as any);
    expect(response2.status).toBe(400);
    const body2 = await response2.json();
    expect(body2.error).toBe('Name is required and must be under 100 characters');
  });

  it('should validate email format and length limits', async () => {
    // Invalid email format
    const request1 = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, email: 'notanemail' }),
    });
    const response1 = await contactPost({ request: request1, clientAddress: '127.0.0.1' } as any);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toBe('A valid email address is required');

    // Too long email
    const request2 = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, email: 'a'.repeat(140) + '@example.com' }),
    });
    const response2 = await contactPost({ request: request2, clientAddress: '127.0.0.1' } as any);
    expect(response2.status).toBe(400);
    const body2 = await response2.json();
    expect(body2.error).toBe('A valid email address is required');
  });

  it('should successfully submit form for a valid request', async () => {
    const request = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await contactPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Your message has been sent successfully!');
  });
});

describe('Rate Limiter', () => {
  it('should return 429 when rate limit is exceeded', async () => {
    vi.mocked(getRateLimitStatus).mockResolvedValueOnce({
      success: false,
      retryAfter: 60,
    });
    const request = new Request('http://localhost/api/find-words?letters=CAT&dict=TWL');
    const response = await findWordsGet({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests. Please try again later.');
  });
});

describe('/api/wordle endpoint validation', () => {
  const validPayload = {
    green: ['', '', '', '', ''],
    yellow: [[], [], [], [], []],
    gray: [],
    dictionary: 'TWL',
  };

  it('should return 400 if dictionary parameter is invalid', async () => {
    const request = new Request('http://localhost/api/wordle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, dictionary: 'INVALID' }),
    });
    const response = await wordlePost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid dictionary parameter. Must be TWL, SOWPODS, or ENABLE.');
  });

  it('should return 400 if green parameter is invalid', async () => {
    const request = new Request('http://localhost/api/wordle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, green: ['', ''] }),
    });
    const response = await wordlePost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Green constraints must be an array of length 5');
  });

  it('should return 400 if yellow parameter is invalid', async () => {
    const request = new Request('http://localhost/api/wordle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, yellow: [] }),
    });
    const response = await wordlePost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Yellow constraints must be an array of length 5 containing letter arrays');
  });

  it('should return 400 if gray parameter is invalid', async () => {
    const request = new Request('http://localhost/api/wordle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, gray: 'not-an-array' }),
    });
    const response = await wordlePost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Gray constraints must be an array');
  });

  it('should successfully solve wordle for valid inputs', async () => {
    const request = new Request('http://localhost/api/wordle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await wordlePost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toBeDefined();
    expect(body.count).toBeDefined();
  });
});

describe('/api/crossword endpoint validation', () => {
  const validPayload = {
    pattern: 'c..',
    dictionary: 'TWL',
  };

  it('should return 400 if dictionary parameter is invalid', async () => {
    const request = new Request('http://localhost/api/crossword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, dictionary: 'INVALID' }),
    });
    const response = await crosswordPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid dictionary parameter. Must be TWL, SOWPODS, or ENABLE.');
  });

  it('should return 400 if pattern parameter is missing', async () => {
    const request = new Request('http://localhost/api/crossword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dictionary: 'TWL' }),
    });
    const response = await crosswordPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Pattern is required');
  });

  it('should return 400 if pattern parameter length is invalid', async () => {
    // Too short pattern
    const request1 = new Request('http://localhost/api/crossword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, pattern: 'c' }),
    });
    const response1 = await crosswordPost({ request: request1, clientAddress: '127.0.0.1' } as any);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toBe('Enter a pattern of 2-15 characters (use dots or question marks for blanks)');

    // Too long pattern
    const request2 = new Request('http://localhost/api/crossword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, pattern: 'c' + '.'.repeat(15) }),
    });
    const response2 = await crosswordPost({ request: request2, clientAddress: '127.0.0.1' } as any);
    expect(response2.status).toBe(400);
    const body2 = await response2.json();
    expect(body2.error).toBe('Enter a pattern of 2-15 characters (use dots or question marks for blanks)');
  });

  it('should successfully solve crossword for a valid request', async () => {
    const request = new Request('http://localhost/api/crossword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await crosswordPost({ request, clientAddress: '127.0.0.1' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toBeDefined();
    expect(body.count).toBeDefined();
  });
});
