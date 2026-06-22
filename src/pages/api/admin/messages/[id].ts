export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../../db/client';
import { messages, auditLogs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { getClientIp } from '../../../../lib/rateLimiter';
import { hasRequiredRole, getUserIdFromPayload } from '../../../../lib/adminAuth';
import { logger } from '../../../../lib/logger';

function validateId(idStr: string | undefined): number | null {
  if (!idStr) return null;
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0 || !Number.isInteger(id)) return null;
  return id;
}

export const GET: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'moderator', 'editor', 'viewer'])) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = validateId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 });
  }

  try {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('Error fetching message:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

export const PATCH: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'moderator'])) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = validateId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 });
  }

  try {
    const [updatedMessage] = await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, id))
      .returning();

    if (!updatedMessage) {
      return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404 });
    }

    const userId = getUserIdFromPayload(userPayload);
    const ip = getClientIp(context.request, context.clientAddress);

    await db.insert(auditLogs).values({
      userId,
      action: 'mark_message_read',
      targetId: String(id),
      ipAddress: ip,
      details: 'Marked message as read'
    });

    return new Response(JSON.stringify({ message: updatedMessage }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('Error updating message:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'moderator'])) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = validateId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 });
  }

  try {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    if (!msg) {
      return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404 });
    }

    await db.delete(messages).where(eq(messages.id, id));

    const userId = getUserIdFromPayload(userPayload);
    const ip = getClientIp(context.request, context.clientAddress);
    
    await db.insert(auditLogs).values({
      userId,
      action: 'delete_message',
      targetId: String(id),
      ipAddress: ip,
      details: `Deleted message from: ${msg.email}`
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('Error deleting message:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
