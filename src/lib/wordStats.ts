import type { WordResult } from './wordEngine';

export function groupByLength(words: WordResult[]): Map<number, WordResult[]> {
  const groups = new Map<number, WordResult[]>();
  for (const word of words) {
    const len = word.word.length;
    if (!groups.has(len)) groups.set(len, []);
    groups.get(len)!.push(word);
  }
  // Sort keys descending
  return new Map([...groups.entries()].sort((a, b) => b[0] - a[0]));
}

export function sortByScore(words: WordResult[]): WordResult[] {
  return [...words].sort((a, b) => b.score - a.score);
}

export function sortAlphabetically(words: WordResult[]): WordResult[] {
  return [...words].sort((a, b) => a.word.localeCompare(b.word));
}

export function sortByLength(words: WordResult[]): WordResult[] {
  return [...words].sort((a, b) => b.word.length - a.word.length || b.score - a.score);
}

export async function getWordRelationships(word: string, dict: 'TWL' | 'SOWPODS' | 'ENABLE') {
  const { loadDictionaryData } = await import('./dictionaryLoader');
  const dictData = await loadDictionaryData(dict);
  const wordUpper = word.toUpperCase();
  const sortedLetters = wordUpper.split('').sort().join('');

  const anagrams: string[] = [];
  const hooks: string[] = [];
  const subwords: string[] = [];

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const letter of alphabet) {
    const frontHook = letter + wordUpper;
    if (dictData.wordSet.has(frontHook)) hooks.push(frontHook);

    const backHook = wordUpper + letter;
    if (dictData.wordSet.has(backHook)) hooks.push(backHook);
  }

  const lettersCount = getFrequencyMap(wordUpper);

  // 1. Anagrams: Only look through words of the exact same length
  const sameLengthCandidates = dictData.wordsByLength[wordUpper.length] || [];
  for (const other of sameLengthCandidates) {
    if (other === wordUpper) continue;
    if (other.split('').sort().join('') === sortedLetters) {
      anagrams.push(other);
    }
  }

  // 2. Subwords: Check words of length < wordUpper.length
  for (let len = 2; len < wordUpper.length; len++) {
    const candidates = dictData.wordsByLength[len] || [];
    for (const other of candidates) {
      const otherCount = dictData.wordCounts.get(other);
      if (!otherCount) continue;

      let canForm = true;
      for (const char in otherCount) {
        if (!lettersCount[char] || lettersCount[char] < otherCount[char]) {
          canForm = false;
          break;
        }
      }
      if (canForm) {
        subwords.push(other);
      }
    }
  }

  return {
    anagrams: anagrams.slice(0, 15),
    hooks: hooks.slice(0, 15),
    subwords: subwords.sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 30),
  };
}

function getFrequencyMap(str: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const char of str) {
    map[char] = (map[char] || 0) + 1;
  }
  return map;
}
