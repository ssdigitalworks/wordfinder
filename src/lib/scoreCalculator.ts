import { getScores, type Dictionary } from '../data/tileScores';

export interface ScoreResult {
  totalScore: number;
  letterScores: number[]; // score per letter position
}

export function calculateScore(
  word: string,
  dictionary: Dictionary,
  blanksUsed: number[] = [],
): ScoreResult {
  const scores = getScores(dictionary);
  const letterScores = word.split('').map((letter, i) => {
    if (blanksUsed.includes(i)) return 0;
    return scores[letter.toUpperCase()] ?? 0;
  });
  return {
    totalScore: letterScores.reduce((a, b) => a + b, 0),
    letterScores,
  };
}

export function calculateWordScore(word: string, dictionary: Dictionary): number {
  const scores = getScores(dictionary);
  return word.split('').reduce((total, letter) => total + (scores[letter.toUpperCase()] ?? 0), 0);
}
