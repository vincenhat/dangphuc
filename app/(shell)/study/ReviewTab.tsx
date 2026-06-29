"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Grade,
  type StudyCard,
  formatInterval,
} from "@/lib/study";
import { speakWord } from "./speak";

const GRADE_BUTTONS: { grade: Grade; label: string; bg: string }[] = [
  { grade: "again", label: "Again", bg: "#ef4444" },
  { grade: "hard", label: "Hard", bg: "#f59e0b" },
  { grade: "good", label: "Good", bg: "#16a34a" },
  { grade: "easy", label: "Easy", bg: "var(--accent)" },
];

export default function ReviewTab({
  initial,
  today,
  onChanged,
  onError,
}: {
  initial: StudyCard[];
  today: string;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [queue, setQueue] = useState<StudyCard[]>(initial);
  const [revealed, setRevealed] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  // If the prop changes (parent reloaded), re-seed the queue.
  useEffect(() => {
    setQueue(initial);
    setRevealed(false);
    setCompletedToday(0);
    setLastInterval(null);
  }, [initial]);

  const card = queue[0] ?? null;
  const remaining = queue.length;

  const handleGrade = useMemo(
    () => async (grade: Grade) => {
      if (!card) return;
      try {
        const res = await fetch("/api/study/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: card.id, grade }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          nextInterval?: number;
          error?: string;
        };
        if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
        setLastInterval(data.nextInterval ?? null);
        setQueue((prev) => prev.slice(1));
        setRevealed(false);
        setCompletedToday((n) => n + 1);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [card, onError],
  );

  // Keyboard: Space = reveal/next, 1..4 = grade
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (revealed) {
        if (e.key === "1") handleGrade("again");
        else if (e.key === "2") handleGrade("hard");
        else if (e.key === "3") handleGrade("good");
        else if (e.key === "4") handleGrade("easy");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, handleGrade]);

  if (!card) {
    return (
      <div className="surface p-10 text-center">
        <h3 className="text-lg font-semibold tracking-tight">All caught up</h3>
        <p className="mt-2 ink-muted">
          {completedToday > 0
            ? `You reviewed ${completedToday} card${completedToday === 1 ? "" : "s"} today. Come back tomorrow.`
            : "No cards are due. Add new ones from the Decks tab, or wait for tomorrow."}
        </p>
        <button
          type="button"
          onClick={() => onChanged()}
          className="btn-ghost mt-4 text-xs"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <p className="text-sm ink-muted">
          {remaining} due · {completedToday} done today · {today}
        </p>
        {lastInterval !== null ? (
          <p className="text-xs ink-muted">
            Last card scheduled in {formatInterval(lastInterval)}.
          </p>
        ) : null}
      </div>

      <article className="surface p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-3xl font-semibold tracking-tight">{card.word}</h3>
          {card.cefr ? (
            <span
              className="rounded-capsule px-2.5 py-0.5 text-xs"
              style={{
                background: "rgba(236,72,153,0.12)",
                color: "var(--accent)",
              }}
            >
              {card.cefr}
            </span>
          ) : null}
          {card.ipa ? <p className="text-sm ink-muted">{card.ipa}</p> : null}
          <button
            type="button"
            onClick={() => speakWord(card.word)}
            className="btn-ghost ml-auto !px-2 text-xs"
            aria-label={`Pronounce ${card.word}`}
            title="Listen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
              <path d="M19 6a8 8 0 0 1 0 12" />
            </svg>
          </button>
        </div>

        <div
          className={`mt-6 transition-opacity ${revealed ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!revealed}
        >
          {card.definition ? (
            <p className="text-base leading-relaxed">{card.definition}</p>
          ) : null}
          {card.example ? (
            <p
              className="mt-3 text-base italic"
              style={{ color: "var(--ink-muted)" }}
            >
              “{card.example}”
            </p>
          ) : null}
          {card.translation ? (
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--accent-link)" }}
            >
              VI · {card.translation}
            </p>
          ) : null}
          {card.tags ? (
            <p className="mt-3 text-xs ink-muted">{card.tags}</p>
          ) : null}
        </div>
      </article>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="btn-primary w-full"
        >
          Show answer · Space
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map((g, i) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => handleGrade(g.grade)}
              className="rounded-md px-3 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: g.bg }}
            >
              <span className="block">{g.label}</span>
              <span className="block text-[10px] opacity-80">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
