import { randomBytes, scryptSync, createHmac, createHash, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Password hashing with Node's built-in crypto.scrypt
// Format: "salt:hash" (both hex)
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;

export function hashPassword(plaintext: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = scryptSync(plaintext, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plaintext: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;

  const hash = scryptSync(plaintext, salt, SCRYPT_KEYLEN).toString('hex');

  // Use timingSafeEqual to prevent timing attacks
  const hashBuf = Buffer.from(hash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');

  if (hashBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(hashBuf, storedBuf);
}

// ---------------------------------------------------------------------------
// Stateless signed session cookie
// Cookie value: "expiryTimestamp.hmacSignature"
// ---------------------------------------------------------------------------

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionCookie(secret: string, payload: string = ''): string {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const data = `${expiry}|${payload}`;
  const signature = sign(data, secret);
  return `${data}.${signature}`;
}

export function verifySessionCookie(cookie: string, secret: string): { valid: boolean; payload: string } {
  const lastDot = cookie.lastIndexOf('.');
  if (lastDot === -1) return { valid: false, payload: '' };
  
  const data = cookie.substring(0, lastDot);
  const signature = cookie.substring(lastDot + 1);
  if (!data || !signature) return { valid: false, payload: '' };

  const [expiryStr, ...payloadParts] = data.split('|');
  const payload = payloadParts.join('|');

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) return { valid: false, payload: '' };

  const expectedSig = sign(data, secret);

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');

  if (sigBuf.length !== expectedBuf.length) return { valid: false, payload: '' };
  const valid = timingSafeEqual(sigBuf, expectedBuf);
  return { valid, payload };
}

// ---------------------------------------------------------------------------
// CSRF token helpers
// Token = "random.hmac(random, secret)"
// ---------------------------------------------------------------------------

export function generateCsrfToken(secret: string): string {
  const random = randomBytes(32).toString('hex');
  const mac = sign(random, secret);
  return `${random}.${mac}`;
}

export function verifyCsrfToken(token: string, secret: string): boolean {
  if (!token) return false;
  const [random, mac] = token.split('.');
  if (!random || !mac) return false;

  const expectedMac = sign(random, secret);

  const macBuf = Buffer.from(mac, 'hex');
  const expectedBuf = Buffer.from(expectedMac, 'hex');

  if (macBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(macBuf, expectedBuf);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Password Reset Token Helpers
// ---------------------------------------------------------------------------

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Role helpers
// Session payload is "userId:role" (see createSessionCookie call sites).
// Valid roles (per src/db/schema.ts users.role): 'owner' | 'editor' | 'moderator' | 'viewer'
// NOTE: There is no 'admin' role in the schema — do not check against it.
// ---------------------------------------------------------------------------

export type AdminRole = 'owner' | 'editor' | 'moderator' | 'viewer';

export function getRoleFromPayload(payload: string | undefined | null): string {
  if (!payload) return '';
  const parts = payload.split(':');
  return parts[1] || '';
}

export function getUserIdFromPayload(payload: string | undefined | null): number | null {
  if (!payload) return null;
  const idStr = payload.split(':')[0];
  const id = parseInt(idStr, 10);
  return isNaN(id) ? null : id;
}

/** Returns true if the session payload's role is one of `allowedRoles`. */
export function hasRequiredRole(
  payload: string | undefined | null,
  allowedRoles: AdminRole[],
): boolean {
  const role = getRoleFromPayload(payload);
  return (allowedRoles as string[]).includes(role);
}

export function getSessionSecret(): string {
  return import.meta.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '';
}

export function getPasswordHash(): string {
  return import.meta.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || '';
}

export function isAdminAuthenticated(cookieHeader: string | null, secret: string): { valid: boolean; payload: string } {
  if (!cookieHeader || !secret) return { valid: false, payload: '' };

  const cookies = parseCookies(cookieHeader);
  const sessionValue = cookies['admin_session'];
  if (!sessionValue) return { valid: false, payload: '' };

  return verifySessionCookie(sessionValue, secret);
}

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) {
      result[key.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  });
  return result;
}

export function buildSessionSetCookie(value: string, isProduction: boolean): string {
  const parts = [
    `admin_session=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

export function buildSessionClearCookie(isProduction: boolean): string {
  const parts = ['admin_session=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}
