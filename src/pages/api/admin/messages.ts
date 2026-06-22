import { logger } from '../../../lib/logger';
export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { messages } from '../../../db/schema';
import { desc, inArray, eq } from 'drizzle-orm';
import { hasRequiredRole } from '../../../lib/adminAuth';
import { z } from 'zod';

// GET: Fetch all messages — requires authenticated admin session
export const GET: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auth check is also done in middleware, but re-verify role here
  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'editor', 'moderator'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient role' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));

    return new Response(JSON.stringify({ messages: allMessages }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    logger.error('Failed to fetch messages:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch messages.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH: Mark messages as read/unread
export const PATCH: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'editor', 'moderator'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient role' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const patchSchema = z.object({
    id: z.number().int().positive(),
    read: z.boolean(),
  });

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await db
      .update(messages)
      .set({ read: parsed.data.read })
      .where(eq(messages.id, parsed.data.id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    logger.error('Mark-read error:', err);
    return new Response(JSON.stringify({ error: 'Failed to update message.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Bulk delete messages by IDs
export const DELETE: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'editor'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner or editor role.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deleteSchema = z.object({
    ids: z.array(z.number().int().positive()).min(1).max(100),
  });

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input: ids must be an array of positive integers (max 100).' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await db.delete(messages).where(inArray(messages.id, parsed.data.ids));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error('Bulk delete error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error during deletion.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
