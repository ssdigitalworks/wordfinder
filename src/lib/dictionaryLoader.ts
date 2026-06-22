import { logger } from '../lib/logger';
import type { Dictionary } from '../data/tileScores';

export interface DictionaryData {
  wordSet: Set<string>;
  wordList: string[];
  wordsByLength: Record<number, string[]>;
  wordsByStartLetter: Record<string, string[]>;
  wordsByLengthAndStartLetter: Record<string, string[]>;
  wordCounts: Map<string, Record<string, number>>;
}

// Subclass Map to calculate counts lazily only when requested.
// This saves massive CPU time and memory on startup.
class LazyWordCountsMap extends Map<string, Record<string, number>> {
  override get(word: string): Record<string, number> | undefined {
    let counts = super.get(word);
    if (!counts) {
      counts = {};
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        counts[char] = (counts[char] || 0) + 1;
      }
      super.set(word, counts);
    }
    return counts;
  }

  override has(_word: string): boolean {
    return true; // We can generate counts on demand for any word
  }
}

const dataCache = new Map<string, DictionaryData>();

export async function loadDictionaryData(dict: Dictionary): Promise<DictionaryData> {
  const upperDict = dict.toUpperCase();
  if (dataCache.has(upperDict)) return dataCache.get(upperDict)!;

  try {
    let rawWords: string[] = [];

    if (upperDict === 'TWL') {
      rawWords = (await import('../data/twl.json')).default;
    } else if (upperDict === 'SOWPODS') {
      rawWords = (await import('../data/sowpods.json')).default;
    } else if (upperDict === 'ENABLE') {
      rawWords = (await import('../data/enable.json')).default;
    } else {
      throw new Error(`Dictionary ${dict} not supported`);
    }

    const wordSet = new Set(rawWords);
    const wordList = Array.from(wordSet);

    const wordsByLength: Record<number, string[]> = {};
    const wordsByStartLetter: Record<string, string[]> = {};
    const wordsByLengthAndStartLetter: Record<string, string[]> = {};
    const wordCounts = new LazyWordCountsMap(); // Instantiate lazy map

    for (const word of wordList) {
      const len = word.length;
      const start = word[0];

      if (!wordsByLength[len]) wordsByLength[len] = [];
      wordsByLength[len].push(word);

      if (!wordsByStartLetter[start]) wordsByStartLetter[start] = [];
      wordsByStartLetter[start].push(word);

      const comboKey = `${len}-${start}`;
      if (!wordsByLengthAndStartLetter[comboKey]) wordsByLengthAndStartLetter[comboKey] = [];
      wordsByLengthAndStartLetter[comboKey].push(word);
    }

    const data: DictionaryData = {
      wordSet,
      wordList,
      wordsByLength,
      wordsByStartLetter,
      wordsByLengthAndStartLetter,
      wordCounts,
    };

    dataCache.set(upperDict, data);
    return data;
  } catch (e) {
    logger.error(`Failed to load dictionary ${dict}:`, e);
    // Return empty fallback structure
    return {
      wordSet: new Set<string>(),
      wordList: [],
      wordsByLength: {},
      wordsByStartLetter: {},
      wordsByLengthAndStartLetter: {},
      wordCounts: new Map(),
    };
  }
}

export async function loadDictionary(dict: Dictionary): Promise<Set<string>> {
  const data = await loadDictionaryData(dict);
  return data.wordSet;
}

export function clearCache(): void {
  dataCache.clear();
  mergedWordListCache = null;
}

let mergedWordListCache: string[] | null = null;

export async function loadMergedWordList(): Promise<string[]> {
  if (mergedWordListCache) return mergedWordListCache;

  const [twl, sowpods, enable] = await Promise.all([
    loadDictionaryData('TWL'),
    loadDictionaryData('SOWPODS'),
    loadDictionaryData('ENABLE'),
  ]);

  const union = new Set<string>([...twl.wordList, ...sowpods.wordList, ...enable.wordList]);

  mergedWordListCache = Array.from(union).sort();
  return mergedWordListCache;
}
