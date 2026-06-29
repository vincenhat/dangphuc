import { NextResponse } from "next/server";
import { db, newId } from "@/lib/firestore";
import { nowIso } from "@/lib/format";
import { generateText } from "@/lib/gemini";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/study";
import { assertTest, maxScore, type TestStructure } from "@/lib/study-test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_tests";

const SYSTEM = [
  "You are an experienced DaF (Deutsch als Fremdsprache) test writer. Generate a CEFR-aligned practice test FOR GERMAN.",
  "Return ONLY a single JSON object, no commentary, no markdown fences.",
  "The JSON shape must be:",
  '{ "topic": string, "cefr": string, "sections": [',
  '  { "kind": "reading", "passage": string, "questions": MCQ[] },',
  '  { "kind": "vocabulary", "questions": MCQ[] },',
  '  { "kind": "grammar", "questions": MCQ[] },',
  '  { "kind": "writing", "prompt": string, "minWords": number, "maxWords": number }',
  "] }",
  'where MCQ = { "id": string, "question": string, "options": string[], "answer": number, "explanation": string }.',
  "Rules:",
  "- All four sections in this exact order: reading, vocabulary, grammar, writing.",
  "- ALL content (passage, questions, options, prompts, explanations) MUST be in GERMAN.",
  "- Reading passage 120-220 German words, on the requested topic, level-appropriate (vocabulary, case complexity, sentence length).",
  "- 5 reading questions, 6 vocabulary questions, 6 grammar questions.",
  "- Each MCQ has exactly 4 options. Answer is a 0-based index into options.",
  "- Question ids must be globally unique within the test (e.g. r1..r5, v1..v6, g1..g6).",
  '- Each MCQ "explanation" is one short sentence in German justifying the answer.',
  "- Grammar questions should target topics typical for that CEFR level: articles & cases at A1-A2, modal/separable verbs and Perfekt at A2-B1, Konjunktiv II and passive at B1-B2.",
  "- Vocabulary questions should use authentic German collocations and synonyms at the target level.",
  "- Writing prompt must be in German, reference the topic, and suit the level. Word range scales with level (A1=40-60, A2=60-80, B1=80-120, B2=120-180, C1=180-250, C2=220-300).",
  "- Use natural German, not textbook-stilted phrasing.",
].join(" ");

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    topic?: unknown;
    cefr?: unknown;
    model?: unknown;
  };
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const cefr = typeof body.cefr === "string" ? body.cefr : "";
  const model = typeof body.model === "string" ? body.model : undefined;

  if (!topic) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }
  if (topic.length > 200) {
    return NextResponse.json({ error: "topic too long" }, { status: 400 });
  }
  if (!(CEFR_LEVELS as readonly string[]).includes(cefr)) {
    return NextResponse.json({ error: "invalid CEFR level" }, { status: 400 });
  }

  const prompt = `Create the test now. topic: "${topic}". cefr: ${cefr}.`;

  let test: TestStructure;
  try {
    const raw = await generateText(prompt, SYSTEM, model);
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
    assertTest(parsed);
    test = parsed;
    // Force topic/cefr to match the user's selection regardless of what the
    // model echoed back, so the stored doc is consistent.
    test.topic = topic;
    test.cefr = cefr as CefrLevel;
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const id = newId();
  const now = nowIso();
  await db().collection(COLLECTION).doc(id).set({
    id,
    topic: topic.slice(0, 200),
    cefr,
    // Keep the same string-JSON layout the legacy SQL schema used, so the
    // detail route can hand it back to the client unchanged.
    sections: JSON.stringify(test),
    answers: null,
    score: null,
    max_score: maxScore(test),
    feedback: null,
    status: "in_progress",
    created_at: now,
    submitted_at: null,
  });

  return NextResponse.json({ id, test });
}
