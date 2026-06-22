import { logger } from '../../../lib/logger';
export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { settings, auditLogs } from '../../../db/schema';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getClientIp } from '../../../lib/rateLimiter';
import { hasRequiredRole, getUserIdFromPayload } from '../../../lib/adminAuth';

const settingsSchema = z.object({
  settings: z.record(z.string().max(100), z.string().max(50000)).refine(
    (obj) => Object.keys(obj).length <= 100,
    { message: 'Too many settings keys (max 100)' }
  )
});

export const GET: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPayload = context.locals.userPayload as string | undefined;
  if (!hasRequiredRole(userPayload, ['owner', 'editor', 'moderator', 'viewer'])) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const allSettings = await db.select().from(settings);

    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }

    return new Response(JSON.stringify({ settings: settingsMap }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('Error fetching settings:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string;
  const userId = getUserIdFromPayload(userPayload);

  if (!hasRequiredRole(userPayload, ['owner'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner role' }), { status: 403 });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }), { status: 400 });
  }

  const pairs: Record<string, string> = parsed.data.settings;
  const updatedKeys = Object.keys(pairs);

  try {
    for (const [key, value] of Object.entries(pairs)) {
      await db
        .insert(settings)
        .values({
          key,
          value: String(value),
          updatedAt: sql`(datetime('now'))`,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: String(value),
            updatedAt: sql`(datetime('now'))`,
          },
        });
    }

    const ip = getClientIp(context.request, context.clientAddress);
    await db.insert(auditLogs).values({
      userId,
      action: 'update_settings',
      ipAddress: ip,
      details: `Updated settings keys: ${updatedKeys.join(', ')}`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('Settings update error:', err);
    return new Response(JSON.stringify({ error: 'Server error updating settings' }), { status: 500 });
  }
};
