"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AnswerMap,
  GrammarSection,
  MCQItem,
  ReadingSection,
  Section,
  SectionFeedback,
  TestFeedback,
  TestStructure,
  VocabSection,
  WritingSection,
} from "@/lib/study-test";
import { countWords } from "@/lib/study-test";
import type { CefrLevel } from "@/lib/study";
import Highlightable, { type HighlightRange } from "./Highlightable";
import QuickWordSave from "./QuickWordSave";

const ISSUE_TONE: Record<string, string> = {
  grammar: "#ef4444",
  spelling: "#f59e0b",
  punctuation: "#0ea5e9",
  style: "#a855f7",
};

/** Local storage of highlights, keyed by source path within the test. */
type HighlightMap = Record<string, HighlightRange[]>;

interface SaveTarget {
  word: string;
  sentence: string;
}

export default function TestRunner({
  id,
  test,
  savedAnswers,
  savedFeedback,
  savedStatus,
  model,
  onClose,
  onError,
  onAnswersChange,
  onSubmitted,
}: {
  id: string;
  test: TestStructure;
  savedAnswers: AnswerMap | null;
  savedFeedback: TestFeedback | null;
  savedStatus: "in_progress" | "submitted";
  model: string | null;
  onClose: () => void;
  onError: (msg: string) => void;
  onAnswersChange?: (answers: AnswerMap) => void;
  onSubmitted?: (feedback: TestFeedback) => void;
}) {
  const [answers, setAnswers] = useState<AnswerMap>(savedAnswers ?? {});
  const [feedback, setFeedback] = useState<TestFeedback | null>(savedFeedback);
  const [status, setStatus] = useState<"in_progress" | "submitted">(savedStatus);
  const [submitting, setSubmitting] = useState(false);

  // Highlights are kept in localStorage per test id so they survive tab
  // switches and reloads without needing a DB column.
  const storageKey = `pt_german_test_hl_${id}`;
  const [highlights, setHighlights] = useState<HighlightMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Hydrate highlights from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as HighlightMap;
        if (parsed && typeof parsed === "object") setHighlights(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  // Persist on every change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(highlights));
    } catch {
      /* ignore */
    }
  }, [highlights, hydrated, storageKey]);

  // Auto-dismiss the "saved" pill.
  useEffect(() => {
    if (!savedToast) return;
    const t = window.setTimeout(() => setSavedToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [savedToast]);

  function getRanges(key: string): HighlightRange[] {
    return highlights[key] ?? [];
  }

  function addRange(key: string, range: HighlightRange) {
    setHighlights((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), range],
    }));
  }

  function removeRange(key: string, index: number) {
    setHighlights((prev) => {
      const list = prev[key] ?? [];
      const next = list.filter((_, i) => i !== index);
      const out = { ...prev };
      if (next.length === 0) delete out[key];
      else out[key] = next;
      return out;
    });
  }

  function clearAllHighlights() {
    if (!window.confirm("Xoá toàn bộ highlight trong đề?")) return;
    setHighlights({});
  }

  const submitted = status === "submitted";

  // Map MCQ id -> per-question result for fast lookup once submitted.
  const mcqResultsById = useMemo(() => {
    const m = new Map<
      string,
      NonNullable<SectionFeedback["per"]>[number]
    >();
    if (!feedback) return m;
    for (const sec of feedback.sections) {
      if (sec.per) {
        for (const r of sec.per) m.set(r.id, r);
      }
    }
    return m;
  }, [feedback]);

  function setMcq(id: string, idx: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = { ...prev, [id]: idx };
      onAnswersChange?.(next);
      return next;
    });
  }

  function setWriting(id: string, value: string) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      onAnswersChange?.(next);
      return next;
    });
  }

  async function submit() {
    if (submitted || submitting) return;
    if (!confirmAllAnswered()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/german/tests/${encodeURIComponent(id)}/submit`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers, model }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        feedback?: TestFeedback;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.feedback) {
        throw new Error(data.error || "Nộp thất bại");
      }
      setFeedback(data.feedback);
      setStatus("submitted");
      onSubmitted?.(data.feedback);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Nộp thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmAllAnswered(): boolean {
    let mcqUnanswered = 0;
    let writingShort = false;
    for (const sec of test.sections) {
      if (sec.kind === "writing") {
        const t = (answers["w1"] as string | undefined) ?? "";
        if (countWords(t) < sec.minWords) writingShort = true;
      } else {
        for (const q of sec.questions) {
          if (typeof answers[q.id] !== "number") mcqUnanswered += 1;
        }
      }
    }
    if (mcqUnanswered === 0 && !writingShort) return true;
    const messages: string[] = [];
    if (mcqUnanswered > 0)
      messages.push(`${mcqUnanswered} câu trắc nghiệm chưa trả lời`);
    if (writingShort) messages.push("phần viết ngắn hơn mức tối thiểu");
    return window.confirm(
      `Vẫn nộp bài? (${messages.join(", ")}). Bạn không sửa được sau khi nộp.`,
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] ink-muted">
            {test.cefr} · {test.topic}
          </p>
          <p className="text-sm font-semibold tracking-tight">
            {submitted ? "Kết quả" : "Đề luyện"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(highlights).length > 0 ? (
            <button
              type="button"
              onClick={clearAllHighlights}
              className="btn-ghost text-xs"
              title="Clear all highlights in this test"
            >
              Clear highlights
            </button>
          ) : null}
          <button onClick={onClose} className="btn-ghost text-xs">
            Back to list
          </button>
        </div>
      </div>

      {/* Highlighter hint — shown until the user has used it once. */}
      {!submitted && Object.keys(highlights).length === 0 ? (
        <div
          className="surface flex items-start gap-2 p-3 text-xs"
          style={{ background: "var(--canvas-soft)" }}
        >
          <span aria-hidden style={{ color: "rgba(245,197,24,1)" }}>●</span>
          <p className="ink-muted">
            Mẹo: bôi đen text bất kỳ trong đề để highlight hoặc lưu thành thẻ
            từ vựng.
          </p>
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

      {/* Score banner once submitted */}
      {submitted && feedback ? (
        <ScoreBanner feedback={feedback} />
      ) : null}

      {/* Sections */}
      {test.sections.map((sec, i) => (
        <SectionBlock
          key={`${sec.kind}-${i}`}
          section={sec}
          sectionIndex={i}
          answers={answers}
          submitted={submitted}
          feedback={feedback?.sections[i] ?? null}
          mcqResultsById={mcqResultsById}
          onSetMcq={setMcq}
          onSetWriting={setWriting}
          getRanges={getRanges}
          addRange={addRange}
          removeRange={removeRange}
          onSaveWord={(word, sentence) => setSaveTarget({ word, sentence })}
        />
      ))}

      {/* Submit */}
      {!submitted ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs ink-muted">
            {countAnswered(test, answers)} / {countQuestions(test)} đã trả lời
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Đang chấm…" : "Nộp bài & chấm"}
          </button>
        </div>
      ) : null}

      {saveTarget ? (
        <QuickWordSave
          initialWord={saveTarget.word}
          initialExample={saveTarget.sentence}
          initialCefr={test.cefr as CefrLevel}
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

function ScoreBanner({ feedback }: { feedback: TestFeedback }) {
  const pct = feedback.max > 0 ? Math.round((feedback.total / feedback.max) * 100) : 0;
  const tone = pct >= 80 ? "#16a34a" : pct >= 60 ? "var(--accent)" : "#ef4444";
  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-semibold tracking-tight" style={{ color: tone }}>
          {feedback.total} / {feedback.max}
          <span className="ml-2 text-sm ink-muted">({pct}%)</span>
        </p>
        <p className="text-xs ink-muted">{feedback.summary}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {feedback.sections.map((s, i) => (
          <span
            key={`${s.kind}-${i}`}
            className="rounded-capsule px-3 py-1 text-xs"
            style={{
              background: "var(--canvas-soft)",
              color: "var(--ink)",
            }}
          >
            <span>{sectionKindLabel(s.kind)}</span> · {s.scored}/{s.total}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  sectionIndex,
  answers,
  submitted,
  feedback,
  mcqResultsById,
  onSetMcq,
  onSetWriting,
  getRanges,
  addRange,
  removeRange,
  onSaveWord,
}: {
  section: Section;
  sectionIndex: number;
  answers: AnswerMap;
  submitted: boolean;
  feedback: SectionFeedback | null;
  mcqResultsById: Map<string, NonNullable<SectionFeedback["per"]>[number]>;
  onSetMcq: (id: string, idx: number) => void;
  onSetWriting: (id: string, value: string) => void;
  getRanges: (key: string) => HighlightRange[];
  addRange: (key: string, range: HighlightRange) => void;
  removeRange: (key: string, index: number) => void;
  onSaveWord: (word: string, sentence: string) => void;
}) {
  if (section.kind === "reading") {
    return (
      <ReadingBlock
        section={section}
        sectionIndex={sectionIndex}
        answers={answers}
        submitted={submitted}
        mcqResultsById={mcqResultsById}
        onSet={onSetMcq}
        getRanges={getRanges}
        addRange={addRange}
        removeRange={removeRange}
        onSaveWord={onSaveWord}
      />
    );
  }
  if (section.kind === "vocabulary" || section.kind === "grammar") {
    return (
      <McqBlock
        section={section}
        sectionIndex={sectionIndex}
        answers={answers}
        submitted={submitted}
        mcqResultsById={mcqResultsById}
        onSet={onSetMcq}
        getRanges={getRanges}
        addRange={addRange}
        removeRange={removeRange}
        onSaveWord={onSaveWord}
      />
    );
  }
  return (
    <WritingBlock
      section={section}
      sectionIndex={sectionIndex}
      answers={answers}
      submitted={submitted}
      feedback={feedback}
      onSet={onSetWriting}
      getRanges={getRanges}
      addRange={addRange}
      removeRange={removeRange}
      onSaveWord={onSaveWord}
    />
  );
}

function ReadingBlock({
  section,
  sectionIndex,
  answers,
  submitted,
  mcqResultsById,
  onSet,
  getRanges,
  addRange,
  removeRange,
  onSaveWord,
}: {
  section: ReadingSection;
  sectionIndex: number;
  answers: AnswerMap;
  submitted: boolean;
  mcqResultsById: Map<string, NonNullable<SectionFeedback["per"]>[number]>;
  onSet: (id: string, idx: number) => void;
  getRanges: (key: string) => HighlightRange[];
  addRange: (key: string, range: HighlightRange) => void;
  removeRange: (key: string, index: number) => void;
  onSaveWord: (word: string, sentence: string) => void;
}) {
  const passageKey = `s${sectionIndex}.passage`;
  return (
    <section className="surface p-5">
      <SectionHeader
        title="Đọc hiểu"
        hint="Đọc đoạn văn rồi trả lời câu hỏi. Bôi đen từ bất kỳ để highlight hoặc lưu thẻ."
      />
      <div
        className="mt-3 rounded-md p-4 leading-relaxed"
        style={{ background: "var(--canvas-soft)" }}
      >
        <Highlightable
          text={section.passage}
          highlights={getRanges(passageKey)}
          onAddHighlight={(r) => addRange(passageKey, r)}
          onRemoveHighlight={(i) => removeRange(passageKey, i)}
          onSaveWord={onSaveWord}
          preserveWhitespace
          readOnly={submitted}
        />
      </div>
      <ol className="mt-5 space-y-5">
        {section.questions.map((q, idx) => (
          <li key={q.id}>
            <McqQuestion
              q={q}
              questionKey={`s${sectionIndex}.q.${q.id}`}
              index={idx}
              picked={answers[q.id] as number | undefined}
              submitted={submitted}
              result={mcqResultsById.get(q.id)}
              onPick={(i) => onSet(q.id, i)}
              getRanges={getRanges}
              addRange={addRange}
              removeRange={removeRange}
              onSaveWord={onSaveWord}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function McqBlock({
  section,
  sectionIndex,
  answers,
  submitted,
  mcqResultsById,
  onSet,
  getRanges,
  addRange,
  removeRange,
  onSaveWord,
}: {
  section: VocabSection | GrammarSection;
  sectionIndex: number;
  answers: AnswerMap;
  submitted: boolean;
  mcqResultsById: Map<string, NonNullable<SectionFeedback["per"]>[number]>;
  onSet: (id: string, idx: number) => void;
  getRanges: (key: string) => HighlightRange[];
  addRange: (key: string, range: HighlightRange) => void;
  removeRange: (key: string, index: number) => void;
  onSaveWord: (word: string, sentence: string) => void;
}) {
  const title = section.kind === "vocabulary" ? "Wortschatz · Từ vựng" : "Grammatik · Ngữ pháp";
  const hint =
    section.kind === "vocabulary"
      ? "Chọn từ/nghĩa phù hợp nhất. Bôi đen từ bất kỳ để lưu thẻ."
      : "Chọn phương án đúng ngữ pháp. Bôi đen text để ghi chú.";
  return (
    <section className="surface p-5">
      <SectionHeader title={title} hint={hint} />
      <ol className="mt-5 space-y-5">
        {section.questions.map((q, idx) => (
          <li key={q.id}>
            <McqQuestion
              q={q}
              questionKey={`s${sectionIndex}.q.${q.id}`}
              index={idx}
              picked={answers[q.id] as number | undefined}
              submitted={submitted}
              result={mcqResultsById.get(q.id)}
              onPick={(i) => onSet(q.id, i)}
              getRanges={getRanges}
              addRange={addRange}
              removeRange={removeRange}
              onSaveWord={onSaveWord}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function McqQuestion({
  q,
  questionKey,
  index,
  picked,
  submitted,
  result,
  onPick,
  getRanges,
  addRange,
  removeRange,
  onSaveWord,
}: {
  q: MCQItem;
  questionKey: string;
  index: number;
  picked: number | undefined;
  submitted: boolean;
  result: NonNullable<SectionFeedback["per"]>[number] | undefined;
  onPick: (i: number) => void;
  getRanges: (key: string) => HighlightRange[];
  addRange: (key: string, range: HighlightRange) => void;
  removeRange: (key: string, index: number) => void;
  onSaveWord: (word: string, sentence: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium">
        <span className="mr-1">{index + 1}.</span>
        <Highlightable
          className="inline"
          text={q.question}
          highlights={getRanges(`${questionKey}.q`)}
          onAddHighlight={(r) => addRange(`${questionKey}.q`, r)}
          onRemoveHighlight={(i) => removeRange(`${questionKey}.q`, i)}
          onSaveWord={onSaveWord}
          readOnly={submitted}
        />
      </div>
      <ul className="mt-2 space-y-1.5">
        {q.options.map((opt, i) => {
          const selected = picked === i;
          let style: React.CSSProperties = {
            background: "var(--canvas)",
            borderColor: "var(--border-soft)",
            color: "var(--ink)",
          };
          if (submitted && result) {
            if (i === result.correctAnswer) {
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
              <div
                className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors"
                style={style}
              >
                <button
                  type="button"
                  onClick={() => onPick(i)}
                  disabled={submitted}
                  className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[10px] disabled:cursor-default"
                  aria-label={`Chọn phương án ${String.fromCharCode(65 + i)}`}
                  style={{
                    borderColor: selected ? "var(--accent)" : "var(--border-soft)",
                    background: selected ? "var(--accent)" : "transparent",
                    color: selected ? "#fff" : "var(--ink-muted)",
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <Highlightable
                  className="flex-1"
                  text={opt}
                  highlights={getRanges(`${questionKey}.opt.${i}`)}
                  onAddHighlight={(r) => addRange(`${questionKey}.opt.${i}`, r)}
                  onRemoveHighlight={(idx) => removeRange(`${questionKey}.opt.${i}`, idx)}
                  onSaveWord={onSaveWord}
                  readOnly={submitted}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {submitted && result?.explanation ? (
        <p className="mt-2 text-xs ink-muted">{result.explanation}</p>
      ) : null}
    </div>
  );
}

function WritingBlock({
  section,
  sectionIndex,
  answers,
  submitted,
  feedback,
  onSet,
  getRanges,
  addRange,
  removeRange,
  onSaveWord,
}: {
  section: WritingSection;
  sectionIndex: number;
  answers: AnswerMap;
  submitted: boolean;
  feedback: SectionFeedback | null;
  onSet: (id: string, value: string) => void;
  getRanges: (key: string) => HighlightRange[];
  addRange: (key: string, range: HighlightRange) => void;
  removeRange: (key: string, index: number) => void;
  onSaveWord: (word: string, sentence: string) => void;
}) {
  const promptKey = `s${sectionIndex}.prompt`;
  const value = (answers["w1"] as string | undefined) ?? "";
  const wc = countWords(value);
  return (
    <section className="surface p-5">
      <SectionHeader
        title="Phần viết"
        hint={`Viết ${section.minWords}-${section.maxWords} từ. AI chấm bài.`}
      />
      <div
        className="mt-3 rounded-md p-3 text-sm leading-relaxed"
        style={{ background: "var(--canvas-soft)" }}
      >
        <Highlightable
          text={section.prompt}
          highlights={getRanges(promptKey)}
          onAddHighlight={(r) => addRange(promptKey, r)}
          onRemoveHighlight={(i) => removeRange(promptKey, i)}
          onSaveWord={onSaveWord}
          preserveWhitespace
          readOnly={submitted}
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => onSet("w1", e.target.value)}
        disabled={submitted}
        maxLength={4000}
        placeholder="Hãy viết câu trả lời tại đây…"
        className="input mt-3 min-h-[200px] resize-y"
      />
      <p className="mt-1 text-xs ink-muted">
        {wc} từ{wc === 1 ? "" : "s"}
        {wc < section.minWords && !submitted ? " · cần thêm" : ""}
        {wc > section.maxWords && !submitted ? " · vượt quá giới hạn" : ""}
      </p>

      {submitted && feedback ? (
        <div className="mt-4 space-y-3 border-t hairline pt-4">
          <p className="text-sm">
            <span className="font-semibold">Điểm phần viết: </span>
            <span style={{ color: "var(--accent)" }}>
              {feedback.writingScore ?? 0} / {feedback.total}
            </span>
          </p>
          {feedback.writingNotes ? (
            <p className="text-sm leading-relaxed">{feedback.writingNotes}</p>
          ) : null}
          {feedback.writingIssues && feedback.writingIssues.length > 0 ? (
            <ul className="space-y-1.5">
              {feedback.writingIssues.map((issue, i) => (
                <li key={i} className="text-xs">
                  <span
                    className="rounded-capsule px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    style={{
                      background: `${ISSUE_TONE[issue.type] ?? "#6e6e73"}1f`,
                      color: ISSUE_TONE[issue.type] ?? "var(--ink-muted)",
                    }}
                  >
                    {issue.type}
                  </span>
                  <span
                    className="ml-2 line-through"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {issue.original}
                  </span>
                  <span className="mx-1">→</span>
                  <span className="font-medium">{issue.suggestion}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <header>
      <p className="text-xs uppercase tracking-[0.16em] ink-muted">{title}</p>
      <p className="mt-1 text-sm font-medium">{hint}</p>
    </header>
  );
}

function countAnswered(test: TestStructure, answers: AnswerMap): number {
  let n = 0;
  for (const sec of test.sections) {
    if (sec.kind === "writing") {
      const t = answers["w1"];
      if (typeof t === "string" && countWords(t) >= sec.minWords) n += 1;
    } else {
      for (const q of sec.questions) {
        if (typeof answers[q.id] === "number") n += 1;
      }
    }
  }
  return n;
}

function countQuestions(test: TestStructure): number {
  let n = 0;
  for (const sec of test.sections) {
    if (sec.kind === "writing") n += 1;
    else n += sec.questions.length;
  }
  return n;
}


function sectionKindLabel(kind: Section["kind"]): string {
  switch (kind) {
    case "reading":
      return "Lesen";
    case "vocabulary":
      return "Wortschatz";
    case "grammar":
      return "Grammatik";
    case "writing":
      return "Schreiben";
    default:
      return kind;
  }
}
