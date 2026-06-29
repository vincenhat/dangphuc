import { NextResponse } from "next/server";
import { db, newId } from "@/lib/firestore";
import { nowIso, todayIso } from "@/lib/format";
import { type StudyCard, isValidCefr, pickDailyReview } from "@/lib/study";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "study_cards";

/**
 * GET /api/study/cards?due=1&q=&cefr=
 * Lists vocabulary cards. We pull a generous slice from Firestore (ordered by
 * due_date) then narrow down with case-insensitive substring search and the
 * optional CEFR filter on the server. Final result is capped at 2000.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dueOnly = url.searchParams.get("due") === "1";
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const cefr = url.searchParams.get("cefr") ?? "";

  let query = db()
    .collection(COLLECTION)
    .orderBy("due_date", "asc")
    .limit(2000);

  if (dueOnly) {
    query = db()
      .collection(COLLECTION)
      .where("due_date", "<=", todayIso())
      .orderBy("due_date", "asc")
      .limit(2000);
  }

  const snap = await query.get();
  let rows = snap.docs.map((d) => ({ ...(d.data() as StudyCard) }));

  if (q) {
    rows = rows.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        (c.definition ?? "").toLowerCase().includes(q) ||
        (c.translation ?? "").toLowerCase().includes(q),
    );
  }
  if (cefr && isValidCefr(cefr)) {
    rows = rows.filter((c) => c.cefr === cefr);
  }

  // Secondary sort by created_at to match the legacy SQL ordering.
  rows.sort(
    (a, b) =>
      a.due_date.localeCompare(b.due_date) ||
      a.created_at.localeCompare(b.created_at),
  );

  const final = dueOnly ? pickDailyReview(rows, todayIso()) : rows;
  return NextResponse.json({ cards: final, today: todayIso() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<StudyCard>;
  const word = (body.word ?? "").toString().trim();
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });

  const cefr = isValidCefr(body.cefr) ? body.cefr : null;
  const id = newId();
  const now = nowIso();
  const today = todayIso();

  const doc: StudyCard = {
    id,
    word: word.slice(0, 80),
    definition: body.definition ? String(body.definition).slice(0, 1000) : "",
    example: body.example ? String(body.example).slice(0, 1000) : "",
    translation: body.translation ? String(body.translation).slice(0, 280) : "",
    ipa: body.ipa ? String(body.ipa).slice(0, 80) : "",
    cefr,
    tags: body.tags ? String(body.tags).slice(0, 280) : null,
    ease_factor: 2.5,
    repetitions: 0,
    interval_days: 0,
    due_date: today,
    last_reviewed: null,
    created_at: now,
    updated_at: now,
  };

  await db().collection(COLLECTION).doc(id).set(doc);
  return NextResponse.json({ id }, { status: 201 });
}
