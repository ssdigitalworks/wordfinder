import { logger } from '../../../lib/logger';
export const prerender = false;

import type { APIRoute } from 'astro';
import { getRateLimitStatus, getClientIp } from '../../../lib/rateLimiter';
import {
  verifyCsrfToken,
  verifyPassword,
  getPasswordHash,
  getSessionSecret,
  createSessionCookie,
  buildSessionSetCookie,
  hashPassword
} from '../../../lib/adminAuth';
import { db } from '@db/client';
import { users, auditLogs } from '@db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }).max(254),
  password: z.string().min(6).max(128),
  csrfToken: z.string().min(10).max(256),
});

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const ip = getClientIp(request, context.clientAddress);

  // Rate Limit: 10 attempts per 15 minutes
  const rateLimitWindowMs = 15 * 60 * 1000;
  const rateLimitLimit = 10;

  const rateLimitStatus = await getRateLimitStatus('login:' + ip, rateLimitLimit, rateLimitWindowMs);
  if (!rateLimitStatus.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many attempts. Please try again later.',
        rateLimit: {
          remaining: 0,
          resetTime: new Date(Date.now() + rateLimitStatus.retryAfter * 1000).toISOString(),
        },
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body.' }), { status: 400 });
  }

  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input data.' }), { status: 400 });
  }
  
  const { email, password, csrfToken } = parseResult.data;
  const secret = getSessionSecret();

  // Verify CSRF Token
  if (!verifyCsrfToken(csrfToken, secret)) {
    return new Response(JSON.stringify({ error: 'CSRF validation failed.' }), { status: 400 });
  }

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection failed.' }), { status: 500 });
  }

  let user;
  try {
    user = await db.select().from(users).where(eq(users.email, email)).get();

    // Seeding flow: If no users exist in the system, and they match the ENV password, create the owner
    if (!user) {
      const allUsers = await db.select().from(users).limit(1).all();
      if (allUsers.length === 0) {
        const allowBootstrap = import.meta.env.ALLOW_ADMIN_BOOTSTRAP === 'true' || process.env.ALLOW_ADMIN_BOOTSTRAP === 'true';
        if (!allowBootstrap) {
          logger.warn('⚠️ [ADMIN LOGIN] Bootstrap attempted but ALLOW_ADMIN_BOOTSTRAP is not true.');
          return new Response(JSON.stringify({ error: 'Bootstrap requires ALLOW_ADMIN_BOOTSTRAP=true' }), { status: 403 });
        } else {
          const envHash = getPasswordHash();
          if (envHash && verifyPassword(password, envHash)) {
            logger.warn(`⚠️ [ADMIN LOGIN] Bootstrapping first owner account for email: ${email}`);
            // Create first owner user
            const newHash = hashPassword(password);
            const [newUser] = await db.insert(users).values({
              email: email,
              passwordHash: newHash,
              role: 'owner',
            }).returning();
            user = newUser;
          } else if (!envHash) {
             logger.warn('⚠️ [ADMIN LOGIN] ADMIN_PASSWORD_HASH env var is missing during bootstrap.');
             return new Response(JSON.stringify({ error: 'Bootstrap requires ADMIN_PASSWORD_HASH' }), { status: 500 });
          }
        }
      }
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return new Response(JSON.stringify({ error: 'Invalid email or password.' }), { status: 401 });
    }

    // Update last login
    await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id));

    // Log to audit
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'login',
      ipAddress: ip,
      details: 'Successful login',
    });
  } catch (dbErr) {
    logger.error('Database error during login:', dbErr);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
  }

  // On Success: Generate signed session cookie
  const isProduction = import.meta.env.PROD;
  // Embed user ID and role into the session cookie
  const sessionPayload = `${user.id}:${user.role}`;
  const sessionVal = createSessionCookie(secret, sessionPayload);
  const setCookieHeader = buildSessionSetCookie(sessionVal, isProduction);

  return new Response(JSON.stringify({ success: true, redirect: '/admin' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookieHeader,
    },
  });
};
