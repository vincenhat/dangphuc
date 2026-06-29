import PageHeader from "@/components/PageHeader";
import { db, newId } from "@/lib/firestore";
import { nowIso, todayIso } from "@/lib/format";
import { pickDailyReview } from "@/lib/study";
import type { WritingEntry } from "@/lib/study";
import type { GermanCard } from "@/lib/german";
import { GERMAN_SEED_CARDS, type GermanSeedCard } from "@/lib/german-seed";
import GermanClient from "./GermanClient";

export const dynamic = "force-dynamic";

/**
 * Seed any missing starter words into Firestore.
 *
 * Strategy: fetch every existing card's `word`, diff against the seed list,
 * then write the missing ones in batches of 400 (Firestore's hard batch limit
 * is 500 ops). The seed list has 500+ items, so the very first visit splits
 * across two batches; subsequent visits do a single read with zero writes.
 */
async function backfillSeed(): Promise<void> {
  const existingSnap = await db().collection("german_cards").select("word").get();
  const have = new Set<string>();
  existingSnap.forEach((doc) => {
    const data = doc.data() as { word?: string };
    if (typeof data.word === "string") have.add(data.word.toLowerCase());
  });

  const missing: GermanSeedCard[] = GERMAN_SEED_CARDS.filter(
    (c) => !have.has(c.word.toLowerCase()),
  );
  if (missing.length === 0) return;

  const today = todayIso();
  const now = nowIso();
  const BATCH = 400;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = db().batch();
    for (const c of missing.slice(i, i + BATCH)) {
      const id = newId();
      const ref = db().collection("german_cards").doc(id);
      batch.set(ref, {
        id,
        word: c.word,
        definition: c.definition,
        example: c.example,
        translation: c.translation,
        ipa: c.ipa,
        cefr: c.cefr,
        pos: c.pos,
        article: c.article,
        plural: c.plural,
        tags: c.tags,
        ease_factor: 2.5,
        repetitions: 0,
        interval_days: 0,
        due_date: today,
        last_reviewed: null,
        created_at: now,
        updated_at: now,
      });
    }
    await batch.commit();
  }
}

export default async function GermanPage() {
  const today = todayIso();

  let allCards: GermanCard[] = [];
  let dueCards: GermanCard[] = [];
  let writing: WritingEntry[] = [];
  let error: string | null = null;

  try {
    await backfillSeed();

    const [allSnap, dueSnap, writingSnap] = await Promise.all([
      db()
        .collection("german_cards")
        .orderBy("due_date", "asc")
        .limit(2000)
        .get(),
      db()
        .collection("german_cards")
        .where("due_date", "<=", today)
        .orderBy("due_date", "asc")
        .get(),
      db()
        .collection("german_writing_entries")
        .orderBy("created_at", "desc")
        .limit(50)
        .get(),
    ]);

    allCards = allSnap.docs.map((d) => d.data() as GermanCard);
    const dueAll = dueSnap.docs.map((d) => d.data() as GermanCard);
    dueCards = pickDailyReview(dueAll, today);
    writing = writingSnap.docs.map((d) => d.data() as WritingEntry);
  } catch (err) {
    error = err instanceof Error ? err.message : "Database error";
  }

  return (
    <div>
      <PageHeader
        eyebrow="Deutsch"
        title="Học tiếng Đức từng ngày"
        description="Từ vựng với spaced repetition, ngữ pháp Đức, đọc-viết, đề thi CEFR — cùng cấu trúc với Study nhưng cho tiếng Đức."
      />
      <GermanClient
        initialCards={allCards}
        initialDue={dueCards}
        initialWriting={writing}
        today={today}
        initialError={error}
      />
    </div>
  );
}
