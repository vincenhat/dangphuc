import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "study_readings";

interface Row {
  id: string;
  topic: string;
  cefr: string;
  category: string;
  title: string;
  body: string;
  summary: string | null;
  glossary: string | null;
  questions: string | null;
  created_at: string;
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
    category: row.category,
    title: row.title,
    body: row.body,
    summary: row.summary ?? "",
    glossary: safeJson(row.glossary) ?? [],
    questions: safeJson(row.questions) ?? [],
    created_at: row.created_at,
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
