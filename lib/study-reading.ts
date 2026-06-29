/**
 * Reading-practice types and validators.
 *
 * A reading is a single short piece (news clip, mini-story, travel snippet,
 * etc.) generated from a topic + level + category. It carries:
 *   - body:     the passage itself (plain text, single paragraph or two)
 *   - summary:  a one-sentence gist for the list view
 *   - glossary: ~5 key vocabulary items pulled from the passage
 *   - questions: 3-5 comprehension MCQs
 *
 * Stored as JSON in D1 (study_readings.glossary / .questions) so the shape
 * can evolve without schema churn.
 */

import type { CefrLevel } from "@/lib/study";

export const READING_CATEGORIES = [
  "News",
  "Story",
  "Travel",
  "Science",
  "Culture",
  "Daily",
  "Business",
  "Technology",
  "Health",
] as const;
export type ReadingCategory = (typeof READING_CATEGORIES)[number];

export const isValidCategory = (s: unknown): s is ReadingCategory =>
  typeof s === "string" && (READING_CATEGORIES as readonly string[]).includes(s);

export interface GlossaryItem {
  word: string;
  meaning: string;       // short English definition / paraphrase
  translation?: string;  // Vietnamese translation (optional)
}

export interface ReadingMCQ {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface Reading {
  topic: string;
  cefr: CefrLevel;
  category: ReadingCategory;
  title: string;
  body: string;
  summary: string;
  glossary: GlossaryItem[];
  questions: ReadingMCQ[];
}

/** Per-level word range used to keep AI output consistent. */
export const LEVEL_WORD_RANGE: Record<CefrLevel, [number, number]> = {
  A1: [70, 110],
  A2: [110, 160],
  B1: [150, 220],
  B2: [200, 280],
  C1: [260, 340],
  C2: [300, 400],
};

export function assertReading(t: unknown): asserts t is Reading {
  if (!t || typeof t !== "object") throw new Error("Reading JSON missing");
  const x = t as Record<string, unknown>;
  if (typeof x.title !== "string" || !x.title.trim()) throw new Error("Missing title");
  if (typeof x.body !== "string" || x.body.trim().length < 30) {
    throw new Error("Missing or too-short body");
  }
  if (typeof x.summary !== "string") throw new Error("Missing summary");
  if (!Array.isArray(x.glossary)) throw new Error("Missing glossary");
  for (const g of x.glossary) {
    if (!g || typeof g !== "object") throw new Error("Bad glossary item");
    const gi = g as Record<string, unknown>;
    if (typeof gi.word !== "string" || typeof gi.meaning !== "string") {
      throw new Error("Glossary item missing fields");
    }
  }
  if (!Array.isArray(x.questions) || x.questions.length === 0) {
    throw new Error("Missing questions");
  }
  for (const q of x.questions) {
    if (!q || typeof q !== "object") throw new Error("Bad question");
    const qi = q as Record<string, unknown>;
    if (typeof qi.id !== "string") throw new Error("Question id missing");
    if (typeof qi.question !== "string") throw new Error("Question text missing");
    if (
      !Array.isArray(qi.options) ||
      qi.options.length < 2 ||
      qi.options.some((o) => typeof o !== "string")
    ) {
      throw new Error("Question options bad");
    }
    if (
      typeof qi.answer !== "number" ||
      qi.answer < 0 ||
      qi.answer >= qi.options.length
    ) {
      throw new Error("Question answer out of range");
    }
  }
}
