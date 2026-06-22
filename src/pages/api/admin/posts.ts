export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { posts, auditLogs } from '../../../db/schema';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { getClientIp } from '../../../lib/rateLimiter';
import { hasRequiredRole, getUserIdFromPayload } from '../../../lib/adminAuth';
import { logger } from '../../../lib/logger';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  description: z.string().max(300).optional(),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  author: z.string().max(50).optional(),
  published: z.boolean().default(false),
  pubDate: z.string(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  canonicalUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
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
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

    return new Response(JSON.stringify({ posts: allPosts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('Error fetching posts:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPayload = context.locals.userPayload as string;
  if (!hasRequiredRole(userPayload, ['owner', 'editor'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner or editor role' }), {
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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }), { status: 400 });
  }

  const data = parsed.data;

  try {
    const [newPost] = await db
      .insert(posts)
      .values({
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
      })
      .returning();

    // Audit Log
    const userId = getUserIdFromPayload(userPayload);
    const ip = getClientIp(context.request, context.clientAddress);

    await db.insert(auditLogs).values({
      userId,
      action: 'create_post',
      targetId: String(newPost.id),
      ipAddress: ip,
      details: `Created post: ${newPost.slug}`
    });

    return new Response(JSON.stringify({ post: newPost }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'Slug already exists.' }), { status: 409 });
    }
    logger.error('Error creating post:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
