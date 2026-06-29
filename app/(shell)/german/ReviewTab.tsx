"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Grade,
  formatInterval,
} from "@/lib/study";
import type { GermanCard } from "@/lib/german";
import { speakWord } from "./speak";

const GRADE_BUTTONS: { grade: Grade; label: string; sub: string; bg: string }[] = [
  { grade: "again", label: "Lại", sub: "Nochmal", bg: "#ef4444" },
  { grade: "hard", label: "Khó", sub: "Schwer", bg: "#f59e0b" },
  { grade: "good", label: "Tốt", sub: "Gut", bg: "#16a34a" },
  { grade: "easy", label: "Dễ", sub: "Einfach", bg: "var(--accent)" },
];

/** Show "der/die/das + Wort" for nouns so memorising gender is forced. */
function frontLabel(card: GermanCard): string {
  if (card.pos === "noun" && card.article) {
    return `${card.article} ${card.word}`;
  }
  return card.word;
}

/** Format interval into a short Vietnamese label. */
function viInterval(days: number): string {
  if (days <= 0) return "hôm nay";
  if (days === 1) return "1 ngày";
  if (days < 30) return `${days} ngày`;
  const months = Math.round(days / 30);
  if (months === 1) return "1 tháng";
  if (months < 12) return `${months} tháng`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 năm" : `${years} năm`;
}

export default function ReviewTab({
  initial,
  today,
  onChanged,
  onError,
}: {
  initial: GermanCard[];
  today: string;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [queue, setQueue] = useState<GermanCard[]>(initial);
  const [revealed, setRevealed] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  // Re-seed when parent reloads.
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
        const res = await fetch("/api/german/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: card.id, grade }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          nextInterval?: number;
          error?: string;
        };
        if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại");
        setLastInterval(data.nextInterval ?? null);
        setQueue((prev) => prev.slice(1));
        setRevealed(false);
        setCompletedToday((n) => n + 1);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Lưu thất bại");
      }
    },
    [card, onError],
  );

  // Keyboard: Space/Enter to reveal then 1-4 to grade.
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
        <h3 className="text-lg font-semibold tracking-tight">Xong rồi · Geschafft</h3>
        <p className="mt-2 ink-muted">
          {completedToday > 0
            ? `Bạn đã ôn ${completedToday} thẻ hôm nay. Hẹn lại ngày mai nhé.`
            : "Chưa có thẻ nào đến hạn. Thêm thẻ ở tab Decks hoặc đợi đến mai."}
        </p>
        <button
          type="button"
          onClick={() => onChanged()}
          className="btn-ghost mt-4 text-xs"
        >
          Tải lại
        </button>
      </div>
    );
  }

  const front = frontLabel(card);
  const isNoun = card.pos === "noun";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <p className="text-sm ink-muted">
          {remaining} thẻ đến hạn · {completedToday} thẻ đã xong · {today}
        </p>
        {lastInterval !== null ? (
          <p className="text-xs ink-muted">
            Thẻ vừa rồi: gặp lại sau {viInterval(lastInterval)}.
          </p>
        ) : null}
      </div>

      {/* Front of the card: article + word for nouns, plain word otherwise */}
      <article className="surface p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-3xl font-semibold tracking-tight">{front}</h3>
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
          {card.pos ? (
            <span className="text-xs uppercase tracking-wider ink-muted">
              {posLabel(card.pos)}
            </span>
          ) : null}
          {card.ipa ? <p className="text-sm ink-muted">{card.ipa}</p> : null}
          <button
            type="button"
            onClick={() => speakWord(card.word)}
            className="btn-ghost ml-auto !px-2 text-xs"
            aria-label={`Phát âm ${card.word}`}
            title="Nghe phát âm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
              <path d="M19 6a8 8 0 0 1 0 12" />
            </svg>
          </button>
        </div>

        {/* Back of the card, fades in on reveal */}
        <div
          className={`mt-6 transition-opacity ${revealed ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!revealed}
        >
          {isNoun && card.plural ? (
            <p
              className="mb-3 text-base font-medium"
              style={{ color: "var(--accent-link)" }}
            >
              Plural · die {card.plural}
            </p>
          ) : null}

          {card.translation ? (
            <p
              className="text-base font-medium"
              style={{ color: "var(--accent-link)" }}
            >
              {card.translation}
            </p>
          ) : null}
          {card.definition ? (
            <p className="mt-2 text-base leading-relaxed">{card.definition}</p>
          ) : null}
          {card.example ? (
            <p
              className="mt-3 text-base italic"
              style={{ color: "var(--ink-muted)" }}
            >
              „{card.example}“
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
          Hiện đáp án · Phím Space
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map((g, i) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => handleGrade(g.grade)}
              className="flex flex-col items-center rounded-md px-3 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: g.bg }}
              title={g.sub}
            >
              <span className="block leading-tight">{g.label}</span>
              <span className="block text-[10px] opacity-90">{g.sub}</span>
              <span className="mt-1 block text-[10px] opacity-80">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function posLabel(pos: NonNullable<GermanCard["pos"]>): string {
  switch (pos) {
    case "noun":
      return "Substantiv";
    case "verb":
      return "Verb";
    case "adjective":
      return "Adjektiv";
    case "adverb":
      return "Adverb";
    default:
      return "";
  }
}
