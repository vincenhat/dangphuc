/**
 * Study module: types + SM-2 spaced-repetition scheduler.
 *
 * SM-2 reference: a card carries an ease factor (EF, default 2.5),
 * a repetition counter (number of consecutive successful recalls),
 * and an interval in days. After each review the user grades 0..5;
 * we collapse the four UI buttons (Again / Hard / Good / Easy) onto
 * that scale.
 *
 * The algorithm is intentionally tiny — anything fancier (FSRS) only
 * pays off at thousands of cards. SM-2 is the well-trodden path used
 * by Anki, SuperMemo, and friends.
 */

export type Grade = "again" | "hard" | "good" | "easy";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export interface StudyCard {
  id: string;
  word: string;
  definition: string;
  example: string;
  translation: string;
  ipa: string;
  cefr: CefrLevel | null;
  tags: string | null;
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
  last_reviewed: string | null;
  created_at: string;
  updated_at: string;
}

export interface WritingEntry {
  id: string;
  original: string;
  corrected: string | null;
  issues: string | null; // JSON
  upgrades: string | null; // JSON
  created_at: string;
}

export interface WritingIssue {
  type: "grammar" | "spelling" | "punctuation" | "style";
  original: string;
  suggestion: string;
  explanation: string;
}

export interface WritingUpgrade {
  original: string;
  suggestion: string;
  why: string;
}

const GRADE_TO_QUALITY: Record<Grade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface SrsState {
  ease_factor: number;
  repetitions: number;
  interval_days: number;
}

/**
 * Apply the SM-2 update for a graded review.
 * Returns the new SRS state and the next interval (in days).
 */
export function applyGrade(state: SrsState, grade: Grade): SrsState {
  const q = GRADE_TO_QUALITY[grade];

  // Standard SM-2: any q < 3 resets the streak.
  if (q < 3) {
    return {
      ease_factor: state.ease_factor, // EF unchanged on lapse in the canonical version
      repetitions: 0,
      interval_days: 1, // see again tomorrow
    };
  }

  // Update the ease factor — clamped at 1.3 so a card never gets impossibly easy.
  const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const nextEf = Math.max(1.3, state.ease_factor + efDelta);

  // Interval grows with successful repetitions.
  let nextInterval: number;
  const nextReps = state.repetitions + 1;
  if (nextReps === 1) nextInterval = 1;
  else if (nextReps === 2) nextInterval = 6;
  else nextInterval = Math.round(state.interval_days * nextEf);

  // "Hard" should grow more conservatively than "Good".
  if (grade === "hard") {
    nextInterval = Math.max(1, Math.round(nextInterval * 0.8));
  }
  // "Easy" gets a small bonus.
  if (grade === "easy") {
    nextInterval = Math.round(nextInterval * 1.3);
  }

  return {
    ease_factor: Math.round(nextEf * 1000) / 1000,
    repetitions: nextReps,
    interval_days: Math.max(1, nextInterval),
  };
}

/** Format a future-day count into a human label. */
export function formatInterval(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  if (months === 1) return "1 month";
  if (months < 12) return `${months} months`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

/** Add N days to YYYY-MM-DD (UTC math, no DST drift). */
export function shiftDateIso(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export function isValidCefr(s: unknown): s is CefrLevel {
  return typeof s === "string" && (CEFR_LEVELS as readonly string[]).includes(s);
}

export function isValidGrade(s: unknown): s is Grade {
  return s === "again" || s === "hard" || s === "good" || s === "easy";
}


/** Hard cap on daily review queue size. */
export const DAILY_REVIEW_LIMIT = 20;

/**
 * Pick at most N cards from `cards` using a deterministic per-day shuffle.
 * Same `dateIso` → same picks, so reloading mid-day stays stable.
 *
 * Implementation: Mulberry32 seeded from a hash of dateIso → Fisher–Yates.
 */
export function pickDailyReview(
  cards: StudyCard[],
  dateIso: string,
  n: number = DAILY_REVIEW_LIMIT,
): StudyCard[] {
  if (cards.length <= n) return cards;
  let seed = 0;
  for (let i = 0; i < dateIso.length; i++) {
    seed = (seed * 31 + dateIso.charCodeAt(i)) >>> 0;
  }
  const rand = mulberry32(seed);
  const idx = cards.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => cards[i]);
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
