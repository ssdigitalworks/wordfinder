import { logger } from '../lib/logger';
import { Redis } from '@upstash/redis';

export interface DefinitionEntry {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms: string[];
  antonyms: string[];
}

export interface DefinitionResult {
  definitions: DefinitionEntry[];
  source: string;
}

const kvUrl =
  process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  kvUrl && kvToken
    ? new Redis({
        url: kvUrl,
        token: kvToken,
      })
    : null;

const globalCache = (globalThis as any).definitionCache || new Map<string, DefinitionResult>();
(globalThis as any).definitionCache = globalCache;

export async function fetchWordDefinition(word: string): Promise<DefinitionResult> {
  const wordUpper = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!wordUpper) {
    return { definitions: [], source: '' };
  }

  // 1. Check local memory cache first
  const memoryCached = globalCache.get(wordUpper);
  if (memoryCached) {
    return memoryCached;
  }

  // 2. Check Redis cache if available
  const cacheKey = `definition:${wordUpper}`;
  if (redis) {
    try {
      const cached = await redis.get<DefinitionResult>(cacheKey);
      if (cached) {
        globalCache.set(wordUpper, cached);
        return cached;
      }
    } catch (err) {
      logger.error('[DefinitionCache] Redis read error:', err);
    }
  }

  // 3. Fetch from APIs
  let definitions: DefinitionEntry[] = [];
  let source = '';

  try {
    let dictRes: Response | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      dictRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${wordUpper.toLowerCase()}`,
        {
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
    } catch (err) {
      logger.warn(`Free Dictionary API fetch failed or timed out:`, err);
    }

    if (dictRes && dictRes.ok) {
      interface FreeDictionaryDef { definition?: string; example?: string }
      interface FreeDictionaryMeaning { partOfSpeech?: string; definitions?: FreeDictionaryDef[]; synonyms?: string[]; antonyms?: string[] }
      interface FreeDictionaryEntry { meanings?: FreeDictionaryMeaning[] }
      
      const data: FreeDictionaryEntry[] = await dictRes.json();
      source = 'Free Dictionary API';
      data.forEach((entry) => {
        entry.meanings?.forEach((meaning) => {
          definitions.push({
            partOfSpeech: meaning.partOfSpeech || '',
            definitions:
              meaning.definitions?.slice(0, 3).map((d) => ({
                definition: d.definition || '',
                example: d.example || '',
              })) || [],
            synonyms: meaning.synonyms || [],
            antonyms: meaning.antonyms || [],
          });
        });
      });
    } else {
      // Fallback to Wiktionary
      let wikRes: Response | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        wikRes = await fetch(
          `https://en.wiktionary.org/api/rest_v1/page/definition/${wordUpper.toLowerCase()}`,
          {
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
      } catch (err) {
        logger.warn(`Wiktionary fetch failed or timed out:`, err);
      }

      if (wikRes && wikRes.ok) {
        interface WiktionaryDef { definition?: string }
        interface WiktionaryEntry { partOfSpeech?: string; definitions?: WiktionaryDef[] }
        const data: { en?: WiktionaryEntry[] } = await wikRes.json();
        source = 'Wiktionary';
        const enData = data.en;
        if (enData && enData.length > 0) {
          enData.forEach((entry) => {
            definitions.push({
              partOfSpeech: entry.partOfSpeech || '',
              definitions:
                entry.definitions?.slice(0, 3).map((d) => ({
                  definition: (d.definition || '').replace(/<\/?[^>]+(>|$)/g, ''),
                })) || [],
              synonyms: [],
              antonyms: [],
            });
          });
        }
      }
    }

    const result: DefinitionResult = { definitions, source };

    // Cache results if definitions found
    if (definitions.length > 0) {
      globalCache.set(wordUpper, result);
      if (redis) {
        try {
          // Cache for 30 days (30 * 24 * 60 * 60 seconds)
          await redis.set(cacheKey, result, { ex: 2592000 });
        } catch (err) {
          logger.error('[DefinitionCache] Redis write error:', err);
        }
      }
    }

    return result;
  } catch (e) {
    logger.error(`Failed to fetch definitions for ${wordUpper}:`, e);
    return { definitions: [], source: '' };
  }
}
