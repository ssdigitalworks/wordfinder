import { calculateWordScore } from './scoreCalculator';

export interface WordListStats {
  totalCount: number;
  highestScoringWord: string;
  highestScore: number;
  shortestWord: string;
  longestWord: string;
  avgLength: number;
}

/**
 * Calculates dynamic statistics for a given list of words.
 * This is used to inject unique content/paragraphs into programmatic SEO pages.
 */
export function getDynamicSEOStats(words: string[], dictionary: 'TWL' | 'SOWPODS' | 'ENABLE' = 'TWL'): WordListStats | null {
  if (!words || words.length === 0) {
    return null;
  }

  let highestScoringWord = words[0];
  let highestScore = 0;
  let shortestWord = words[0];
  let longestWord = words[0];
  let totalLength = 0;

  words.forEach(word => {
    const score = calculateWordScore(word, dictionary);
    if (score > highestScore) {
      highestScore = score;
      highestScoringWord = word;
    }
    
    if (word.length < shortestWord.length) {
      shortestWord = word;
    }
    
    if (word.length > longestWord.length) {
      longestWord = word;
    }
    
    totalLength += word.length;
  });

  return {
    totalCount: words.length,
    highestScoringWord,
    highestScore,
    shortestWord,
    longestWord,
    avgLength: Math.round((totalLength / words.length) * 10) / 10
  };
}
