import { describe, it, expect } from 'vitest';
import { calculateScore, calculateWordScore } from '../src/lib/scoreCalculator';
import { findWords, solveCrossword, solveWordle } from '../src/lib/wordEngine';

describe('Word Scoring Logic', () => {
  it('should calculate standard word scores correctly', () => {
    // TWL values: C = 3, A = 1, T = 1
    const catScore = calculateWordScore('CAT', 'TWL');
    expect(catScore).toBe(5);

    // K = 5, E = 1, Y = 4
    const keyScore = calculateWordScore('KEY', 'TWL');
    expect(keyScore).toBe(10);
  });

  it('should handle blank tiles (worth 0 points) at specific positions', () => {
    // If 'A' (index 1) is a blank tile, CAT should score 3 (C) + 0 (A) + 1 (T) = 4
    const scoreResult = calculateScore('CAT', 'TWL', [1]);
    expect(scoreResult.totalScore).toBe(4);
    expect(scoreResult.letterScores).toEqual([3, 0, 1]);

    // If 'K' (index 0) and 'Y' (index 2) are blank tiles, KEY should score 0 (K) + 1 (E) + 0 (Y) = 1
    const keyResult = calculateScore('KEY', 'TWL', [0, 2]);
    expect(keyResult.totalScore).toBe(1);
    expect(keyResult.letterScores).toEqual([0, 1, 0]);
  });
});

describe('Word Finder Solver Logic', () => {
  it('should identify valid words from rack letters', async () => {
    // Search using a small set of letters
    const results = await findWords({
      letters: 'CAT',
      dictionary: 'TWL',
      minLength: 2
    });

    expect(results.length).toBeGreaterThan(0);
    const wordsOnly = results.map(r => r.word);
    expect(wordsOnly).toContain('CAT');
    expect(wordsOnly).toContain('AT');
  });

  it('should support blank tiles wildcard matching', async () => {
    // Rack has 'C', '?' (blank), 'T'. It should be able to form CAT, COT, etc.
    const results = await findWords({
      letters: 'C?T',
      dictionary: 'TWL',
      minLength: 3,
      maxLength: 3
    });

    const wordsOnly = results.map(r => r.word);
    expect(wordsOnly).toContain('CAT');
    
    // Check that for 'CAT' in results, index 1 (A) is marked as blank and scores 4 points
    const catResult = results.find(r => r.word === 'CAT');
    expect(catResult).toBeDefined();
    expect(catResult!.blanksUsed).toEqual([1]);
    expect(catResult!.score).toBe(4); // C(3) + A(0) + T(1) = 4
  });

  it('should support startsWith, endsWith, and mustInclude filters', async () => {
    const results = await findWords({
      letters: 'CATESTR',
      dictionary: 'TWL',
      startsWith: 'CA',
      endsWith: 'TS',
      mustInclude: 'TE'
    });

    const wordsOnly = results.map(r => r.word);
    for (const w of wordsOnly) {
      expect(w.startsWith('CA')).toBe(true);
      expect(w.endsWith('TS')).toBe(true);
      expect(w.includes('TE')).toBe(true);
    }
  });
});

describe('Crossword Solver Logic', () => {
  it('should solve patterns using dot placeholders', async () => {
    const results = await solveCrossword('C.T', 'TWL');
    expect(results.length).toBeGreaterThan(0);
    const wordsOnly = results.map(r => r.word);
    expect(wordsOnly).toContain('CAT');
    expect(wordsOnly).toContain('COT');
  });
});

describe('Wordle Solver Logic', () => {
  it('should find 5-letter candidate words matching Wordle constraints', async () => {
    const results = await solveWordle({
      dictionary: 'TWL',
      green: ['S', '', 'A', '', 'E'], // S _ A _ E
      yellow: [[], [], [], [], []],
      gray: []
    });

    const wordsOnly = results.map(r => r.word);
    for (const w of wordsOnly) {
      expect(w.length).toBe(5);
      expect(w[0]).toBe('S');
      expect(w[2]).toBe('A');
      expect(w[4]).toBe('E');
    }
  });
});
