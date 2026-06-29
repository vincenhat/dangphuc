/**
 * Starter German vocabulary seeded into Firestore on first /german visit.
 *
 * ~500+ words across A1 (basics, family, food, body, common verbs/adjectives,
 * colors, days, numbers, weather, places) → A2 (work, travel, clothing,
 * health, feelings, kitchen, rooms, leisure, connectors) → B1 (society,
 * environment, abstract concepts, reflexive verbs, discourse markers).
 *
 * Each entry carries German-specific fields:
 *   - article (der/die/das) and plural for nouns
 *   - pos (noun/verb/adjective/adverb/other) so the UI knows when to surface
 *     the article + plural row
 *
 * The data lives in `german-seed.data.json` so this file stays readable. The
 * backfill in app/(shell)/german/page.tsx writes only words not already in
 * the deck (lowercase match on `word`), so editing this file is safe — existing
 * cards aren't disturbed.
 */

import seed from "./german-seed.data.json";
import type { CefrLevel } from "@/lib/study";
import type { GermanArticle, GermanPos } from "@/lib/german";

export interface GermanSeedCard {
  word: string;
  definition: string;
  example: string;
  translation: string;
  ipa: string;
  cefr: CefrLevel;
  pos: GermanPos;
  article: GermanArticle | null;
  plural: string | null;
  tags: string;
}

export const GERMAN_SEED_CARDS: GermanSeedCard[] = seed as GermanSeedCard[];
