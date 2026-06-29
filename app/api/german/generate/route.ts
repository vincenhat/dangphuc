import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import { CEFR_LEVELS } from "@/lib/study";
import { GERMAN_ARTICLES, GERMAN_POS } from "@/lib/german";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/german/generate
 * Body: { word: string, model?: string }
 *
 * Trả về một JSON object để client điền form thêm thẻ tiếng Đức:
 *   { definition, example, translation, ipa, cefr, pos, article, plural }
 *
 * `article` và `plural` chỉ có giá trị khi `pos === "noun"`. Definition viết
 * ngắn gọn (English đơn giản), translation là tiếng Việt, ví dụ dùng từ
 * trong câu tiếng Đức tự nhiên.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { word?: unknown; model?: unknown };
  const word = typeof body.word === "string" ? body.word.trim() : "";
  const model = typeof body.model === "string" ? body.model : undefined;
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });
  if (word.length > 80) {
    return NextResponse.json({ error: "word too long" }, { status: 400 });
  }

  const system =
    "You are a German tutor helping a Vietnamese learner. " +
    "For a German word, return ONLY a single JSON object, no markdown fences, with keys: " +
    `{"definition": string, "example": string, "translation": string, "ipa": string, ` +
    `"cefr": one of ${CEFR_LEVELS.join("|")}|null, ` +
    `"pos": one of ${GERMAN_POS.join("|")}|null, ` +
    `"article": one of ${GERMAN_ARTICLES.join("|")}|null, ` +
    `"plural": string|null}. ` +
    'Rules: ' +
    '"definition" is a short, plain English gloss suitable for a beginner. ' +
    '"example" is one natural German sentence using the word (8-16 words). ' +
    '"translation" is the Vietnamese translation of the word itself (not the example). ' +
    '"ipa" is the IPA pronunciation in slashes (standard German), e.g. "/ˈhʊnt/". ' +
    '"cefr" is your best estimate (A1..C2) of the word frequency level. ' +
    '"pos" identifies the part of speech. ' +
    '"article" is "der", "die", or "das" — REQUIRED when pos is "noun", otherwise null. ' +
    '"plural" is the nominative plural form — REQUIRED when pos is "noun" (e.g. "Hunde" for "Hund"), otherwise null. ' +
    'For verbs, you may include the infinitive form unchanged. ' +
    'Never include markdown, code fences, or commentary — output only the JSON object.';

  const prompt = `Word: ${word}`;

  try {
    const raw = await generateText(prompt, system, model);
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned non-JSON");
      parsed = JSON.parse(m[0]);
    }

    const cefr =
      typeof parsed.cefr === "string" && (CEFR_LEVELS as readonly string[]).includes(parsed.cefr)
        ? parsed.cefr
        : null;
    const pos =
      typeof parsed.pos === "string" && (GERMAN_POS as readonly string[]).includes(parsed.pos)
        ? parsed.pos
        : null;
    const article =
      typeof parsed.article === "string" &&
      (GERMAN_ARTICLES as readonly string[]).includes(parsed.article)
        ? parsed.article
        : null;

    return NextResponse.json({
      definition: typeof parsed.definition === "string" ? parsed.definition : "",
      example: typeof parsed.example === "string" ? parsed.example : "",
      translation: typeof parsed.translation === "string" ? parsed.translation : "",
      ipa: typeof parsed.ipa === "string" ? parsed.ipa : "",
      cefr,
      pos,
      // Articles/plurals only make sense for nouns — drop them otherwise to
      // keep the deck rows clean.
      article: pos === "noun" ? article : null,
      plural:
        pos === "noun" && typeof parsed.plural === "string"
          ? parsed.plural.slice(0, 120)
          : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
