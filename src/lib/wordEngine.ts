import { loadDictionaryData } from './dictionaryLoader';
import { getScores, type Dictionary } from '../data/tileScores';

export interface WordResult {
  word: string;
  score: number;
  length: number;
  blanksUsed: number[];
}

export interface SearchOptions {
  letters: string;
  dictionary: Dictionary;
  mustInclude?: string;
  startsWith?: string;
  endsWith?: string;
  minLength?: number;
  maxLength?: number;
}

export async function findWords(options: SearchOptions): Promise<WordResult[]> {
  const dictData = await loadDictionaryData(options.dictionary);
  const scores = getScores(options.dictionary);
  const results: WordResult[] = [];

  const letters = options.letters.toUpperCase();
  const rackChars = letters.split('');
  const blankCount = rackChars.filter((c) => c === '?').length;

  if (blankCount > 2) throw new Error('Maximum 2 blank tiles allowed');

  // Build frequency map of non-blank rack letters
  const rackFreq: Record<string, number> = {};
  for (const c of rackChars) {
    if (c !== '?') {
      rackFreq[c] = (rackFreq[c] || 0) + 1;
    }
  }

  const rackSize = rackChars.length;
  const minLen = options.minLength ?? 2;
  const maxLen = options.maxLength ?? rackSize;

  // Prune search space using prefix index if available
  let candidateList = dictData.wordList;
  if (options.startsWith && options.startsWith.length > 0) {
    const startChar = options.startsWith[0].toUpperCase();
    candidateList = dictData.wordsByStartLetter[startChar] || [];
  }

  const wordCounts = dictData.wordCounts;

  for (const word of candidateList) {
    // Skip words outside the target length bounds
    if (word.length > maxLen || word.length < minLen) continue;

    // Apply prefix/suffix/contains filters early
    if (options.startsWith && !word.startsWith(options.startsWith.toUpperCase())) continue;
    if (options.endsWith && !word.endsWith(options.endsWith.toUpperCase())) continue;
    if (options.mustInclude && !word.includes(options.mustInclude.toUpperCase())) continue;

    const counts = wordCounts.get(word);
    if (!counts) continue;

    let blanksNeeded = 0;
    let canForm = true;

    for (const char in counts) {
      const need = counts[char];
      const have = rackFreq[char] || 0;
      if (need > have) {
        blanksNeeded += need - have;
        if (blanksNeeded > blankCount) {
          canForm = false;
          break;
        }
      }
    }

    if (!canForm) continue;

    const blanksUsed: number[] = [];
    if (blanksNeeded > 0) {
      const tempRack = { ...rackFreq };
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (tempRack[char] && tempRack[char] > 0) {
          tempRack[char]--;
        } else {
          blanksUsed.push(i);
        }
      }
    }

    // Calculate score (blanks = 0 points)
    let score = 0;
    for (let i = 0; i < word.length; i++) {
      if (!blanksUsed.includes(i)) {
        score += scores[word[i]] ?? 0;
      }
    }

    results.push({
      word,
      score,
      length: word.length,
      blanksUsed,
    });
  }

  // Sort by score descending, then length descending, then alphabetically
  results.sort((a, b) => b.score - a.score || b.length - a.length || a.word.localeCompare(b.word));

  return results;
}

export async function checkWord(word: string, dictionary: Dictionary): Promise<boolean> {
  const dictData = await loadDictionaryData(dictionary);
  return dictData.wordSet.has(word.toUpperCase().trim());
}

export async function solveCrossword(
  pattern: string,
  dictionary: Dictionary,
): Promise<WordResult[]> {
  const dictData = await loadDictionaryData(dictionary);
  const scores = getScores(dictionary);
  const cleanPattern = pattern.toUpperCase().trim();
  const results: WordResult[] = [];

  // Prune search space to only words matching target length
  const candidateList = dictData.wordsByLength[cleanPattern.length] || [];

  for (const word of candidateList) {
    let isMatch = true;
    for (let i = 0; i < word.length; i++) {
      const pChar = cleanPattern[i];
      if (pChar !== '.' && pChar !== '?' && pChar !== word[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      let score = 0;
      for (let i = 0; i < word.length; i++) {
        score += scores[word[i]] ?? 0;
      }
      results.push({
        word,
        score,
        length: word.length,
        blanksUsed: [],
      });
    }
  }

  results.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  return results;
}

export interface WordleOptions {
  dictionary: Dictionary;
  green: string[];
  yellow: string[][];
  gray: string[];
}

export async function solveWordle(options: WordleOptions): Promise<WordResult[]> {
  const dictData = await loadDictionaryData(options.dictionary);
  const scores = getScores(options.dictionary);
  const results: WordResult[] = [];

  const green = options.green.map((c) => c.toUpperCase());
  const yellow = options.yellow.map((arr) => arr.map((c) => c.toUpperCase()));
  const gray = options.gray.map((c) => c.toUpperCase());

  const requiredYellow = Array.from(new Set(yellow.flat()));

  // Prune search space to 5-letter words only
  const candidateList = dictData.wordsByLength[5] || [];

  for (const word of candidateList) {
    let isMatch = true;

    for (let i = 0; i < 5; i++) {
      if (green[i] && word[i] !== green[i]) {
        isMatch = false;
        break;
      }
    }
    if (!isMatch) continue;

    for (let i = 0; i < 5; i++) {
      const idxYellows = yellow[i];
      if (idxYellows && idxYellows.includes(word[i])) {
        isMatch = false;
        break;
      }
    }
    if (!isMatch) continue;

    for (const c of requiredYellow) {
      if (!word.includes(c)) {
        isMatch = false;
        break;
      }
    }
    if (!isMatch) continue;

    const constrainedLetters = new Set<string>([
      ...green.filter(Boolean),
      ...yellow.flat(),
      ...gray,
    ]);

    let countMatch = true;
    for (const c of constrainedLetters) {
      let timesGreen = 0;
      for (let i = 0; i < 5; i++) {
        if (green[i] === c) timesGreen++;
      }
      let timesYellow = 0;
      for (let i = 0; i < 5; i++) {
        if (yellow[i] && yellow[i].includes(c)) timesYellow++;
      }
      const requiredCount = timesGreen + timesYellow;

      let actualCount = 0;
      for (let i = 0; i < word.length; i++) {
        if (word[i] === c) actualCount++;
      }

      if (gray.includes(c)) {
        if (actualCount !== requiredCount) {
          countMatch = false;
          break;
        }
      } else {
        if (actualCount < requiredCount) {
          countMatch = false;
          break;
        }
      }
    }

    if (!countMatch) continue;

    let score = 0;
    for (let i = 0; i < 5; i++) {
      score += scores[word[i]] ?? 0;
    }

    results.push({
      word,
      score,
      length: 5,
      blanksUsed: [],
    });
  }

  results.sort((a, b) => a.word.localeCompare(b.word));
  return results;
}
