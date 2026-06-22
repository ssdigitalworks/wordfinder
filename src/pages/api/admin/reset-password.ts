export const prerender = false;
import { logger } from '../../../lib/logger';

import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { users, passwordResetTokens, auditLogs } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { hashToken, hashPassword, buildSessionClearCookie } from '../../../lib/adminAuth';
import { getRateLimitStatus, getClientIp } from '../../../lib/rateLimiter';
import { z } from 'zod';

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus(`reset_consume:${ip}`, 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parseResult = resetSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input data.' }), { status: 400 });
  }

  const { token, newPassword } = parseResult.data;
  const tokenHash = hashToken(token);

  try {
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));

    if (!resetRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired reset token.' }), { status: 400 });
    }

    // Check expiry
    if (new Date(resetRecord.expiresAt).getTime() < Date.now()) {
      // Clean up expired token
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
      return new Response(JSON.stringify({ error: 'Reset token has expired.' }), { status: 400 });
    }

    // Find user
    const [user] = await db.select().from(users).where(eq(users.id, resetRecord.userId));
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found.' }), { status: 404 });
    }

    // Update password
    const newHash = hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    // Delete used token to prevent reuse
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));

    // Audit Log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'password_reset',
      ipAddress: ip,
      details: 'Password was reset via email token',
    });
  } catch (dbErr) {
    logger.error('Database error during password reset:', dbErr);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
  }

  // Clear current session to invalidate
  const isProduction = import.meta.env.PROD;
  const clearCookieHeader = buildSessionClearCookie(isProduction);

  return new Response(JSON.stringify({ success: true, message: 'Password successfully reset.' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookieHeader,
    },
  });
};
