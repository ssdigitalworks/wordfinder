export const prerender = false;

// ⚠️ SECURITY: This endpoint has been intentionally disabled.
// It previously exposed admin credentials in plain text — a critical vulnerability.
// Use the seed-admin.ts script via `npx tsx seed-admin.ts` from the command line instead.

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error:
        'This endpoint is disabled. Use the CLI seed script: `npx tsx seed-admin.ts`.',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
