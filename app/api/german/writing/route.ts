import { NextResponse } from "next/server";
import { db, newId } from "@/lib/firestore";
import { nowIso } from "@/lib/format";
import { generateText } from "@/lib/gemini";
import type { WritingEntry, WritingIssue, WritingUpgrade } from "@/lib/study";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_writing_entries";

interface GeneratedFeedback {
  corrected: string;
  issues: WritingIssue[];
  upgrades: WritingUpgrade[];
}

const SYSTEM = [
  "You are a DaF (Deutsch als Fremdsprache) writing tutor. The user is a Vietnamese speaker learning German.",
  "Given a German paragraph, return ONLY a single JSON object, no commentary, with keys:",
  '  "corrected" (string): the same paragraph rewritten with German grammar/spelling/punctuation/case-marking fixed but the original voice preserved.',
  '  "issues" (array): each item { "type": "grammar"|"spelling"|"punctuation"|"style", "original": string, "suggestion": string, "explanation": string (one short sentence, in Vietnamese) }.',
  '  "upgrades" (array): suggestions to swap simple A2/B1 words for stronger B1+/B2 German alternatives where natural. Each item { "original": string, "suggestion": string, "why": string (one short sentence, in Vietnamese) }.',
  "Cap each array at 8 items. Do not include code fences.",
  "Pay special attention to articles (der/die/das), case endings (Nominativ/Akkusativ/Dativ/Genitiv), verb position, and separable verb prefixes.",
].join(" ");

/** GET /api/study/writing â€” recent entries for the writing tab. */
export async function GET() {
  const snap = await db()
    .collection(COLLECTION)
    .orderBy("created_at", "desc")
    .limit(50)
    .get();
  const entries = snap.docs.map((d) => d.data() as WritingEntry);
  return NextResponse.json({ entries });
}

/**
 * POST /api/study/writing
 * Body: { text: string, model?: string }
 * Runs the AI, persists the entry, and returns the parsed feedback.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { text?: unknown; model?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const model = typeof body.model === "string" ? body.model : undefined;
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 4000) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  let parsed: GeneratedFeedback;
  try {
    const raw = await generateText(text, SYSTEM, model);
    parsed = parseFeedback(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const id = newId();
  const doc: WritingEntry = {
    id,
    original: text,
    corrected: parsed.corrected,
    // Keep JSON-string columns identical to the previous SQL contract, so the
    // client's parseJsonArray() helper still works unchanged.
    issues: JSON.stringify(parsed.issues),
    upgrades: JSON.stringify(parsed.upgrades),
    created_at: nowIso(),
  };
  await db().collection(COLLECTION).doc(id).set(doc);

  return NextResponse.json({ id, ...parsed });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db().collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}

function parseFeedback(raw: string): GeneratedFeedback {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned non-JSON");
    json = JSON.parse(m[0]);
  }

  const corrected = typeof json.corrected === "string" ? json.corrected : "";
  const issues = Array.isArray(json.issues)
    ? json.issues.slice(0, 16).map(toIssue).filter((x): x is WritingIssue => !!x)
    : [];
  const upgrades = Array.isArray(json.upgrades)
    ? json.upgrades.slice(0, 16).map(toUpgrade).filter((x): x is WritingUpgrade => !!x)
    : [];
  return { corrected, issues, upgrades };
}

function toIssue(raw: unknown): WritingIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type =
    r.type === "grammar" ||
    r.type === "spelling" ||
    r.type === "punctuation" ||
    r.type === "style"
      ? r.type
      : "grammar";
  const original = typeof r.original === "string" ? r.original : "";
  const suggestion = typeof r.suggestion === "string" ? r.suggestion : "";
  if (!original || !suggestion) return null;
  return {
    type,
    original: original.slice(0, 280),
    suggestion: suggestion.slice(0, 280),
    explanation:
      typeof r.explanation === "string" ? r.explanation.slice(0, 280) : "",
  };
}

function toUpgrade(raw: unknown): WritingUpgrade | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const original = typeof r.original === "string" ? r.original : "";
  const suggestion = typeof r.suggestion === "string" ? r.suggestion : "";
  if (!original || !suggestion) return null;
  return {
    original: original.slice(0, 120),
    suggestion: suggestion.slice(0, 120),
    why: typeof r.why === "string" ? r.why.slice(0, 280) : "",
  };
}
