import seed from "./study-seed.data.json";
import type { CefrLevel } from "@/lib/study";

export interface SeedCard {
  word: string;
  definition: string;
  example: string;
  translation: string;
  ipa: string;
  cefr: CefrLevel;
  tags: string;
}

export const SEED_CARDS: SeedCard[] = seed as SeedCard[];
