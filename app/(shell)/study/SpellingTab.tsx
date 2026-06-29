"use client";

/**
 * Spelling practice.
 *
 * The user listens to a word's pronunciation and reads its English meaning,
 * then types the spelling. They pick the practice pool — Recently added
 * (default), Reviewed, or All cards — and how many words. The system picks
 * that many at random. Vietnamese meaning is revealed only after Check.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudyCard } from "@/lib/study";
import { usePersistentState } from "@/lib/use-persistent-state";
import { speakWord } from "./speak";

type Phase = "setup" | "practice" | "done";

interface Result {
  card: StudyCard;
  typed: string;
  correct: boolean;
}

/** Normalize for a forgiving comparison (case + surrounding/!inner whitespace). */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SpellingTab({ cards }: { cards: StudyCard[] }) {
  // Pool source — six modes the user can switch between:
  //  • missed: cards spelled wrong in past sessions (persistent across sessions)
  //  • today: cards added today (drills brand-new vocabulary)
  //  • yesterday: cards added yesterday
  //  • recent: cards added in the last 14 days
  //  • reviewed: cards reviewed at least once (reinforces active learning)
  //  • all: everything in the deck
  type PoolKind = "missed" | "today" | "yesterday" | "recent" | "reviewed" | "all";

  const RECENT_DAYS = 14;
  const recentCutoffMs =
    Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;

  // Local-day comparison: returns the YYYY-MM-DD of a date in the user's
  // local timezone. created_at is ISO UTC, so we let the Date constructor
  // convert it for the user's view of "today" / "yesterday".
  function localDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  const todayKey = localDateKey(new Date());
  const yesterdayKey = localDateKey(new Date(Date.now() - 86_400_000));

  function cardLocalKey(c: StudyCard): string | null {
    const t = Date.parse(c.created_at);
    return Number.isFinite(t) ? localDateKey(new Date(t)) : null;
  }

  const today = useMemo(
    () => cards.filter((c) => cardLocalKey(c) === todayKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, todayKey],
  );
  const yesterday = useMemo(
    () => cards.filter((c) => cardLocalKey(c) === yesterdayKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, yesterdayKey],
  );
  const reviewed = useMemo(
    () => cards.filter((c) => c.last_reviewed),
    [cards],
  );
  const recent = useMemo(
    () =>
      cards
        .filter((c) => {
          const t = Date.parse(c.created_at);
          return Number.isFinite(t) && t >= recentCutoffMs;
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [cards, recentCutoffMs],
  );

  // Missed words persist across sessions: a card lands here whenever the user
  // spells it wrong; it's removed when they later spell it right (anywhere).
  const [missedIds, setMissedIds] = usePersistentState<string[]>(
    "pt_spelling_missed",
    [],
  );
  const missed = useMemo(() => {
    const set = new Set(missedIds);
    return cards.filter((c) => set.has(c.id));
  }, [cards, missedIds]);

  // Default: smallest non-empty pool that's "freshest" — missed > today >
  // yesterday > recent > reviewed > all. Surfacing missed words first nudges
  // the user to fix their gaps before drilling new content.
  const [poolKind, setPoolKind] = useState<PoolKind>(() => {
    if (missed.length) return "missed";
    if (today.length) return "today";
    if (yesterday.length) return "yesterday";
    if (recent.length) return "recent";
    if (reviewed.length) return "reviewed";
    return "all";
  });

  const pool =
    poolKind === "missed"
      ? missed
      : poolKind === "today"
        ? today
        : poolKind === "yesterday"
          ? yesterday
          : poolKind === "reviewed"
            ? reviewed
            : poolKind === "recent"
              ? recent
              : cards;

  const POOL_OPTIONS: { value: PoolKind; label: string; size: number; hint: string }[] = [
    {
      value: "missed",
      label: "Đã sai",
      size: missed.length,
      hint: "Ôn lại từ đã viết sai",
    },
    {
      value: "today",
      label: "Today",
      size: today.length,
      hint: "Added today",
    },
    {
      value: "yesterday",
      label: "Yesterday",
      size: yesterday.length,
      hint: "Added yesterday",
    },
    {
      value: "recent",
      label: "Recently added",
      size: recent.length,
      hint: `Last ${RECENT_DAYS} days`,
    },
    {
      value: "reviewed",
      label: "Reviewed",
      size: reviewed.length,
      hint: "At least one review",
    },
    {
      value: "all",
      label: "All cards",
      size: cards.length,
      hint: "Everything in your deck",
    },
  ];

  const countOptions = useMemo(() => {
    const opts = [5, 10, 15, 20, 30].filter((n) => n < pool.length);
    return [...opts, pool.length].filter((n, i, a) => n > 0 && a.indexOf(n) === i);
  }, [pool.length]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(0);
  const [session, setSession] = useState<StudyCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = session[idx] ?? null;
  const lastResult = checked ? results[results.length - 1] ?? null : null;

  function start(n: number) {
    const picked = shuffle(pool).slice(0, n);
    setSession(picked);
    setIdx(0);
    setInput("");
    setChecked(false);
    setResults([]);
    setPhase("practice");
  }

  // Speak the current word + focus the box whenever a new word appears.
  useEffect(() => {
    if (phase !== "practice" || !card) return;
    speakWord(card.word);
    inputRef.current?.focus();
  }, [phase, idx, card]);

  const check = useCallback(() => {
    if (!card || checked) return;
    const correct = normalize(input) === normalize(card.word);
    setResults((prev) => [...prev, { card, typed: input, correct }]);
    setChecked(true);
    // Persist for the cross-session "Đã sai" pool: track misses, clear on hits.
    setMissedIds((prev) => {
      if (correct) {
        return prev.includes(card.id) ? prev.filter((id) => id !== card.id) : prev;
      }
      return prev.includes(card.id) ? prev : [...prev, card.id];
    });
  }, [card, checked, input, setMissedIds]);

  const next = useCallback(() => {
    if (idx + 1 >= session.length) {
      setPhase("done");
      return;
    }
    setIdx((i) => i + 1);
    setInput("");
    setChecked(false);
  }, [idx, session.length]);

  // Enter checks, then Enter again advances.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!checked) check();
    else next();
  }

  // ---- Setup screen ----
  if (phase === "setup") {
    return (
      <div className="space-y-5">
        <section className="surface p-5">
          <h2 className="text-lg font-semibold tracking-tight">Spelling practice</h2>
          <p className="mt-1 text-sm ink-muted">
            Listen to each word and read its meaning, then type the spelling.
            Words are picked at random from the pool you choose below.
          </p>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] ink-muted">
              Practice from
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {POOL_OPTIONS.map((opt) => {
                const active = poolKind === opt.value;
                const empty = opt.size === 0;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !empty && setPoolKind(opt.value)}
                    disabled={empty}
                    className="flex flex-col items-start rounded-md border hairline p-3 text-left transition-colors"
                    style={{
                      background: active
                        ? "var(--accent)"
                        : empty
                          ? "var(--canvas-soft)"
                          : "var(--canvas)",
                      color: active ? "#fff" : empty ? "var(--ink-muted)" : "var(--ink)",
                      cursor: empty ? "not-allowed" : "pointer",
                      opacity: empty ? 0.6 : 1,
                    }}
                  >
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs tabular-nums">{opt.size}</span>
                    </span>
                    <span
                      className="text-[11px]"
                      style={{
                        color: active ? "rgba(255,255,255,0.85)" : "var(--ink-muted)",
                      }}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {pool.length === 0 ? (
          <div className="surface p-10 text-center">
            <h3 className="text-base font-semibold tracking-tight">
              No words to practice yet
            </h3>
            <p className="mt-2 text-sm ink-muted">
              Add new cards in Decks, or review some cards first to populate
              the &ldquo;Reviewed&rdquo; pool.
            </p>
          </div>
        ) : (
          <section className="surface p-5">
            <p className="text-sm font-medium">How many words?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {countOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setCount(n);
                    start(n);
                  }}
                  className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: count === n ? "var(--accent)" : "var(--canvas-soft)",
                    color: count === n ? "#fff" : "var(--ink)",
                  }}
                >
                  {n === pool.length && n > 5 ? `All ${n}` : n}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---- Done screen ----
  if (phase === "done") {
    const correctCount = results.filter((r) => r.correct).length;
    const pct = results.length ? Math.round((correctCount / results.length) * 100) : 0;
    const missed = results.filter((r) => !r.correct);
    return (
      <div className="space-y-5">
        <section className="surface p-8 text-center">
          <p className="text-xs uppercase tracking-[0.16em] ink-muted">Session complete</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
            {correctCount}/{results.length}
          </p>
          <p className="mt-1 text-sm ink-muted">{pct}% correct</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => start(count)} className="btn-primary text-sm">
              Practice again
            </button>
            {missed.length ? (
              <button
                type="button"
                onClick={() => {
                  // Quick path: drill the words missed in THIS session, in order.
                  const cardsToDrill = missed.map((r) => r.card);
                  setSession(cardsToDrill);
                  setIdx(0);
                  setInput("");
                  setChecked(false);
                  setResults([]);
                  setPhase("practice");
                }}
                className="btn-ghost text-sm"
                title="Luyện lại các từ vừa sai"
              >
                Practice missed ({missed.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPhase("setup")}
              className="btn-ghost text-sm"
            >
              Change count
            </button>
          </div>
        </section>

        {missed.length ? (
          <section className="surface p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              Words to revisit ({missed.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {missed.map((r, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b hairline pb-2 last:border-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => speakWord(r.card.word)}
                    className="text-sm font-semibold tracking-tight hover:underline"
                    title="Listen"
                  >
                    {r.card.word}
                  </button>
                  {r.typed.trim() ? (
                    <span className="text-xs ink-muted">
                      you typed: <span className="line-through">{r.typed}</span>
                    </span>
                  ) : (
                    <span className="text-xs ink-muted">skipped</span>
                  )}
                  {r.card.translation ? (
                    <span className="text-xs" style={{ color: "var(--accent-link)" }}>
                      {r.card.translation}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="surface p-6 text-center text-sm ink-muted">
            Perfect score — every word spelled correctly. 🎉
          </section>
        )}
      </div>
    );
  }

  // ---- Practice screen ----
  if (!card) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 text-sm ink-muted">
        <span>
          Word {idx + 1} of {session.length}
        </span>
        <span className="tabular-nums">
          {results.filter((r) => r.correct).length} correct
        </span>
      </div>

      <article className="surface p-8">
        {/* Listen control */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => speakWord(card.word)}
            className="flex h-16 w-16 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
            style={{ background: "var(--accent)" }}
            aria-label="Play pronunciation"
            title="Listen again"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
              <path d="M19 6a8 8 0 0 1 0 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-xs ink-muted">Tap to hear it again</p>

        {/* Before checking: English definition as the hint (level + meaning
            in English). The Vietnamese meaning is revealed only on Check. */}
        <div className="mt-5 space-y-2 text-center">
          {card.cefr ? (
            <span
              className="inline-block rounded-capsule px-2.5 py-0.5 text-xs"
              style={{ background: "rgba(236,72,153,0.12)", color: "var(--accent)" }}
            >
              {card.cefr}
            </span>
          ) : null}
          {card.definition ? (
            <p className="text-sm leading-relaxed">{card.definition}</p>
          ) : null}
        </div>

        {/* Input */}
        <div className="mt-6">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={checked}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type the word…"
            className="input text-center text-lg"
            aria-label="Type the word you hear"
          />

          {checked && lastResult ? (
            <div className="mt-3 space-y-1 text-center">
              {lastResult.correct ? (
                <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                  ✓ Correct
                </p>
              ) : (
                <p className="text-sm">
                  <span className="font-semibold" style={{ color: "#ef4444" }}>
                    ✗ Not quite ·{" "}
                  </span>
                  <span className="font-semibold tracking-tight">{card.word}</span>
                </p>
              )}
              {/* Vietnamese meaning revealed only after Check */}
              {card.translation ? (
                <p className="text-base font-medium" style={{ color: "var(--accent-link)" }}>
                  {card.translation}
                </p>
              ) : null}
              {card.example ? (
                <p className="mt-1 text-sm italic ink-muted">“{card.example}”</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {!checked ? (
        <button type="button" onClick={check} className="btn-primary w-full">
          Check · Enter
        </button>
      ) : (
        <button type="button" onClick={next} className="btn-primary w-full">
          {idx + 1 >= session.length ? "See results · Enter" : "Next word · Enter"}
        </button>
      )}
    </div>
  );
}
