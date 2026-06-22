export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../../db/client';
import { posts, auditLogs } from '../../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getClientIp } from '../../../../lib/rateLimiter';
import { hasRequiredRole, getUserIdFromPayload } from '../../../../lib/adminAuth';
import { logger } from '../../../../lib/logger';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  description: z.string().max(300).optional(),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  author: z.string().max(50).optional(),
  published: z.boolean().default(false),
  pubDate: z.string(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  canonicalUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
});

function validateId(idStr: string | undefined): number | null {
  if (!idStr) return null;
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0 || !Number.isInteger(id)) return null;
  return id;
}

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

  const id = validateId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 });
  }

  try {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));

    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching post:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string;
  if (!hasRequiredRole(userPayload, ['owner', 'editor'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner or editor role' }), { status: 403 });
  }

  const id = validateId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }), { status: 400 });
  }

  const data = parsed.data;

  try {
    const [updatedPost] = await db
      .update(posts)
      .set({
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        content: data.content,
        image: data.image || null,
        tags: JSON.stringify(data.tags),
        author: data.author || 'Editorial Team',
        published: data.published,
        pubDate: data.pubDate,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        canonicalUrl: data.canonicalUrl || null,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(posts.id, id))
      .returning();

    if (!updatedPost) {
      return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404 });
    }

    const userId = getUserIdFromPayload(userPayload);
    const ip = getClientIp(context.request, context.clientAddress);

    await db.insert(auditLogs).values({
      userId,
      action: 'update_post',
      targetId: String(id),
      ipAddress: ip,
      details: `Updated post: ${updatedPost.slug}`,
    });

    return new Response(JSON.stringify({ post: updatedPost }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'Slug already exists.' }), { status: 409 });
    }
    logger.error('Error updating post:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string;
  const userId = getUserIdFromPayload(userPayload);

  if (!hasRequiredRole(userPayload, ['owner'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner role' }), { status: 403 });
  }

  const id = validateId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400 });
  }

  try {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404 });
    }

    await db.delete(posts).where(eq(posts.id, id));

    const ip = getClientIp(context.request, context.clientAddress);
    await db.insert(auditLogs).values({
      userId,
      action: 'delete_post',
      targetId: String(id),
      ipAddress: ip,
      details: `Deleted post: ${post.slug}`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error deleting post:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
