import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_readings";

/**
 * GET /api/study/readings?cefr=&category=&q=&limit=
 * Lists previously generated readings, newest first. The detail endpoint
 * returns the full body; here we only return list-friendly columns.
 */

interface Row {
  id: string;
  topic: string;
  cefr: string;
  category: string;
  title: string;
  summary: string | null;
  created_at: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cefr = url.searchParams.get("cefr")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  // Firestore queries with multiple `where` filters on different fields
  // typically don't need a composite index when combined with a single
  // `orderBy`. We start with the broadest query and narrow down server-side
  // so we never have to deploy custom indexes.
  let query = db()
    .collection(COLLECTION)
    .orderBy("created_at", "desc")
    .limit(Math.max(limit * 4, 100)); // generous slice for in-memory filtering

  if (cefr) query = query.where("cefr", "==", cefr);
  if (category) query = query.where("category", "==", category);

  const snap = await query.get();
  let rows = snap.docs.map((d) => {
    const data = d.data() as Row;
    return {
      id: data.id,
      topic: data.topic,
      cefr: data.cefr,
      category: data.category,
      title: data.title,
      summary: data.summary ?? null,
      created_at: data.created_at,
    };
  });

  if (q) {
    rows = rows.filter(
      (r) =>
        r.topic.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q),
    );
  }

  rows = rows.slice(0, limit);
  return NextResponse.json({ readings: rows });
}
