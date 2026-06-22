export const prerender = false;

import type { APIRoute } from 'astro';
import { logger } from '../../../../lib/logger';
import { db } from '../../../../db/client';
import { users, auditLogs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { hasRequiredRole, getUserIdFromPayload } from '../../../../lib/adminAuth';

export const DELETE: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner role' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = context.params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetId = parseInt(id, 10);
  // Enforce that ID is a valid positive integer (prevents negative IDs and NaN)
  if (isNaN(targetId) || targetId <= 0 || !Number.isInteger(targetId)) {
    return new Response(JSON.stringify({ error: 'Invalid User ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const currentUserId = getUserIdFromPayload(userPayload);
  if (currentUserId === targetId) {
    return new Response(JSON.stringify({ error: 'You cannot delete your own account.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUser = await db.select().from(users).where(eq(users.id, targetId)).get();
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.delete(users).where(eq(users.id, targetId)).run();

    await db.insert(auditLogs).values({
      userId: currentUserId || null,
      action: 'delete_admin',
      targetId: targetId.toString(),
      // Store only email, not password hash or any sensitive data
      details: JSON.stringify({ deletedEmail: targetUser.email }),
    }).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error('Error deleting user:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
