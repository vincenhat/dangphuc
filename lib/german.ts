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


// ─────────────────────────────────────────────────────────────────────────
// Declension helpers — pure functions used by the Writing tab's Word-Forms
// engine to render full Substantiv / Adjektiv tables from the minimal info
// returned by the AI.
// ─────────────────────────────────────────────────────────────────────────

export type Kasus = "nom" | "akk" | "dat" | "gen";
export type Genus = "m" | "f" | "n" | "pl";

export const KASUS_LABEL: Record<Kasus, string> = {
  nom: "Nominativ",
  akk: "Akkusativ",
  dat: "Dativ",
  gen: "Genitiv",
};

export const GENUS_LABEL: Record<Genus, string> = {
  m: "Maskulin",
  f: "Feminin",
  n: "Neutrum",
  pl: "Plural",
};

/** Articles for the four cases, singular by gender. */
const SG_ARTICLES: Record<Exclude<Genus, "pl">, Record<Kasus, string>> = {
  m: { nom: "der", akk: "den", dat: "dem", gen: "des" },
  f: { nom: "die", akk: "die", dat: "der", gen: "der" },
  n: { nom: "das", akk: "das", dat: "dem", gen: "des" },
};
const PL_ARTICLES: Record<Kasus, string> = {
  nom: "die",
  akk: "die",
  dat: "den",
  gen: "der",
};

/**
 * Build the full case × number table for a noun.
 *
 *   - Sg articles change with case; the noun stem stays the same except in
 *     Genitiv singular for masculine/neuter where -s/-es is added (we use
 *     the `genitive_singular` form supplied by the AI when present).
 *   - Plural article is always 'die/die/den/der'.
 *   - Dativ Plural adds -n to the noun unless the plural already ends in
 *     -n or -s (e.g. den Autos, den Kindern).
 */
export function buildNounCases(
  word: string,
  article: GermanArticle,
  plural: string,
  genitiveSg: string,
): {
  sg: Record<Kasus, string>;
  pl: Record<Kasus, string>;
} {
  const genus: Exclude<Genus, "pl"> =
    article === "der" ? "m" : article === "die" ? "f" : "n";
  const sgArt = SG_ARTICLES[genus];

  // Genitiv singular form: feminine never changes; masculine/neuter add -s
  // (or -es when ending in s/ß/x/z/sch — we use the AI's suggestion when
  // present, otherwise a sensible default).
  const fallbackGen =
    genus === "f"
      ? word
      : /(s|ß|x|z|sch)$/i.test(word)
        ? word + "es"
        : word + "s";
  const genForm = genitiveSg && genitiveSg.trim() ? genitiveSg.trim() : fallbackGen;

  // Plural Dativ ending: add -n unless already ends in -n or -s.
  const datPl = /[ns]$/i.test(plural) ? plural : plural + "n";

  return {
    sg: {
      nom: `${sgArt.nom} ${word}`,
      akk: `${sgArt.akk} ${word}`,
      dat: `${sgArt.dat} ${word}`,
      gen: `${sgArt.gen} ${genForm}`,
    },
    pl: {
      nom: `${PL_ARTICLES.nom} ${plural}`,
      akk: `${PL_ARTICLES.akk} ${plural}`,
      dat: `${PL_ARTICLES.dat} ${datPl}`,
      gen: `${PL_ARTICLES.gen} ${plural}`,
    },
  };
}

/**
 * Strip the adjective down to a stem suitable for declension endings.
 * Handles the well-known stem-change cases:
 *   - `hoch` → `hoh` (der hohe Baum)
 *   - `-er` after a vowel: teuer → teur, sauer → saur
 *   - `-el`: dunkel → dunkl, edel → edl
 *   - trailing `-e`: leise → leis
 */
function adjectiveStem(adj: string): string {
  const lower = adj.trim().toLowerCase();
  if (lower === "hoch") return "hoh";
  if (/[aeiouäöü]er$/.test(lower)) {
    return lower.slice(0, -2) + "r";
  }
  if (lower.endsWith("el")) {
    return lower.slice(0, -2) + "l";
  }
  if (lower.endsWith("e")) {
    return lower.slice(0, -1);
  }
  return lower;
}

/**
 * Schwache Deklination (with definite article) — the 4×4 table German
 * learners encounter first. Endings are:
 *
 *           Mask  Fem   Neut  Pl
 *   Nom     -e    -e    -e    -en
 *   Akk     -en   -e    -e    -en
 *   Dat     -en   -en   -en   -en
 *   Gen     -en   -en   -en   -en
 *
 * Each cell is rendered as `{article} {stem}{ending}`. Edge cases like
 * `hoch → der hohe` are handled via `adjectiveStem`.
 */
export function buildAdjectiveWeak(
  adj: string,
): Record<Kasus, Record<Genus, string>> {
  const stem = adjectiveStem(adj);
  const e = `${stem}e`;
  const en = `${stem}en`;

  return {
    nom: {
      m: `der ${e}`,
      f: `die ${e}`,
      n: `das ${e}`,
      pl: `die ${en}`,
    },
    akk: {
      m: `den ${en}`,
      f: `die ${e}`,
      n: `das ${e}`,
      pl: `die ${en}`,
    },
    dat: {
      m: `dem ${en}`,
      f: `der ${en}`,
      n: `dem ${en}`,
      pl: `den ${en}`,
    },
    gen: {
      m: `des ${en}`,
      f: `der ${en}`,
      n: `des ${en}`,
      pl: `der ${en}`,
    },
  };
}

/** The six personal pronouns, in the conventional table order. */
export const VERB_PRONOUNS: readonly { key: "ich" | "du" | "er" | "wir" | "ihr" | "sie"; label: string }[] = [
  { key: "ich", label: "ich" },
  { key: "du", label: "du" },
  { key: "er", label: "er / sie / es" },
  { key: "wir", label: "wir" },
  { key: "ihr", label: "ihr" },
  { key: "sie", label: "sie / Sie" },
];
