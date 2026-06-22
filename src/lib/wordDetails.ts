import { TWL_SCORES } from '../data/tileScores';

export interface WordDetails {
  phonetic: string;
  etymology: string;
  frequency: {
    percentage: number;
    label: 'Rare' | 'Uncommon' | 'Common' | 'Very Common';
  };
  examples: string[];
  popularSearches: string[];
  phrases: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
  pitfall: string;
  strategy: string;
  letterBreakdown: {
    vowelsCount: number;
    consonantsCount: number;
    uniqueLettersCount: number;
    highestTileScore: number;
    highestTileLetter: string;
  };
  wordFamily: string[];
  interestingFact: string;
  usageTip: string;
  similarWords: string[];
  synonyms: string[];
  antonyms: string[];
}

// Generate simple hash code for word to ensure stable deterministic templates
function hashWord(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = word.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Programmatic Phonetics Speller
export function getPhonetic(word: string): string {
  const w = word.toUpperCase();
  let ipa = '';

  // Basic syllable breakdown rules
  let i = 0;
  while (i < w.length) {
    const char = w[i];
    const next = w[i + 1] || '';

    if (char === 'C') {
      if ('EIY'.includes(next)) {
        ipa += 's';
      } else {
        ipa += 'k';
      }
    } else if (char === 'Q') {
      ipa += 'kw';
    } else if (char === 'X') {
      ipa += 'ks';
    } else if (char === 'J') {
      ipa += 'dʒ';
    } else if (char === 'G') {
      if ('EIY'.includes(next)) {
        ipa += 'dʒ';
      } else {
        ipa += 'ɡ';
      }
    } else if (char === 'S') {
      if (next === 'H') {
        ipa += 'ʃ';
        i++;
      } else {
        ipa += 's';
      }
    } else if (char === 'T') {
      if (next === 'H') {
        ipa += 'θ'; // rough approximation
        i++;
      } else {
        ipa += 't';
      }
    } else if (char === 'P') {
      if (next === 'H') {
        ipa += 'f';
        i++;
      } else {
        ipa += 'p';
      }
    } else if (char === 'K') {
      if (i === 0 && next === 'N') {
        // silent K
      } else {
        ipa += 'k';
      }
    } else if (char === 'W' && next === 'R') {
      // silent W
    } else if ('AEIOU'.includes(char)) {
      // rough vowel speller
      if (char === 'A') {
        ipa += next === 'E' ? 'eɪ' : 'æ';
      } else if (char === 'E') {
        ipa += next === 'E' ? 'iː' : 'e';
      } else if (char === 'I') {
        ipa += 'ɪ';
      } else if (char === 'O') {
        ipa += next === 'O' ? 'uː' : 'ɒ';
      } else if (char === 'U') {
        ipa += 'ʌ';
      }
    } else if (char === 'Y') {
      if (i === w.length - 1) {
        ipa += 'i';
      } else {
        ipa += 'aɪ';
      }
    } else if (char !== 'H' || i === 0) {
      ipa += char.toLowerCase();
    }
    i++;
  }

  // Format with slashes and stress marks
  const stressIdx = Math.floor(ipa.length / 3);
  const formatted =
    stressIdx > 0 ? `/${ipa.slice(0, stressIdx)}ˈ${ipa.slice(stressIdx)}/` : `/${ipa}/`;

  return formatted;
}

// Programmatic Etymology Generator
export function getEtymology(word: string): string {
  const w = word.toUpperCase();

  // 1. Check common prefixes
  if (w.startsWith('TRANS')) {
    return 'Likely derived from the Latin "trans-", meaning "across, through, or beyond", combined with classical roots.';
  }
  if (w.startsWith('RE')) {
    return 'Often originates from the Latin prefix "re-", expressing intensive action, repetition, or backward motion.';
  }
  if (w.startsWith('DE')) {
    return 'Often originates from the Latin "de-", meaning "down, away, or opposite", indicating reversal or removal.';
  }
  if (w.startsWith('CON') || w.startsWith('COM') || w.startsWith('CO')) {
    return 'May trace back to the Latin prefix "com-" or "con-", meaning "together, with, or jointly".';
  }
  if (w.startsWith('SUB')) {
    return 'Likely formed with the Latin prefix "sub-", meaning "under, below, or secondary".';
  }
  if (w.startsWith('PRE')) {
    return 'Often formed from the Latin prefix "pre-", meaning "before or in front of" in time or position.';
  }
  if (w.startsWith('POST')) {
    return 'Often formed from the Latin prefix "post-", meaning "after or behind".';
  }
  if (w.startsWith('UN')) {
    return 'Likely derived from the Old English/Germanic prefix "un-", expressing negation or reversal.';
  }

  // 2. Check common suffixes
  if (w.endsWith('TION') || w.endsWith('SION')) {
    return 'Often formed by appending the Latin suffix "-tio" (yielding "-tion"), creating a noun of action or state from a verb stem.';
  }
  if (w.endsWith('MENT')) {
    return 'Likely derived from Middle English via Old French, utilizing the Latin noun-forming suffix "-mentum" denoting result or instrument.';
  }
  if (w.endsWith('ISM')) {
    return 'May trace back to Ancient Greek "-ismos", via Latin "-ismus", denoting a system of belief, doctrine, or behavior.';
  }
  if (w.endsWith('IST')) {
    return 'Often from the Greek suffix "-istes", expressing an agent, practitioner, or believer in a system.';
  }
  if (w.endsWith('LOGY')) {
    return 'Likely derived from the Greek combining root "-logia", representing the study or science of a subject.';
  }
  if (w.endsWith('ABLE') || w.endsWith('IBLE')) {
    return 'Often formed with the Latin adjectival suffix "-abilis", denoting capability, worthiness, or ability to undergo an action.';
  }

  // 3. Fallbacks based on word characteristics
  const hash = hashWord(w);
  const fallbacks = [
    'Based on its structure, this word likely follows standard English morphological patterns, though exact historical origins are not available.',
    'While its precise historical etymology is unclear, it conforms to typical English phonetic and structural rules.',
    "This word's structure suggests a derivation from common English phonetic roots, though specific origin data is not available.",
    'Like many English words, its origin likely blends multiple historical linguistic influences, though exact etymology is undetermined.',
    'This word follows conventional linguistic patterns for its length, though exact historical derivation is not available.',
  ];

  return fallbacks[hash % fallbacks.length];
}

// Programmatic Word Frequency
export function getFrequency(word: string): {
  percentage: number;
  label: 'Rare' | 'Uncommon' | 'Common' | 'Very Common';
} {
  const w = word.toUpperCase();
  const len = w.length;

  // Base calculation on letters and length
  const hasRareLetters = /[ZQJX]/.test(w);
  const hasSemiRareLetters = /[JKWYBFP]/.test(w);

  let score = 90 - len * 4; // longer words are rarer
  if (hasRareLetters) score -= 30;
  if (hasSemiRareLetters) score -= 15;

  // Keep score within bounds [1, 99]
  score = Math.max(1, Math.min(99, score));

  let label: 'Rare' | 'Uncommon' | 'Common' | 'Very Common' = 'Common';
  if (score < 20) {
    label = 'Rare';
  } else if (score < 50) {
    label = 'Uncommon';
  } else if (score < 80) {
    label = 'Common';
  } else {
    label = 'Very Common';
  }

  return { percentage: score, label };
}

// Programmatic Example Sentences
export function getExamples(word: string): string[] {
  const w = word.toUpperCase();
  const wl = w.toLowerCase();

  const templates = [
    `Understanding the exact meaning of "${wl}" can significantly improve your writing style.`,
    `During the final turn of the Scrabble tournament, he played "${wl}" to secure the victory.`,
    `She described the concept as somewhat "${wl}", surprising the rest of the board members.`,
    `Linguists often study the historical evolution of "${wl}" in early literature.`,
    `Please ensure you spell "${wl}" correctly when adding it to your game sheet.`,
    `The referee verified that "${wl}" is a valid word under current dictionary rules.`,
    `In professional circles, using the word "${wl}" conveys a high level of precision.`,
  ];

  const hash = hashWord(w);
  const firstIdx = hash % templates.length;
  const secondIdx = (hash + 3) % templates.length;

  return [
    templates[firstIdx],
    templates[secondIdx === firstIdx ? (secondIdx + 1) % templates.length : secondIdx],
  ];
}

// Programmatic Related/Popular Search Queries
export function getPopularSearches(word: string): string[] {
  const w = word.toLowerCase();
  return [
    `Is ${w} a valid Scrabble word?`,
    `How many points is ${w} worth?`,
    `Anagrams of the word ${w}`,
    `Words ending in ${w.slice(-2)}`,
    `Words starting with ${w.slice(0, 2)}`,
  ];
}

// Programmatic AI Explainer Data
export function getAIExplainer(word: string): {
  difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
  pitfall: string;
  strategy: string;
} {
  const w = word.toUpperCase();
  const len = w.length;

  // 1. Difficulty
  let difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Master' = 'Beginner';
  if (len > 8 || /[ZQJX]/.test(w)) {
    difficulty = 'Master';
  } else if (len > 5 || /[KWY]/.test(w)) {
    difficulty = 'Expert';
  } else if (len > 3) {
    difficulty = 'Intermediate';
  }

  // 2. Common spelling/usage pitfall
  let pitfall = 'None detected. This word has standard phonetics.';
  if (w.includes('IE') || w.includes('EI')) {
    pitfall = 'Watch the "i before e except after c" rule. Ensure the vowel order is correct.';
  } else if (/(.)\1/.test(w)) {
    const doubleLetter = w.match(/(.)\1/)?.[0] || '';
    pitfall = `Remember the double letters "${doubleLetter}". It is easy to miss one during high-speed play.`;
  } else if (w.startsWith('K') && w.length > 2 && w[1] === 'N') {
    pitfall = 'Starts with a silent "K". Do not forget to spell it with the initial K.';
  } else if (w.endsWith('E') && w.length > 3) {
    pitfall =
      'Has a silent ending "E", which changes the preceding vowel sound but is often forgotten.';
  } else if (w.includes('PH')) {
    pitfall = 'Contains "PH" which sounds like "F". Ensure you do not spell it with a literal F.';
  } else if (w.includes('Y') && len > 4) {
    pitfall =
      'The letter Y is used as a vowel in this word; ensure it is placed correctly instead of an I.';
  } else if (/[QZJX]/.test(w)) {
    pitfall =
      'Uses high-scoring consonants. Do not confuse their placement with phonetically similar characters.';
  }

  // 3. Strategy explanation
  let strategy = 'A standard word. Use it as a solid filler on your rack to rotate letters.';
  if (len >= 7) {
    strategy = `This is a Bingo-length word! Playing all 7 letters from your rack gives a huge +50 point bonus. Keep an eye out for layout paths.`;
  } else if (/[QZJX]/.test(w)) {
    const high = w.match(/[QZJX]/)?.[0] || '';
    strategy = `Contains high-value "${high}" (worth up to 10 points). Prioritize playing this on a double-letter or triple-letter score to amplify your score to 30+ points.`;
  } else if (!/[AEIOU]/.test(w)) {
    strategy = `A vowel-less word! Essential for dumping consonants when you have drawn no vowels. Keep it handy to avoid passing.`;
  } else if (w.replace(/[^AEIOU]/g, '').length > len * 0.6) {
    strategy = `Vowel-heavy word. Excellent for clearing your rack if you are stuck with too many vowels. Place it strategically to rotate letters.`;
  } else if (len === 2) {
    strategy = `A 2-letter word. Crucial for parallel plays! Slide it adjacent to existing words on the board to score on multiple words simultaneously.`;
  }

  return { difficulty, pitfall, strategy };
}

// Programmatic Common Phrases
export function getCommonPhrases(word: string): string[] {
  const w = word.toUpperCase();
  const wl = w.toLowerCase();

  const commonMap: Record<string, string[]> = {
    APPLE: ['apple of my eye', 'bad apple', 'apple pie', 'apple computer'],
    BANANA: ['banana split', 'go bananas', 'banana republic', 'banana peel'],
    EXAMPLE: ['for example', 'lead by example', 'classic example', 'prime example'],
    HELLO: ['say hello', 'hello world', 'hello there', 'hello hello'],
    QUIXOTIC: ['quixotic quest', 'quixotic venture', 'quixotic character', 'quixotic struggle'],
    ZA: ['za slice', 'pizza za', 'slice of za', 'order a za'],
  };

  if (commonMap[w]) return commonMap[w];

  return [`the ${wl} effect`, `master of ${wl}`, `playing with ${wl}`, `in terms of ${wl}`];
}

// Programmatic Letter Statistics Breakdown
export function getLetterBreakdown(word: string) {
  const w = word.toUpperCase();
  const vowels = w.replace(/[^AEIOUY]/g, '').length;
  const consonants = w.length - vowels;
  const uniqueLetters = new Set(w).size;
  const TILE_VALUES = TWL_SCORES;

  let highestTileScore = 0;
  let highestTileLetter = '';
  for (const char of w) {
    const val = TILE_VALUES[char] || 0;
    if (val > highestTileScore) {
      highestTileScore = val;
      highestTileLetter = char;
    }
  }

  return {
    vowelsCount: vowels,
    consonantsCount: consonants,
    uniqueLettersCount: uniqueLetters,
    highestTileScore,
    highestTileLetter,
  };
}

// Programmatic Word Family (Morphological variants)
export function getWordFamily(word: string): string[] {
  const wl = word.toLowerCase();
  const families: Record<string, string[]> = {
    apple: ['apples', 'apple pie', 'crabapple', 'applewood'],
    za: ['zas', 'pizza', 'za slice'],
  };
  if (families[wl]) return families[wl];

  const results = [`${wl}s`, `un${wl}`, `re${wl}`];
  if (wl.endsWith('e')) {
    results.push(`${wl.slice(0, -1)}ing`);
    results.push(`${wl}d`);
  } else {
    results.push(`${wl}ing`);
    results.push(`${wl}ed`);
  }
  return results;
}

// Programmatic Trivia Fact Generator
export function getInterestingFact(word: string): string {
  const w = word.toUpperCase();
  const len = w.length;
  const unique = new Set(w).size;

  if (len === unique) {
    return `This word is a perfect "isogram" (or non-pattern word), meaning it contains no repeating letters. It is highly valued for rack flexibility!`;
  }

  const reversed = w.split('').reverse().join('');
  if (reversed === w) {
    return `This word is a palindrome! It spells the exact same word backwards and forwards, a rare linguistic symmetry.`;
  }

  if (/[ZQJX]/.test(w)) {
    const letter = w.match(/[ZQJX]/)?.[0] || '';
    return `Contains the letter "${letter}", one of the rarest and highest scoring tiles in Scrabble, carrying a base value of up to 10 points.`;
  }

  const hash = hashWord(w);
  const facts = [
    `A standard valid Scrabble word that can be highly useful for transitioning between different board quadrants.`,
    `This word provides solid placement flexibility, making it a reliable option for typical game situations.`,
    `With its balanced structure, this word is frequently useful for maintaining board control.`,
  ];
  return facts[hash % facts.length];
}

// Programmatic Strategy Tip
export function getUsageTip(word: string): string {
  const w = word.toUpperCase();
  const len = w.length;
  if (len <= 3) {
    return `Excellent for parallel plays! Slide this short word alongside existing board words to trigger multiple intersections in a single turn.`;
  }
  if (/[ZQJX]/.test(w)) {
    return `Keep this word in mind when holding the high-scoring tiles. Landing the premium consonant on a Double/Triple Letter score increases efficiency.`;
  }
  if (len >= 7) {
    return `This is a 7+ letter word. Use it as a Bingo candidate if you have the space on the board for a +50 point bonus.`;
  }
  return `Try to save this word for placing next to open vowels to trigger parallel intersections and score double points.`;
}

// Programmatic Similar Spelled Words
export function getSimilarWords(word: string): string[] {
  const wl = word.toLowerCase();
  const len = wl.length;

  if (len > 3) {
    const prefix = wl.slice(0, 2);
    const suffix = wl.slice(-2);
    return [`${prefix}t${suffix}`, `${prefix}n${suffix}`, `${prefix}s${suffix}`, `s${wl}`];
  }

  return [`a${wl}`, `${wl}s`, `re${wl}`];
}

// Programmatic Synonyms and Antonyms lookup
export function getSynonymsAndAntonyms(word: string): { synonyms: string[]; antonyms: string[] } {
  const w = word.toUpperCase();
  const synonymsMap: Record<string, string[]> = {
    APPLE: ['fruit', 'pome', 'malus', 'orchard fruit'],
    BANANA: ['fruit', 'plantain', 'yellow fruit'],
    HELLO: ['greeting', 'salutation', 'welcome', 'hi', 'howdy'],
    QUIXOTIC: ['idealistic', 'visionary', 'impractical', 'romantic', 'dreamy'],
    ZA: ['pizza', 'pie', 'flatbread', 'food'],
    GOOD: ['excellent', 'fine', 'superior', 'decent', 'valid'],
    BAD: ['poor', 'terrible', 'awful', 'deficient', 'invalid'],
    HAPPY: ['joyful', 'cheerful', 'glad', 'delighted', 'content'],
    SAD: ['unhappy', 'sorrowful', 'gloomy', 'dejected', 'downcast'],
    EAT: ['consume', 'devour', 'dine', 'ingest', 'feed'],
    DRINK: ['sip', 'gulp', 'imbibe', 'quaff', 'swill'],
    RUN: ['jog', 'sprint', 'dash', 'scurry', 'gallop'],
    WALK: ['stroll', 'amble', 'pace', 'march', 'wander'],
    BIG: ['large', 'huge', 'giant', 'massive', 'immense'],
    SMALL: ['tiny', 'little', 'petite', 'minute', 'diminutive'],
    FAST: ['quick', 'rapid', 'swift', 'speedy', 'hasty'],
    SLOW: ['leisurely', 'sluggish', 'deliberate', 'gradual'],
  };

  const antonymsMap: Record<string, string[]> = {
    HELLO: ['goodbye', 'farewell', 'adieu'],
    QUIXOTIC: ['practical', 'pragmatic', 'realistic', 'matter-of-fact'],
    GOOD: ['bad', 'poor', 'evil', 'wicked'],
    BAD: ['good', 'excellent', 'decent', 'righteous'],
    HAPPY: ['sad', 'unhappy', 'sorrowful', 'miserable'],
    SAD: ['happy', 'joyful', 'cheerful', 'glad'],
    BIG: ['small', 'tiny', 'little', 'minute'],
    SMALL: ['big', 'large', 'huge', 'giant'],
    FAST: ['slow', 'sluggish', 'leisurely'],
    SLOW: ['fast', 'quick', 'rapid', 'swift'],
  };

  return {
    synonyms: synonymsMap[w] || [],
    antonyms: antonymsMap[w] || [],
  };
}

// Compile everything into a unified detail object
export function getWordDetails(word: string): WordDetails {
  const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
  const phonetic = getPhonetic(cleanWord);
  const etymology = getEtymology(cleanWord);
  const frequency = getFrequency(cleanWord);
  const examples = getExamples(cleanWord);
  const popularSearches = getPopularSearches(cleanWord);
  const phrases = getCommonPhrases(cleanWord);
  const ai = getAIExplainer(cleanWord);
  const letterBreakdown = getLetterBreakdown(cleanWord);
  const wordFamily = getWordFamily(cleanWord);
  const interestingFact = getInterestingFact(cleanWord);
  const usageTip = getUsageTip(cleanWord);
  const similarWords = getSimilarWords(cleanWord);
  const { synonyms, antonyms } = getSynonymsAndAntonyms(cleanWord);

  return {
    phonetic,
    etymology,
    frequency,
    examples,
    popularSearches,
    phrases,
    difficulty: ai.difficulty,
    pitfall: ai.pitfall,
    strategy: ai.strategy,
    letterBreakdown,
    wordFamily,
    interestingFact,
    usageTip,
    similarWords,
    synonyms,
    antonyms,
  };
}
