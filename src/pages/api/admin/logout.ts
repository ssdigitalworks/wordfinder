export const prerender = false;

import type { APIRoute } from 'astro';
import { buildSessionClearCookie } from '../../../lib/adminAuth';

export const POST: APIRoute = async () => {
  const isProduction = import.meta.env.PROD;
  const clearCookie = buildSessionClearCookie(isProduction);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': clearCookie,
    },
  });
};
