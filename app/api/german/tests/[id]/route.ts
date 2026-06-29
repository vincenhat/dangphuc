import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_tests";

interface Row {
  id: string;
  topic: string;
  cefr: string;
  sections: string;
  answers: string | null;
  score: number | null;
  max_score: number;
  feedback: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const snap = await db().collection(COLLECTION).doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const row = snap.data() as Row;

  return NextResponse.json({
    id: row.id,
    topic: row.topic,
    cefr: row.cefr,
    test: safeJson(row.sections),
    answers: safeJson(row.answers),
    score: row.score ?? null,
    max_score: row.max_score,
    feedback: safeJson(row.feedback),
    status: row.status,
    created_at: row.created_at,
    submitted_at: row.submitted_at ?? null,
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db().collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}

function safeJson(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
