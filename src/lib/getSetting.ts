import { db } from '@db/client';
import { settings } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Reads a setting from the database, returning the fallback if the row
 * doesn't exist, the DB is unavailable, or any error occurs.
 * Never throws — safe to call from any page.
 */
export async function getSetting(key: string, fallback: string = ''): Promise<string> {
  if (!db) return fallback;

  try {
    const row = await db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Read multiple settings at once, returning a map of key → value.
 * Missing keys get their fallback from the provided defaults object.
 */
export async function getSettings(
  defaults: Record<string, string>,
): Promise<Record<string, string>> {
  if (!db) return { ...defaults };

  try {
    const rows = await db.select().from(settings).all();
    const result = { ...defaults };
    for (const row of rows) {
      if (row.key in defaults) {
        result[row.key] = row.value;
      }
    }
    return result;
  } catch {
    return { ...defaults };
  }
}
