import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";
import { nowIso } from "@/lib/format";
import { generateText } from "@/lib/gemini";
import {
  type AnswerMap,
  type SectionFeedback,
  type TestFeedback,
  type TestStructure,
  SECTION_WEIGHT,
  countWords,
  gradeMcq,
} from "@/lib/study-test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "study_tests";

interface Row {
  id: string;
  sections: string;
  status: string;
  max_score: number;
}

const WRITING_SYSTEM = [
  "You are an ESL examiner. Grade a student's short writing response.",
  "Return ONLY a JSON object with this shape:",
  '{ "score": number (0-5, integer or .5 step), "notes": string (2-4 sentences of overall feedback), ',
  '  "issues": [ { "type": "grammar"|"spelling"|"punctuation"|"style", "original": string, "suggestion": string } ] }',
  "Cap issues at 6 entries. Be encouraging but specific.",
  "Score guidance:",
  " 5 = on-topic, level-appropriate, near error-free.",
  " 4 = on-topic, mostly correct, minor errors.",
  " 3 = generally on-topic with several errors that don't block meaning.",
  " 2 = partially on-topic or many errors.",
  " 1 = barely on-topic or very low quality.",
  " 0 = empty or unrelated.",
].join(" ");

interface WritingGrade {
  score: number;
  notes: string;
  issues: { type: string; original: string; suggestion: string }[];
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const ref = db().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "not found" }, { status: 404 });

  const row = snap.data() as Row;
  if (row.status === "submitted") {
    return NextResponse.json({ error: "already submitted" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { answers?: unknown; model?: unknown };
  const answers = (body.answers ?? {}) as AnswerMap;
  const model = typeof body.model === "string" ? body.model : undefined;

  let test: TestStructure;
  try {
    test = JSON.parse(row.sections) as TestStructure;
  } catch {
    return NextResponse.json({ error: "test corrupted" }, { status: 500 });
  }

  // 1. Auto-grade the MCQ sections.
  const sectionFeedback: SectionFeedback[] = gradeMcq(test, answers);

  // 2. Send the writing answer (if any) through the AI for grading.
  const writingSection = test.sections.find((s) => s.kind === "writing");
  if (writingSection && writingSection.kind === "writing") {
    const writingAnswerKey = "w1"; // single writing item by convention
    const writingText =
      typeof answers[writingAnswerKey] === "string"
        ? (answers[writingAnswerKey] as string).trim()
        : "";

    let grade: WritingGrade = {
      score: 0,
      notes: "No writing submitted.",
      issues: [],
    };

    if (writingText) {
      try {
        const wordCount = countWords(writingText);
        const userPrompt = [
          `CEFR level: ${test.cefr}`,
          `Prompt: ${writingSection.prompt}`,
          `Target word count: ${writingSection.minWords}-${writingSection.maxWords}`,
          `Word count submitted: ${wordCount}`,
          "",
          "Student response:",
          writingText,
        ].join("\n");
        const raw = await generateText(userPrompt, WRITING_SYSTEM, model);
        grade = parseWritingGrade(raw);
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI failed";
        // Don't fail the whole submit — store the placeholder and surface the
        // error in the feedback summary instead.
        grade = {
          score: 0,
          notes: `Writing could not be auto-graded: ${message}`,
          issues: [],
        };
      }
    }

    const idx = sectionFeedback.findIndex((s) => s.kind === "writing");
    if (idx >= 0) {
      sectionFeedback[idx] = {
        kind: "writing",
        scored: Math.round(grade.score),
        total: SECTION_WEIGHT.writing,
        writingScore: grade.score,
        writingNotes: grade.notes,
        writingIssues: grade.issues,
      };
    }
  }

  const total = sectionFeedback.reduce((sum, s) => sum + s.scored, 0);
  const summary = buildSummary(sectionFeedback, total, row.max_score);

  const feedback: TestFeedback = {
    sections: sectionFeedback,
    total,
    max: row.max_score,
    summary,
  };

  await ref.set(
    {
      answers: JSON.stringify(answers),
      score: total,
      feedback: JSON.stringify(feedback),
      status: "submitted",
      submitted_at: nowIso(),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, feedback });
}

function parseWritingGrade(raw: string): WritingGrade {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("non-JSON writing grade");
    json = JSON.parse(m[0]);
  }
  let score = Number(json.score ?? 0);
  if (!Number.isFinite(score) || score < 0) score = 0;
  if (score > SECTION_WEIGHT.writing) score = SECTION_WEIGHT.writing;
  const notes = typeof json.notes === "string" ? json.notes.slice(0, 1200) : "";
  const issues = Array.isArray(json.issues)
    ? json.issues
        .slice(0, 8)
        .map((it) => {
          if (!it || typeof it !== "object") return null;
          const r = it as Record<string, unknown>;
          const type =
            r.type === "grammar" ||
            r.type === "spelling" ||
            r.type === "punctuation" ||
            r.type === "style"
              ? r.type
              : "grammar";
          const original = typeof r.original === "string" ? r.original.slice(0, 200) : "";
          const suggestion = typeof r.suggestion === "string" ? r.suggestion.slice(0, 200) : "";
          if (!original || !suggestion) return null;
          return { type, original, suggestion };
        })
        .filter((x): x is { type: string; original: string; suggestion: string } => !!x)
    : [];
  return { score, notes, issues };
}

function buildSummary(
  feedback: SectionFeedback[],
  total: number,
  max: number,
): string {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  const parts = feedback.map((s) => {
    const label = s.kind.charAt(0).toUpperCase() + s.kind.slice(1);
    return `${label} ${s.scored}/${s.total}`;
  });
  return `${total}/${max} (${pct}%) — ${parts.join(" · ")}`;
}
