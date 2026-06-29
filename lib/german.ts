/**
 * German vocabulary card types.
 *
 * Shares the SM-2 SRS state shape with English `StudyCard` (lib/study.ts) so
 * the same scheduler (`applyGrade`, `shiftDateIso`) drops in unchanged. The
 * extra fields cover what makes German vocabulary distinctive:
 *
 *   - `article`: der / die / das for nouns. Memorising the article with the
 *     noun is non-negotiable in German; storing it as a structured field
 *     (rather than baking it into the word) lets the UI flag missing articles
 *     and lets the AI fill it in automatically.
 *   - `plural`: nominative plural form. Always shown next to the noun.
 *   - `pos`: part of speech, so we know when to surface article/plural UI.
 */

import type { CefrLevel } from "@/lib/study";

export type GermanArticle = "der" | "die" | "das";
export type GermanPos = "noun" | "verb" | "adjective" | "adverb" | "other";

export const GERMAN_ARTICLES: readonly GermanArticle[] = ["der", "die", "das"];
export const GERMAN_POS: readonly GermanPos[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "other",
];

export interface GermanCard {
  id: string;
  word: string;
  definition: string;          // short English definition (or Vietnamese — user choice)
  example: string;             // example sentence in German
  translation: string;         // Vietnamese translation
  ipa: string;
  cefr: CefrLevel | null;
  pos: GermanPos | null;
  article: GermanArticle | null; // only meaningful when pos === "noun"
  plural: string | null;         // only meaningful when pos === "noun"
  tags: string | null;
  // SM-2 state — identical layout to StudyCard so applyGrade() works directly.
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
  last_reviewed: string | null;
  created_at: string;
  updated_at: string;
}

export function isValidArticle(s: unknown): s is GermanArticle {
  return typeof s === "string" && (GERMAN_ARTICLES as readonly string[]).includes(s);
}

export function isValidPos(s: unknown): s is GermanPos {
  return typeof s === "string" && (GERMAN_POS as readonly string[]).includes(s);
}

/** "der Hund · die Hunde" style label for noun listings. */
export function nounLabel(card: GermanCard): string {
  if (card.pos !== "noun") return card.word;
  const left = card.article ? `${card.article} ${card.word}` : card.word;
  return card.plural ? `${left} · die ${card.plural}` : left;
}
