import { logger } from '../../../lib/logger';
export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { users, passwordResetTokens } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { generatePasswordResetToken, hashToken } from '../../../lib/adminAuth';
import { getRateLimitStatus, getClientIp } from '../../../lib/rateLimiter';

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const ip = getClientIp(request, clientAddress);
  const rateLimit = await getRateLimitStatus(`reset:${ip}`, 3, 15 * 60 * 1000); // 3 requests per 15 minutes
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const email = body.email;
  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Valid email is required' }), { status: 400 });
  }

  // Always return success to prevent email enumeration
  const successResponse = new Response(
    JSON.stringify({ success: true, message: 'If that email exists, a reset link has been sent.' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return successResponse;
    }

    // Invalidate any older outstanding token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    await db.insert(passwordResetTokens).values({
      tokenHash,
      userId: user.id,
      expiresAt,
    });
  } catch (dbErr) {
    logger.error('Database error during password reset request:', dbErr);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
  }

  const resetLink = new URL(`/admin/reset-password?token=${rawToken}`, url.origin).toString();

  const resendApiKey = import.meta.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: import.meta.env.CONTACT_FROM_EMAIL || 'System <noreply@scrabblewordfinder.com>',
          to: email,
          subject: 'Password Reset Request',
          text: `You requested a password reset. Click the link below to reset your password. This link will expire in 1 hour.\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
        }),
      });
    } catch (e) {
      logger.error('Failed to send reset email:', e);
    }
  } else {
    // Console log for local dev
    logger.info('\n--- PASSWORD RESET REQUEST ---');
    logger.info(`To: ${email}`);
    logger.info(`Link: ${resetLink}`);
    logger.info('------------------------------\n');
  }

  return successResponse;
};
