import { posts } from '@db/schema';
import { logger } from './logger';

export type BlogPost = typeof posts.$inferSelect;

/**
 * Safely parses the JSON tags array from a blog post string.
 */
export function parseTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    logger.warn('Failed to parse blog tags', e);
    return [];
  }
}
