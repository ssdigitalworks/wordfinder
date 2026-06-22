export const TWL_SCORES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
  '?': 0,
};

// ENABLE dictionary is conventionally paired with Words With Friends scoring rules.
export const ENABLE_SCORES: Record<string, number> = {
  A: 1,
  B: 4,
  C: 4,
  D: 2,
  E: 1,
  F: 4,
  G: 3,
  H: 3,
  I: 1,
  J: 10,
  K: 5,
  L: 2,
  M: 4,
  N: 2,
  O: 1,
  P: 4,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 2,
  V: 5,
  W: 4,
  X: 8,
  Y: 3,
  Z: 10,
  '?': 0,
};

// SOWPODS uses same scores as TWL
export const SOWPODS_SCORES = TWL_SCORES;

export type Dictionary = 'TWL' | 'SOWPODS' | 'ENABLE';

export function getScores(dict: Dictionary): Record<string, number> {
  return dict === 'ENABLE' ? ENABLE_SCORES : TWL_SCORES;
}
