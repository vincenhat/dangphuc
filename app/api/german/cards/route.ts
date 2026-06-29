import { NextResponse } from "next/server";
import { db, newId } from "@/lib/firestore";
import { nowIso, todayIso } from "@/lib/format";
import { isValidCefr, pickDailyReview } from "@/lib/study";
import {
  type GermanCard,
  isValidArticle,
  isValidPos,
} from "@/lib/german";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_cards";

/**
 * GET /api/german/cards?due=1&q=&cefr=
 * Same shape and filters as /api/study/cards, but reads from `german_cards`.
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
  let rows = snap.docs.map((d) => ({ ...(d.data() as GermanCard) }));

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

  rows.sort(
    (a, b) =>
      a.due_date.localeCompare(b.due_date) ||
      a.created_at.localeCompare(b.created_at),
  );

  const final = dueOnly ? pickDailyReview(rows, todayIso()) : rows;
  return NextResponse.json({ cards: final, today: todayIso() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<GermanCard>;
  const word = (body.word ?? "").toString().trim();
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });

  const id = newId();
  const now = nowIso();
  const today = todayIso();

  const doc: GermanCard = {
    id,
    word: word.slice(0, 80),
    definition: body.definition ? String(body.definition).slice(0, 1000) : "",
    example: body.example ? String(body.example).slice(0, 1000) : "",
    translation: body.translation ? String(body.translation).slice(0, 280) : "",
    ipa: body.ipa ? String(body.ipa).slice(0, 80) : "",
    cefr: isValidCefr(body.cefr) ? body.cefr : null,
    pos: isValidPos(body.pos) ? body.pos : null,
    article: isValidArticle(body.article) ? body.article : null,
    plural: body.plural ? String(body.plural).slice(0, 120) : null,
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
