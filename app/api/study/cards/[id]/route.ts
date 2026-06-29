import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";
import { nowIso } from "@/lib/format";
import { isValidCefr } from "@/lib/study";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "study_cards";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  if (typeof body.word === "string" && body.word.trim()) {
    update.word = body.word.trim().slice(0, 80);
  }
  if (typeof body.definition === "string") {
    update.definition = body.definition.slice(0, 1000);
  }
  if (typeof body.example === "string") {
    update.example = body.example.slice(0, 1000);
  }
  if (typeof body.translation === "string") {
    update.translation = body.translation.slice(0, 280);
  }
  if (typeof body.ipa === "string") {
    update.ipa = body.ipa.slice(0, 80);
  }
  if ("cefr" in body) {
    update.cefr = isValidCefr(body.cefr) ? body.cefr : null;
  }
  if ("tags" in body) {
    update.tags = body.tags ? String(body.tags).slice(0, 280) : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no changes" }, { status: 400 });
  }

  update.updated_at = nowIso();
  await db().collection(COLLECTION).doc(id).set(update, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db().collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}
