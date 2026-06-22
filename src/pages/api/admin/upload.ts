import { logger } from '../../../lib/logger';
export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../../db/client';
import { auditLogs } from '../../../db/schema';
import { getClientIp } from '../../../lib/rateLimiter';
import { hasRequiredRole, getUserIdFromPayload } from '../../../lib/adminAuth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function detectMimeType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: '.webp' };
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: '.gif' };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return { mime: 'image/x-icon', ext: '.ico' };
  }

  // Read the head to inspect contents (e.g. for SVG detection) if needed later:
  // NOTE: SVG intentionally NOT detected/allowed here — SVG files can embed <script> tags
  // and would be served same-origin (XSS risk against the admin's own session). If SVG
  // support is needed, sanitize the SVG (e.g. with an SVG-aware sanitizer) before storage
  // rather than accepting it as a raw passthrough image type.

  return null;
}

export const POST: APIRoute = async (context) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 });
  }

  const userPayload = context.locals.userPayload as string;
  const userId = getUserIdFromPayload(userPayload);

  if (!hasRequiredRole(userPayload, ['owner', 'editor'])) {
    return new Response(JSON.stringify({ error: 'Forbidden: Requires owner or editor role' }), { status: 403 });
  }

  try {
    const formData = await context.request.formData();
    const file = formData.get('image') as File | null;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'No file uploaded or file is empty.' }), { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size exceeds the 5MB limit.' }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const detected = detectMimeType(buffer);
    if (!detected) {
      return new Response(
        JSON.stringify({ error: 'Invalid file content. File signature does not match allowed image formats.' }),
        { status: 400 }
      );
    }


    const ext = detected.ext;
    const originalExt = path.extname(file.name) || '.png';
    const baseName = path.basename(file.name, originalExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}-${baseName}${ext}`;

    const region = process.env.AWS_REGION || import.meta.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET || import.meta.env.AWS_S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || import.meta.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || import.meta.env.AWS_SECRET_ACCESS_KEY;

    let publicUrl = '';

    if (region && bucket && accessKeyId && secretAccessKey) {
      // Use S3
      const s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey }
      });

      const s3Key = `uploads/blog/${fileName}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: detected.mime,
        // ACL: 'public-read' // Only if bucket allows it, omit if using CloudFront or strict policy
      }));

      publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    } else {
      // Fallback to local
      const publicBlogDir = path.join(process.cwd(), 'public', 'images', 'blog');
      try {
        if (!fs.existsSync(publicBlogDir)) {
          fs.mkdirSync(publicBlogDir, { recursive: true });
        }
        const filePath = path.join(publicBlogDir, fileName);
        fs.writeFileSync(filePath, buffer);
        publicUrl = `/images/blog/${fileName}`;
      } catch (writeErr) {
        logger.error('Local file write error:', writeErr);
        return new Response(
          JSON.stringify({ error: 'Local file upload failed. For production, set AWS_S3_BUCKET credentials.' }),
          { status: 500 }
        );
      }
    }

    const ip = getClientIp(context.request, context.clientAddress);
    await db.insert(auditLogs).values({
      userId,
      action: 'upload_image',
      ipAddress: ip,
      details: `Uploaded file to ${publicUrl}`
    });

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    logger.error('Upload handler error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error during upload.' }), { status: 500 });
  }
};
