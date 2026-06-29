"use client";

/**
 * Spelling practice cho tiếng Đức.
 *
 * Người dùng nghe phát âm và đọc nghĩa, rồi gõ lại từ. Có 6 pool để chọn:
 * thẻ đã sai, hôm nay, hôm qua, mới thêm (14 ngày), đã ôn, tất cả.
 * Hệ thống random N thẻ; bản dịch tiếng Việt chỉ hiện sau khi Check.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GermanCard } from "@/lib/german";
import { usePersistentState } from "@/lib/use-persistent-state";
import { speakWord } from "./speak";

type Phase = "setup" | "practice" | "done";
type PoolKind = "missed" | "today" | "yesterday" | "recent" | "reviewed" | "all";

interface Result {
  card: GermanCard;
  typed: string;
  correct: boolean;
}

const RECENT_DAYS = 14;

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

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function SpellingTab({ cards }: { cards: GermanCard[] }) {
  const recentCutoffMs = Date.now() - RECENT_DAYS * 86_400_000;
  const todayKey = localDateKey(new Date());
  const yesterdayKey = localDateKey(new Date(Date.now() - 86_400_000));

  function cardLocalKey(c: GermanCard): string | null {
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

  const [missedIds, setMissedIds] = usePersistentState<string[]>(
    "pt_german_spelling_missed",
    [],
  );
  const missed = useMemo(() => {
    const set = new Set(missedIds);
    return cards.filter((c) => set.has(c.id));
  }, [cards, missedIds]);

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
    { value: "missed", label: "Đã sai", size: missed.length, hint: "Từ đã viết sai" },
    { value: "today", label: "Hôm nay", size: today.length, hint: "Thẻ thêm hôm nay" },
    { value: "yesterday", label: "Hôm qua", size: yesterday.length, hint: "Thẻ thêm hôm qua" },
    { value: "recent", label: "Mới thêm", size: recent.length, hint: `${RECENT_DAYS} ngày qua` },
    { value: "reviewed", label: "Đã ôn", size: reviewed.length, hint: "Thẻ đã ôn ít nhất 1 lần" },
    { value: "all", label: "Tất cả", size: cards.length, hint: "Mọi thẻ trong bộ" },
  ];

  const countOptions = useMemo(() => {
    const opts = [5, 10, 15, 20, 30].filter((n) => n < pool.length);
    return [...opts, pool.length].filter((n, i, a) => n > 0 && a.indexOf(n) === i);
  }, [pool.length]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(0);
  const [session, setSession] = useState<GermanCard[]>([]);
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

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!checked) check();
    else next();
  }

  // ---- Setup ----
  if (phase === "setup") {
    return (
      <div className="space-y-5">
        <section className="surface p-5">
          <h2 className="text-lg font-semibold tracking-tight">
            Đánh vần · Rechtschreibung
          </h2>
          <p className="mt-1 text-sm ink-muted">
            Nghe phát âm và đọc nghĩa, rồi gõ lại từ tiếng Đức. Hệ thống chọn
            ngẫu nhiên từ pool bên dưới.
          </p>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] ink-muted">
              Chọn pool luyện
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
              Chưa có thẻ nào để luyện
            </h3>
            <p className="mt-2 text-sm ink-muted">
              Thêm thẻ mới ở tab Decks, hoặc ôn vài thẻ trước để có thẻ trong
              pool &ldquo;Đã ôn&rdquo;.
            </p>
          </div>
        ) : (
          <section className="surface p-5">
            <p className="text-sm font-medium">Luyện bao nhiêu từ?</p>
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
                  {n === pool.length && n > 5 ? `Cả ${n}` : n}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---- Done ----
  if (phase === "done") {
    const correctCount = results.filter((r) => r.correct).length;
    const pct = results.length ? Math.round((correctCount / results.length) * 100) : 0;
    const wrong = results.filter((r) => !r.correct);
    return (
      <div className="space-y-5">
        <section className="surface p-8 text-center">
          <p className="text-xs uppercase tracking-[0.16em] ink-muted">Đã xong</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
            {correctCount}/{results.length}
          </p>
          <p className="mt-1 text-sm ink-muted">{pct}% đúng</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => start(count)} className="btn-primary text-sm">
              Luyện lại
            </button>
            {wrong.length ? (
              <button
                type="button"
                onClick={() => {
                  setSession(wrong.map((r) => r.card));
                  setIdx(0);
                  setInput("");
                  setChecked(false);
                  setResults([]);
                  setPhase("practice");
                }}
                className="btn-ghost text-sm"
                title="Luyện lại các từ vừa sai"
              >
                Ôn lại từ sai ({wrong.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPhase("setup")}
              className="btn-ghost text-sm"
            >
              Đổi số lượng
            </button>
          </div>
        </section>

        {wrong.length ? (
          <section className="surface p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              Từ cần xem lại ({wrong.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {wrong.map((r, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b hairline pb-2 last:border-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => speakWord(r.card.word)}
                    className="text-sm font-semibold tracking-tight hover:underline"
                    title="Nghe phát âm"
                  >
                    {r.card.pos === "noun" && r.card.article
                      ? `${r.card.article} ${r.card.word}`
                      : r.card.word}
                  </button>
                  {r.typed.trim() ? (
                    <span className="text-xs ink-muted">
                      bạn viết: <span className="line-through">{r.typed}</span>
                    </span>
                  ) : (
                    <span className="text-xs ink-muted">bỏ qua</span>
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
            Trọn vẹn — đúng tất cả các từ. 🎉
          </section>
        )}
      </div>
    );
  }

  // ---- Practice ----
  if (!card) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 text-sm ink-muted">
        <span>
          Từ {idx + 1} / {session.length}
        </span>
        <span className="tabular-nums">
          {results.filter((r) => r.correct).length} đúng
        </span>
      </div>

      <article className="surface p-8">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => speakWord(card.word)}
            className="flex h-16 w-16 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
            style={{ background: "var(--accent)" }}
            aria-label="Phát âm"
            title="Nghe lại"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
              <path d="M19 6a8 8 0 0 1 0 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-xs ink-muted">Nhấn để nghe lại</p>

        <div className="mt-5 space-y-2 text-center">
          {card.cefr ? (
            <span
              className="inline-block rounded-capsule px-2.5 py-0.5 text-xs"
              style={{ background: "rgba(236,72,153,0.12)", color: "var(--accent)" }}
            >
              {card.cefr}
            </span>
          ) : null}
          {card.pos === "noun" ? (
            <p className="text-xs uppercase tracking-wider ink-muted">
              Substantiv — hãy gõ KÈM mạo từ (der/die/das)
            </p>
          ) : null}
          {card.definition ? (
            <p className="text-sm leading-relaxed">{card.definition}</p>
          ) : null}
        </div>

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
            placeholder={card.pos === "noun" ? "der/die/das + Wort…" : "Gõ từ…"}
            className="input text-center text-lg"
            aria-label="Gõ từ bạn vừa nghe"
          />

          {checked && lastResult ? (
            <div className="mt-3 space-y-1 text-center">
              {lastResult.correct ? (
                <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                  ✓ Đúng rồi
                </p>
              ) : (
                <p className="text-sm">
                  <span className="font-semibold" style={{ color: "#ef4444" }}>
                    ✗ Chưa đúng ·{" "}
                  </span>
                  <span className="font-semibold tracking-tight">
                    {card.pos === "noun" && card.article
                      ? `${card.article} ${card.word}`
                      : card.word}
                  </span>
                </p>
              )}
              {card.translation ? (
                <p className="text-base font-medium" style={{ color: "var(--accent-link)" }}>
                  {card.translation}
                </p>
              ) : null}
              {card.example ? (
                <p className="mt-1 text-sm italic ink-muted">„{card.example}“</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {!checked ? (
        <button type="button" onClick={check} className="btn-primary w-full">
          Kiểm tra · Enter
        </button>
      ) : (
        <button type="button" onClick={next} className="btn-primary w-full">
          {idx + 1 >= session.length ? "Xem kết quả · Enter" : "Từ tiếp · Enter"}
        </button>
      )}
    </div>
  );
}
