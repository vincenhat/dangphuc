/**
 * Practice-test types and grading helpers.
 *
 * Test shape (CEFR-style, no audio since the free tier can't reliably play
 * AI-generated audio):
 *   - reading:   one short passage + ~5 multiple-choice comprehension questions
 *   - vocabulary: ~6 multiple-choice items (word definitions / collocations)
 *   - grammar:   ~6 multiple-choice items
 *   - writing:   one prompt with a target word count, graded by AI
 *
 * The structure is intentionally flat JSON so storing in D1 as a single TEXT
 * column round-trips cleanly. Section weights make the score read like a
 * student would expect (e.g. 16 / 20).
 */

import type { CefrLevel } from "@/lib/study";

export interface MCQItem {
  id: string;
  question: string;
  options: string[]; // length 4
  answer: number;    // index into options
  explanation?: string;
}

export interface ReadingSection {
  kind: "reading";
  passage: string;     // ~120-220 words
  questions: MCQItem[];
}

export interface VocabSection {
  kind: "vocabulary";
  questions: MCQItem[];
}

export interface GrammarSection {
  kind: "grammar";
  questions: MCQItem[];
}

export interface WritingSection {
  kind: "writing";
  prompt: string;
  minWords: number;
  maxWords: number;
}

export type Section =
  | ReadingSection
  | VocabSection
  | GrammarSection
  | WritingSection;

export interface TestStructure {
  topic: string;
  cefr: CefrLevel;
  sections: Section[];
}

/** Per-question student input: index for MCQ, free text for writing. */
export type AnswerMap = Record<string, number | string>;

/**
 * Per-section feedback after grading. Writing carries qualitative notes from
 * the AI; MCQ sections just count correct answers + show explanations.
 */
export interface SectionFeedback {
  kind: Section["kind"];
  scored: number;
  total: number;
  // For MCQ sections:
  per?: { id: string; correct: boolean; correctAnswer?: number; explanation?: string }[];
  // For writing:
  writingScore?: number; // out of 5
  writingNotes?: string;
  writingIssues?: { type: string; original: string; suggestion: string }[];
}

export interface TestFeedback {
  sections: SectionFeedback[];
  total: number;
  max: number;
  summary: string;
}

/** Score weight per section. Writing weighs ~5 to match the qualitative grade. */
export const SECTION_WEIGHT: Record<Section["kind"], number> = {
  reading: 5,
  vocabulary: 6,
  grammar: 6,
  writing: 5,
};

/** Aggregate the max possible score given a test's sections. */
export function maxScore(t: TestStructure): number {
  let total = 0;
  for (const s of t.sections) {
    if (s.kind === "writing") {
      total += SECTION_WEIGHT.writing;
    } else {
      total += s.questions.length; // 1 point per MCQ question
    }
  }
  return total;
}

/** Auto-grade only the MCQ portions. Writing comes from the AI. */
export function gradeMcq(test: TestStructure, answers: AnswerMap): SectionFeedback[] {
  return test.sections.map<SectionFeedback>((sec) => {
    if (sec.kind === "writing") {
      return {
        kind: "writing",
        scored: 0,
        total: SECTION_WEIGHT.writing,
        writingScore: 0,
        writingNotes: "",
      };
    }
    const per: NonNullable<SectionFeedback["per"]> = [];
    let correct = 0;
    for (const q of sec.questions) {
      const a = answers[q.id];
      const ok = typeof a === "number" && a === q.answer;
      if (ok) correct += 1;
      per.push({
        id: q.id,
        correct: ok,
        correctAnswer: q.answer,
        explanation: q.explanation,
      });
    }
    return {
      kind: sec.kind,
      scored: correct,
      total: sec.questions.length,
      per,
    };
  });
}

/** Validate a test object that came back from the AI. Throws on bad shape. */
export function assertTest(t: unknown): asserts t is TestStructure {
  if (!t || typeof t !== "object") throw new Error("Test JSON missing");
  const x = t as Record<string, unknown>;
  if (typeof x.topic !== "string" || !x.topic.trim()) {
    throw new Error("Missing topic");
  }
  if (typeof x.cefr !== "string") throw new Error("Missing CEFR");
  if (!Array.isArray(x.sections)) throw new Error("Missing sections");
  for (const sec of x.sections) {
    if (!sec || typeof sec !== "object") throw new Error("Bad section");
    const s = sec as Record<string, unknown>;
    const kind = s.kind;
    if (kind === "reading") {
      if (typeof s.passage !== "string" || !s.passage.trim()) {
        throw new Error("Reading passage missing");
      }
      assertQuestions(s.questions);
    } else if (kind === "vocabulary" || kind === "grammar") {
      assertQuestions(s.questions);
    } else if (kind === "writing") {
      if (typeof s.prompt !== "string" || !s.prompt.trim()) {
        throw new Error("Writing prompt missing");
      }
    } else {
      throw new Error(`Unknown section kind: ${String(kind)}`);
    }
  }
}

function assertQuestions(raw: unknown): void {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Section needs questions");
  }
  for (const q of raw) {
    if (!q || typeof q !== "object") throw new Error("Bad question");
    const x = q as Record<string, unknown>;
    if (typeof x.id !== "string") throw new Error("Question id missing");
    if (typeof x.question !== "string") throw new Error("Question text missing");
    if (
      !Array.isArray(x.options) ||
      x.options.length < 2 ||
      x.options.some((o) => typeof o !== "string")
    ) {
      throw new Error("Question options bad");
    }
    if (typeof x.answer !== "number" || x.answer < 0 || x.answer >= x.options.length) {
      throw new Error("Question answer out of range");
    }
  }
}

/** Used for client validation before submitting. */
export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
