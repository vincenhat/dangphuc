import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import { CEFR_LEVELS } from "@/lib/study";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/study/generate
 * Body: { word: string }
 * Returns: { definition, example, translation, ipa, cefr }
 *
 * We ask Gemini to return a single JSON object so the client can drop the
 * fields straight onto the form. Translations are Vietnamese per the project
 * default. Includes light retry on JSON parse failure.
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
    "You are an ESL helper. For an English word, return ONLY a single JSON object with these keys and no extra commentary: " +
    `{"definition": string, "example": string, "translation": string, "ipa": string, "cefr": one of ${CEFR_LEVELS.join("|")}}.` +
    ' "definition" must be short, plain English suitable for a beginner. "example" must use the word in a complete sentence. ' +
    '"translation" must be in Vietnamese. "ipa" must be the General American IPA in slashes (e.g. "/həˈloʊ/"). ' +
    '"cefr" is your best estimate of the word\'s CEFR level. Do not include trailing text, code fences, or markdown.';

  const prompt = `Word: ${word}`;

  try {
    const raw = await generateText(prompt, system, model);
    const cleaned = stripFences(raw).trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned non-JSON");
      parsed = JSON.parse(m[0]);
    }

    const cefr = typeof parsed.cefr === "string" && (CEFR_LEVELS as readonly string[]).includes(parsed.cefr)
      ? parsed.cefr
      : null;

    return NextResponse.json({
      definition: typeof parsed.definition === "string" ? parsed.definition : "",
      example: typeof parsed.example === "string" ? parsed.example : "",
      translation: typeof parsed.translation === "string" ? parsed.translation : "",
      ipa: typeof parsed.ipa === "string" ? parsed.ipa : "",
      cefr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function stripFences(s: string): string {
  // Drop ```json ... ``` and ``` ... ``` wrappers if Gemini sneaks them in.
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}
