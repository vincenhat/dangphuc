import PageHeader from "@/components/PageHeader";
import { db, newId } from "@/lib/firestore";
import { nowIso, todayIso } from "@/lib/format";
import { SEED_CARDS, type SeedCard } from "@/lib/study-seed";
import { type StudyCard, type WritingEntry, pickDailyReview } from "@/lib/study";
import StudyClient from "./StudyClient";

export const dynamic = "force-dynamic";

/**
 * Seed any missing starter words into Firestore.
 *
 * Strategy: fetch every existing card's `word`, diff against SEED_CARDS, then
 * write the missing ones in batches of 400 (Firestore's hard limit per batch
 * is 500 ops). The seed list has ~600 items, so the very first visit splits
 * across two batches.
 */
async function backfillSeed(): Promise<void> {
  const existingSnap = await db().collection("study_cards").select("word").get();
  const have = new Set<string>();
  existingSnap.forEach((doc) => {
    const data = doc.data() as { word?: string };
    if (typeof data.word === "string") have.add(data.word.toLowerCase());
  });

  const missing: SeedCard[] = SEED_CARDS.filter(
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
      const ref = db().collection("study_cards").doc(id);
      batch.set(ref, {
        id,
        word: c.word,
        definition: c.definition,
        example: c.example,
        translation: c.translation,
        ipa: c.ipa,
        cefr: c.cefr,
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

export default async function StudyPage() {
  const today = todayIso();

  let allCards: StudyCard[] = [];
  let dueCards: StudyCard[] = [];
  let writing: WritingEntry[] = [];
  let error: string | null = null;

  try {
    await backfillSeed();

    // Pull everything for the deck list, the due slice for review, and
    // recent writing entries — in parallel.
    const [allSnap, dueSnap, writingSnap] = await Promise.all([
      db()
        .collection("study_cards")
        .orderBy("due_date", "asc")
        .limit(2000)
        .get(),
      db()
        .collection("study_cards")
        .where("due_date", "<=", today)
        .orderBy("due_date", "asc")
        .get(),
      db()
        .collection("study_writing_entries")
        .orderBy("created_at", "desc")
        .limit(50)
        .get(),
    ]);

    allCards = allSnap.docs.map((d) => d.data() as StudyCard);
    const dueAll = dueSnap.docs.map((d) => d.data() as StudyCard);
    dueCards = pickDailyReview(dueAll, today);
    writing = writingSnap.docs.map((d) => d.data() as WritingEntry);
  } catch (err) {
    error = err instanceof Error ? err.message : "Database error";
  }

  return (
    <div>
      <PageHeader
        eyebrow="Study"
        title="Learn English, day by day"
        description="Vocabulary cards with spaced repetition, and AI-powered writing feedback. Built for ESL students."
      />
      <StudyClient
        initialCards={allCards}
        initialDue={dueCards}
        initialWriting={writing}
        today={today}
        initialError={error}
      />
    </div>
  );
}
