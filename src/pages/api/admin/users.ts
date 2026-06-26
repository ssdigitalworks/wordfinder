export const prerender = false;
import { logger } from '../../../lib/logger';

import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { users, auditLogs } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { hasRequiredRole, getUserIdFromPayload, hashPassword } from '../../../lib/adminAuth';

const userSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must be under 128 characters'),
  role: z.enum(['owner', 'editor', 'moderator', 'viewer']).default('editor'),
});

export const POST: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPayload = context.locals.userPayload as string;
  // Only owners should add other admins
  if (!hasRequiredRole(userPayload, ['owner'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner role' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }), { status: 400 });
  }

  const { email, password, role } = parsed.data;

  try {
    // PostgreSQL: use limit(1) and take first result
    const existingResults = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const existing = existingResults[0] || null;
    
    if (existing) {
      return new Response(JSON.stringify({ error: 'User with this email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newUserResults = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword(password),
        role,
      })
      .returning();
    
    const newUser = newUserResults[0];

    const currentUserId = getUserIdFromPayload(userPayload);
    await db.insert(auditLogs).values({
      userId: currentUserId || null,
      action: 'create_admin',
      targetId: newUser.id.toString(),
      details: JSON.stringify({ email: newUser.email }),
    });

    return new Response(JSON.stringify({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    return new Response(JSON.stringify({ error: 'Failed to create user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
