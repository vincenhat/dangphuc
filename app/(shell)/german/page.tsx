import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/firestore";
import { todayIso } from "@/lib/format";
import { pickDailyReview } from "@/lib/study";
import type { WritingEntry } from "@/lib/study";
import type { GermanCard } from "@/lib/german";
import GermanClient from "./GermanClient";

export const dynamic = "force-dynamic";

/**
 * German learning page — parallel structure to /study but backed by separate
 * Firestore collections (`german_cards`, `german_writing_entries`,
 * `german_tests`, `german_readings`).
 *
 * No automatic seed: the German deck starts empty so the user adds words at
 * the pace they're learning. The AI fill in the Decks tab makes that fast.
 */
export default async function GermanPage() {
  const today = todayIso();

  let allCards: GermanCard[] = [];
  let dueCards: GermanCard[] = [];
  let writing: WritingEntry[] = [];
  let error: string | null = null;

  try {
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
