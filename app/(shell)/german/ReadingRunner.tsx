"use client";

/**
 * Reading runner.
 *
 * - Renders the passage with the same Highlightable used by the practice
 *   test, so users can highlight and save vocabulary while reading.
 * - Glossary card shows the AI-suggested key vocabulary; each word has a
 *   one-tap "Save card" that POSTs to /api/german/cards.
 * - Self-check questions are revealed on demand. Answers are kept entirely
 *   client-side (no DB writes) — this is for practice, not graded testing.
 */

import { useEffect, useMemo, useState } from "react";
import type { Reading, ReadingMCQ } from "@/lib/study-reading";
import type { CefrLevel } from "@/lib/study";
import { speakWord } from "./speak";
import Highlightable, { type HighlightRange } from "./Highlightable";
import QuickWordSave from "./QuickWordSave";

type AnswerMap = Record<string, number>;

interface SaveTarget {
  word: string;
  sentence: string;
  // Pre-fill hints for glossary saves (we already have a translation/meaning).
  meaning?: string;
  translation?: string;
}

export default function ReadingRunner({
  id,
  reading,
  onClose,
  onError,
}: {
  id: string;
  reading: Reading;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const storageKey = `pt_german_reading_hl_${id}`;
  const answersKey = `pt_german_reading_ans_${id}`;

  const [highlights, setHighlights] = useState<HighlightRange[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [revealed, setRevealed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Hydrate
  useEffect(() => {
    try {
      const h = localStorage.getItem(storageKey);
      if (h) {
        const parsed = JSON.parse(h) as HighlightRange[];
        if (Array.isArray(parsed)) setHighlights(parsed);
      }
      const a = localStorage.getItem(answersKey);
      if (a) {
        const parsed = JSON.parse(a) as AnswerMap;
        if (parsed && typeof parsed === "object") setAnswers(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey, answersKey]);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(highlights));
    } catch {
      /* ignore */
    }
  }, [highlights, hydrated, storageKey]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, hydrated, answersKey]);

  // Auto-dismiss the saved-toast pill.
  useEffect(() => {
    if (!savedToast) return;
    const t = window.setTimeout(() => setSavedToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [savedToast]);

  function setAnswer(qid: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  }

  const score = useMemo(() => {
    if (!revealed) return 0;
    let n = 0;
    for (const q of reading.questions) {
      if (answers[q.id] === q.answer) n += 1;
    }
    return n;
  }, [answers, reading.questions, revealed]);

  const wordCount = reading.body.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] ink-muted">
            {reading.cefr} · {reading.category}
            {reading.topic ? ` · ${reading.topic}` : ""}
          </p>
          <p className="text-sm font-semibold tracking-tight">{reading.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs ink-muted">{wordCount} words</span>
          {highlights.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear all highlights?")) setHighlights([]);
              }}
              className="btn-ghost text-xs"
            >
              Clear highlights
            </button>
          ) : null}
          <button onClick={onClose} className="btn-ghost text-xs">
            Back to list
          </button>
        </div>
      </div>

      {reading.summary ? (
        <div
          className="surface p-3 text-sm italic"
          style={{ background: "var(--canvas-soft)", color: "var(--ink-muted)" }}
        >
          {reading.summary}
        </div>
      ) : null}

      {savedToast ? (
        <div
          className="surface fixed bottom-4 right-4 z-40 px-4 py-2 text-sm shadow-lift"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Saved “{savedToast}” to deck
        </div>
      ) : null}

      <article className="surface p-5">
        <Highlightable
          text={reading.body}
          highlights={highlights}
          onAddHighlight={(r) =>
            setHighlights((prev) => [...prev, r])
          }
          onRemoveHighlight={(i) =>
            setHighlights((prev) => prev.filter((_, idx) => idx !== i))
          }
          onSaveWord={(word, sentence) => setSaveTarget({ word, sentence })}
          preserveWhitespace
          className="text-base leading-relaxed"
        />
      </article>

      {/* Glossary */}
      {reading.glossary.length > 0 ? (
        <section className="surface p-5">
          <header className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Key vocabulary</h3>
            <p className="text-xs ink-muted">
              {reading.glossary.length} word{reading.glossary.length === 1 ? "" : "s"}
            </p>
          </header>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {reading.glossary.map((g) => (
              <li
                key={g.word}
                className="rounded-md border hairline p-3"
                style={{ background: "var(--canvas-soft)" }}
              >
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold">{g.word}</p>
                  <button
                    type="button"
                    onClick={() => speakWord(g.word)}
                    aria-label={`Pronounce ${g.word}`}
                    className="ink-muted hover:text-[var(--ink)]"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
                      <path d="M16 9a4 4 0 0 1 0 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSaveTarget({
                        word: g.word,
                        sentence: findSentenceFor(reading.body, g.word),
                        meaning: g.meaning,
                        translation: g.translation,
                      })
                    }
                    className="ml-auto text-xs"
                    style={{ color: "var(--accent-link)" }}
                  >
                    Save card
                  </button>
                </div>
                <p className="mt-1 text-sm">{g.meaning}</p>
                {g.translation ? (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--accent-link)" }}>
                    VI · {g.translation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Comprehension */}
      {reading.questions.length > 0 ? (
        <section className="surface p-5">
          <header className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight">
              Self-check
            </h3>
            <p className="text-xs ink-muted">
              {Object.keys(answers).length} / {reading.questions.length} answered
            </p>
          </header>
          <ol className="mt-3 space-y-4">
            {reading.questions.map((q, idx) => (
              <li key={q.id}>
                <ComprehensionItem
                  q={q}
                  index={idx}
                  picked={answers[q.id]}
                  revealed={revealed}
                  onPick={(i) => setAnswer(q.id, i)}
                />
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {revealed ? (
              <p className="text-sm">
                <span className="font-semibold">Score:</span> {score} /{" "}
                {reading.questions.length}
              </p>
            ) : (
              <p className="text-xs ink-muted">
                Answer the questions, then check your answers.
              </p>
            )}
            <div className="flex gap-2">
              {revealed ? (
                <button
                  type="button"
                  onClick={() => {
                    setRevealed(false);
                    setAnswers({});
                  }}
                  className="btn-ghost text-xs"
                >
                  Try again
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="btn-primary"
                disabled={Object.keys(answers).length === 0}
              >
                {revealed ? "Hide answers" : "Check answers"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {saveTarget ? (
        <QuickWordSave
          initialWord={saveTarget.word}
          initialExample={saveTarget.sentence}
          initialCefr={reading.cefr as CefrLevel}
          onClose={() => setSaveTarget(null)}
          onSaved={(w) => {
            setSavedToast(w);
            setSaveTarget(null);
          }}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

function ComprehensionItem({
  q,
  index,
  picked,
  revealed,
  onPick,
}: {
  q: ReadingMCQ;
  index: number;
  picked: number | undefined;
  revealed: boolean;
  onPick: (i: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">
        {index + 1}. {q.question}
      </p>
      <ul className="mt-2 space-y-1.5">
        {q.options.map((opt, i) => {
          const selected = picked === i;
          let style: React.CSSProperties = {
            background: "var(--canvas)",
            borderColor: "var(--border-soft)",
            color: "var(--ink)",
          };
          if (revealed) {
            if (i === q.answer) {
              style = {
                background: "rgba(22,163,74,0.10)",
                borderColor: "#16a34a",
                color: "var(--ink)",
              };
            } else if (selected) {
              style = {
                background: "rgba(239,68,68,0.10)",
                borderColor: "#ef4444",
                color: "var(--ink)",
              };
            }
          } else if (selected) {
            style = {
              background: "rgba(236,72,153,0.10)",
              borderColor: "var(--accent)",
              color: "var(--ink)",
            };
          }
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onPick(i)}
                disabled={revealed}
                className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default"
                style={style}
              >
                <span
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]"
                  style={{
                    borderColor: selected ? "var(--accent)" : "var(--border-soft)",
                    background: selected ? "var(--accent)" : "transparent",
                    color: selected ? "#fff" : "var(--ink-muted)",
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && q.explanation ? (
        <p className="mt-2 text-xs ink-muted">{q.explanation}</p>
      ) : null}
    </div>
  );
}

/** Find the first sentence in `body` that contains `word` (case-insensitive). */
function findSentenceFor(body: string, word: string): string {
  const sentences = body.split(/(?<=[.!?])\s+/);
  const w = word.toLowerCase();
  const hit = sentences.find((s) => s.toLowerCase().includes(w));
  return hit?.trim() ?? body.split(/[.!?]/)[0].trim();
}
