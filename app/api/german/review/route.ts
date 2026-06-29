import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";
import { nowIso, todayIso } from "@/lib/format";
import { applyGrade, isValidGrade, shiftDateIso } from "@/lib/study";
import type { GermanCard } from "@/lib/german";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "german_cards";

/**
 * POST /api/german/review
 * Same SM-2 update as /api/study/review, but for the German deck.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const grade = body.grade;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!isValidGrade(grade)) {
    return NextResponse.json({ error: "invalid grade" }, { status: 400 });
  }

  const ref = db().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const card = snap.data() as GermanCard;

  const next = applyGrade(
    {
      ease_factor: card.ease_factor,
      repetitions: card.repetitions,
      interval_days: card.interval_days,
    },
    grade,
  );

  const today = todayIso();
  const dueDate = shiftDateIso(today, next.interval_days);
  const now = nowIso();

  await ref.set(
    {
      ease_factor: next.ease_factor,
      repetitions: next.repetitions,
      interval_days: next.interval_days,
      due_date: dueDate,
      last_reviewed: now,
      updated_at: now,
    },
    { merge: true },
  );

  return NextResponse.json({
    ok: true,
    nextInterval: next.interval_days,
    dueDate,
  });
}
