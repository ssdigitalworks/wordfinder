import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// ---------------------------------------------------------------------------
// Create a Supabase (PostgreSQL) client from environment variables.
// Returns null gracefully if env vars are missing — allows the build to
// succeed and public pages to render without a database connection.
// ---------------------------------------------------------------------------

const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env || {};
const databaseUrl = (import.meta as any).env?.DATABASE_URL || env.DATABASE_URL;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (databaseUrl) {
  const client = postgres(databaseUrl, {
    prepare: false, // Required for Vercel Postgres compatibility
  });
  db = drizzle(client, { schema });
}

export { db };
export type Database = NonNullable<typeof db>;
