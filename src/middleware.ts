import { SITE_URL } from './lib/config';
import { defineMiddleware, sequence } from 'astro:middleware';
import { isAdminAuthenticated, getSessionSecret, verifyCsrfToken } from './lib/adminAuth';

// ---------------------------------------------------------------------------
// Existing CORS middleware — preserved exactly as-is
// ---------------------------------------------------------------------------
const corsMiddleware = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith('/api/')) {
    const host = context.request.headers.get('host') || '';
    const origin = context.request.headers.get('origin');
    const referer = context.request.headers.get('referer') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.') || host.startsWith('10.') || (import.meta.env.DEV && !import.meta.env.TEST);

    if (isLocal) {
      // Allow all requests in local development
      return await next();
    }

    if (origin) {
      const ALLOWED_ORIGINS = new Set([SITE_URL, 'https://www.scrabblewordfinder.com']);
      if (!ALLOWED_ORIGINS.has(origin)) {
        return new Response(JSON.stringify({ error: 'CORS policy: Origin not allowed.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (referer) {
      const isAllowedReferer =
        referer.startsWith(SITE_URL) || referer.startsWith('https://www.scrabblewordfinder.com');
      if (!isAllowedReferer) {
        return new Response(JSON.stringify({ error: 'CORS policy: Referer not allowed.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // No Origin AND no Referer — block the request.
      // Legitimate browser requests always send at least one of these.
      // Only automated tools / direct API calls omit both headers.
      return new Response(
        JSON.stringify({ error: 'CORS policy: Direct API access not allowed.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  }

  return await next();
});

// ---------------------------------------------------------------------------
// Admin authentication middleware
// Protects /admin/* pages (except /admin/login) and /api/admin/* routes
// (except /api/admin/login)
// ---------------------------------------------------------------------------
const adminAuthMiddleware = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Determine if this path requires admin authentication
  const isAdminPage = path.startsWith('/admin') && path !== '/admin/login';
  const isAdminApi = path.startsWith('/api/admin') && path !== '/api/admin/login';

  if (!isAdminPage && !isAdminApi) {
    return await next();
  }

  const secret = getSessionSecret();
  const cookieHeader = context.request.headers.get('cookie');
  const authResult = isAdminAuthenticated(cookieHeader, secret);

  if (!authResult.valid) {
    // API requests get a 401 JSON response
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Page requests get redirected to login
    return context.redirect('/admin/login');
  }

  // Pass user context down to components/API routes
  context.locals.userPayload = authResult.payload;

  return await next();
});

// ---------------------------------------------------------------------------
// CSRF middleware
// Protects POST/PUT/PATCH/DELETE requests to /api/admin/*
// ---------------------------------------------------------------------------
const csrfMiddleware = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method;

  if (path.startsWith('/api/admin') && path !== '/api/admin/login' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = context.request.headers.get('x-csrf-token');
    const secret = getSessionSecret();
    
    if (!csrfToken || !verifyCsrfToken(csrfToken, secret)) {
      return new Response(JSON.stringify({ error: 'CSRF validation failed.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return await next();
});


// ---------------------------------------------------------------------------
// Compose all middlewares with sequence()
// ---------------------------------------------------------------------------
export const onRequest = sequence(corsMiddleware, adminAuthMiddleware, csrfMiddleware);
