import { createClient } from '@libsql/client/node';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// ---------------------------------------------------------------------------
// Create a Turso (libSQL) client from environment variables.
// Returns null gracefully if env vars are missing — allows the build to
// succeed and public pages to render without a database connection.
// ---------------------------------------------------------------------------

const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env || {};
const url = (import.meta as any).env?.TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
const authToken = (import.meta as any).env?.TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (url) {
  const client = createClient({
    url,
    authToken: authToken || undefined,
  });
  db = drizzle(client, { schema });
}

export { db };
export type Database = NonNullable<typeof db>;
