import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_tests";

interface Row {
  id: string;
  topic: string;
  cefr: string;
  score: number | null;
  max_score: number;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

export async function GET() {
  const snap = await db()
    .collection(COLLECTION)
    .orderBy("created_at", "desc")
    .limit(50)
    .get();
  const rows = snap.docs.map((d) => {
    const data = d.data() as Row;
    return {
      id: data.id,
      topic: data.topic,
      cefr: data.cefr,
      score: data.score ?? null,
      max_score: data.max_score,
      status: data.status,
      created_at: data.created_at,
      submitted_at: data.submitted_at ?? null,
    };
  });
  return NextResponse.json({ tests: rows });
}
