import { NextResponse } from "next/server";
import { db, newId } from "@/lib/firestore";
import { nowIso } from "@/lib/format";
import { generateText } from "@/lib/gemini";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/study";
import {
  assertReading,
  isValidCategory,
  LEVEL_WORD_RANGE,
  type Reading,
  type ReadingCategory,
} from "@/lib/study-reading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_readings";

function buildSystemPrompt(cefr: CefrLevel, category: ReadingCategory): string {
  const [minW, maxW] = LEVEL_WORD_RANGE[cefr];
  const tone = CATEGORY_TONE[category];
  return [
    "You are an experienced DaF (Deutsch als Fremdsprache) reading-passage author.",
    "Generate a single short reading IN GERMAN and return ONLY one JSON object — no commentary, no markdown fences.",
    "Schema:",
    '{ "title": string,',
    '  "body": string,',
    '  "summary": string,',
    '  "glossary": [{ "word": string, "meaning": string, "translation": string }],',
    '  "questions": [{ "id": string, "question": string, "options": string[], "answer": number, "explanation": string }] }',
    "Rules:",
    `- Body length: ${minW}-${maxW} words. Stay strictly in that range.`,
    `- Reading level must match CEFR ${cefr}: German vocabulary, sentence length, case complexity, and structure should feel natural for that level.`,
    `- Category: ${category}. ${tone}`,
    "- Title is in German, short (max 8 words), capitalized correctly (Substantive groß).",
    "- Body is German prose. Summary is one German sentence, 12-22 words, capturing the main idea.",
    "- Glossary contains 5 useful words pulled directly from the German body. For nouns include the definite article (der/die/das). ",
    '  "meaning" is a short English paraphrase. "translation" is the Vietnamese translation.',
    "- 4 comprehension questions. Question ids r1..r4. Questions, options and explanations IN GERMAN. Each MCQ has exactly 4 options. answer is a 0-based index.",
    "- Use natural German, not textbook-stilted. Do not invent unverifiable real-world facts; prefer plausible, generic detail.",
  ].join(" ");
}

const CATEGORY_TONE: Record<ReadingCategory, string> = {
  News: "Write a short news-style report. Neutral tone, third person, recent feel.",
  Story: "Write a short narrative with a clear beginning, middle, and end. First or third person.",
  Travel: "Write a vivid travel snippet describing a place, food, or experience.",
  Science: "Write a clear popular-science explanation, no equations, friendly examples.",
  Culture: "Write about a cultural practice, festival, or art form, respectfully and concretely.",
  Daily: "Write a slice-of-life moment grounded in a familiar daily routine.",
  Business: "Write a brief business/workplace piece, like a workplace anecdote or trend note.",
  Technology: "Write about a piece of technology — what it is, why it matters, in plain terms.",
  Health: "Write about wellbeing, lifestyle, or simple health habits with practical detail.",
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    topic?: unknown;
    cefr?: unknown;
    category?: unknown;
    model?: unknown;
  };
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const cefr = typeof body.cefr === "string" ? body.cefr : "";
  const category = typeof body.category === "string" ? body.category : "";
  const model = typeof body.model === "string" ? body.model : undefined;

  if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });
  if (topic.length > 120) {
    return NextResponse.json({ error: "topic too long" }, { status: 400 });
  }
  if (!(CEFR_LEVELS as readonly string[]).includes(cefr)) {
    return NextResponse.json({ error: "invalid CEFR level" }, { status: 400 });
  }
  if (!isValidCategory(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const system = buildSystemPrompt(cefr as CefrLevel, category);
  const userPrompt = `Write the reading now. topic: "${topic}". cefr: ${cefr}. category: ${category}.`;

  let reading: Reading;
  try {
    const raw = await generateText(userPrompt, system, model);
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned non-JSON");
      parsed = JSON.parse(m[0]);
    }
    assertReading(parsed);
    reading = {
      ...parsed,
      topic,
      cefr: cefr as CefrLevel,
      category,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const id = newId();
  const now = nowIso();
  await db().collection(COLLECTION).doc(id).set({
    id,
    topic: topic.slice(0, 120),
    cefr,
    category,
    title: reading.title.slice(0, 200),
    body: reading.body,
    summary: reading.summary,
    glossary: JSON.stringify(reading.glossary),
    questions: JSON.stringify(reading.questions),
    created_at: now,
  });

  return NextResponse.json({ id, reading });
}
