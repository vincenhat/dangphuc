"use client";

/**
 * Grammar — hệ thống học ngữ pháp tiếng Anh cho người Việt.
 *
 * Bên trái: thanh điều hướng theo nhóm chủ đề (category → topic). Bên phải:
 * nội dung từng chủ đề gồm phần giải thích, công thức, ví dụ song ngữ và bảng
 * lỗi thường gặp. Tiến độ "đã học" lưu trong localStorage.
 */

import { useMemo, useState } from "react";
import {
  GRAMMAR_CATEGORIES,
  type GeneratedQuestion,
  type GrammarTopic,
} from "@/lib/study-grammar";
import { usePersistentState } from "@/lib/use-persistent-state";
import { getStoredModel } from "@/components/ModelPicker";

const LEVEL_COLOR: Record<string, string> = {
  A1: "#16a34a",
  A2: "#0ea5e9",
  B1: "#f59e0b",
  B2: "#ef4444",
};

const ALL_TOPICS: { topic: GrammarTopic; color: string }[] =
  GRAMMAR_CATEGORIES.flatMap((c) => c.topics.map((t) => ({ topic: t, color: c.color })));

export default function GrammarTab() {
  const [activeId, setActiveId] = usePersistentState<string>(
    "pt_study_grammar_topic",
    ALL_TOPICS[0].topic.id,
  );
  const [learned, setLearned] = usePersistentState<string[]>(
    "pt_study_grammar_learned",
    [],
  );

  const learnedSet = useMemo(() => new Set(learned), [learned]);
  const active =
    ALL_TOPICS.find((t) => t.topic.id === activeId) ?? ALL_TOPICS[0];
  const topic = active.topic;
  const activeCat =
    GRAMMAR_CATEGORIES.find((c) => c.topics.some((t) => t.id === topic.id)) ??
    GRAMMAR_CATEGORIES[0];

  const total = ALL_TOPICS.length;
  const doneCount = ALL_TOPICS.filter((t) => learnedSet.has(t.topic.id)).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const isLearned = learnedSet.has(topic.id);

  function toggleLearned() {
    setLearned((prev) =>
      prev.includes(topic.id)
        ? prev.filter((id) => id !== topic.id)
        : [...prev, topic.id],
    );
  }

  return (
    <div className="space-y-5">
      {/* Tiến độ tổng */}
      <section className="surface flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Ngữ pháp · {doneCount}/{total} chủ đề đã học
            </h2>
            <span className="text-xs ink-muted tabular-nums">{pct}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full"
            style={{ background: "var(--canvas-soft)" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      </section>

      {/* Tab nhóm chủ đề — nhấn để xem các bài học trong nhóm */}
      <nav
        role="tablist"
        className="surface flex w-full flex-wrap gap-1.5 p-2"
        aria-label="Nhóm chủ đề ngữ pháp"
      >
        {GRAMMAR_CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCat.id;
          const catDone = cat.topics.filter((t) => learnedSet.has(t.id)).length;
          // Nhãn ngắn: phần tiếng Việt trước dấu "·".
          const shortLabel = cat.title.split("·")[0].trim();
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(cat.topics[0].id)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
              style={{
                background: isActive ? cat.color : "var(--canvas-soft)",
                color: isActive ? "#fff" : "var(--ink)",
              }}
              title={cat.blurb}
            >
              <span className="text-xs font-semibold">{shortLabel}</span>
              <span
                className="rounded-capsule px-1.5 py-0.5 text-[10px] tabular-nums"
                style={{
                  background: isActive ? "rgba(255,255,255,0.22)" : "var(--canvas)",
                  color: isActive ? "#fff" : "var(--ink-muted)",
                }}
              >
                {catDone}/{cat.topics.length}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Danh sách bài học trong nhóm đang chọn */}
      <section className="surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: activeCat.color }}>
            {activeCat.title}
          </h2>
          <span className="text-xs ink-muted">{activeCat.blurb}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeCat.topics.map((t) => {
            const isActive = t.id === topic.id;
            const done = learnedSet.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className="flex items-center gap-1.5 rounded-capsule px-3 py-1.5 text-xs transition-colors"
                style={{
                  background: isActive ? activeCat.color : "var(--canvas-soft)",
                  color: isActive ? "#fff" : "var(--ink)",
                }}
                title={t.title}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#fff" : "#16a34a"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                ) : null}
                <span className="font-medium whitespace-nowrap">{t.short}</span>
                <span
                  className="text-[10px]"
                  style={{ color: isActive ? "rgba(255,255,255,0.8)" : "var(--ink-muted)" }}
                >
                  {t.level}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Nội dung chủ đề */}
      <article className="surface p-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b hairline pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{topic.title}</h2>
              <span
                className="rounded-capsule px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: `${LEVEL_COLOR[topic.level] ?? "var(--accent)"}22`,
                  color: LEVEL_COLOR[topic.level] ?? "var(--accent)",
                }}
              >
                {topic.level}
              </span>
            </div>
            <p className="mt-1 text-sm ink-muted">{topic.summary}</p>
          </div>
          <button
            type="button"
            onClick={toggleLearned}
            className={isLearned ? "btn-ghost text-xs" : "btn-primary !min-h-[36px] text-xs"}
          >
            {isLearned ? "✓ Đã học · bỏ đánh dấu" : "Đánh dấu đã học"}
          </button>
        </header>

        <div className="mt-5 space-y-6">
          {topic.sections.map((sec, i) => (
            <section key={i}>
              <h3 className="text-sm font-semibold tracking-tight" style={{ color: active.color }}>
                {sec.heading}
              </h3>
              {sec.body ? (
                <p className="mt-1.5 text-sm leading-relaxed">{sec.body}</p>
              ) : null}

              {sec.formula ? (
                <div
                  className="mt-2 rounded-md border-l-4 px-3 py-2 font-mono text-sm"
                  style={{ borderColor: active.color, background: "var(--canvas-soft)" }}
                >
                  {sec.formula}
                </div>
              ) : null}

              {sec.bullets?.length ? (
                <ul className="mt-2 space-y-1.5">
                  {sec.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2 text-sm leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: active.color }}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {sec.examples?.length ? (
                <ul className="mt-3 space-y-2">
                  {sec.examples.map((ex, j) => (
                    <li
                      key={j}
                      className="rounded-md p-3"
                      style={{ background: "var(--canvas-soft)" }}
                    >
                      <p className="text-sm font-medium">{ex.en}</p>
                      <p className="mt-0.5 text-sm" style={{ color: "var(--accent-link)" }}>
                        {ex.vi}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {topic.mistakes?.length ? (
            <section>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z" />
                </svg>
                Lỗi thường gặp
              </h3>
              <ul className="mt-3 space-y-3">
                {topic.mistakes.map((m, j) => (
                  <li
                    key={j}
                    className="rounded-md border-l-4 p-3"
                    style={{ borderColor: "#f59e0b", background: "var(--canvas-soft)" }}
                  >
                    <p className="text-sm" style={{ color: "#ef4444" }}>
                      <span className="font-semibold">✗ </span>
                      <span className="line-through">{m.wrong}</span>
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "#16a34a" }}>
                      <span className="font-semibold">✓ </span>
                      {m.right}
                    </p>
                    <p className="mt-1.5 text-xs ink-muted">{m.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Bài tập kiểm tra hiểu bài */}
        <GrammarExercises key={topic.id} topic={topic} color={active.color} />

        {/* Điều hướng trước/sau */}
        <div className="mt-6 flex items-center justify-between border-t hairline pt-4">
          <NavButton
            dir="prev"
            onClick={() => {
              const idx = ALL_TOPICS.findIndex((t) => t.topic.id === topic.id);
              if (idx > 0) setActiveId(ALL_TOPICS[idx - 1].topic.id);
            }}
            disabled={ALL_TOPICS[0].topic.id === topic.id}
          />
          <NavButton
            dir="next"
            onClick={() => {
              const idx = ALL_TOPICS.findIndex((t) => t.topic.id === topic.id);
              if (idx < ALL_TOPICS.length - 1) setActiveId(ALL_TOPICS[idx + 1].topic.id);
            }}
            disabled={ALL_TOPICS[ALL_TOPICS.length - 1].topic.id === topic.id}
          />
        </div>
      </article>
    </div>
  );
}

function NavButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-ghost text-xs disabled:opacity-40"
    >
      {dir === "prev" ? "← Trước" : "Tiếp →"}
    </button>
  );
}

/**
 * Khu bài tập của một chủ đề: một bộ 15 câu do AI sinh (trắc nghiệm & điền từ).
 * Câu hỏi được cache trong localStorage để không sinh lại.
 */
function GrammarExercises({ topic, color }: { topic: GrammarTopic; color: string }) {
  return (
    <section className="mt-6 border-t hairline pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Bài tập kiểm tra
        </h3>
        <span className="text-xs ink-muted">15 câu · AI tạo</span>
      </div>

      <ExerciseSet
        topicId={topic.id}
        title={topic.title}
        level={topic.level}
        setNumber={1}
        color={color}
      />
    </section>
  );
}

/** So khớp đáp án (không phân biệt hoa thường, gọn khoảng trắng/dấu cuối). */
function normalizeAns(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
}

/** Một bộ 15 câu: tải/sinh đề, làm bài, chấm điểm. */
function ExerciseSet({
  topicId,
  title,
  level,
  setNumber,
  color,
}: {
  topicId: string;
  title: string;
  level: string;
  setNumber: number;
  color: string;
}) {
  const [questions, setQuestions] = usePersistentState<GeneratedQuestion[]>(
    `pt_grammar_ex_${topicId}_${setNumber}`,
    [],
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study/grammar-exercise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          level,
          setNumber,
          model: getStoredModel() ?? undefined,
        }),
      });
      const data = (await res.json()) as { questions?: GeneratedQuestion[]; error?: string };
      if (!res.ok || !data.questions) throw new Error(data.error || "Tạo đề thất bại");
      setQuestions(data.questions);
      setAnswers({});
      setSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo đề thất bại");
    } finally {
      setLoading(false);
    }
  }

  // Chưa có đề: nút tạo đề.
  if (questions.length === 0) {
    return (
      <div className="mt-4 rounded-md p-5 text-center" style={{ background: "var(--canvas-soft)" }}>
        <p className="text-sm ink-muted">
          Bộ bài tập {setNumber} gồm 15 câu (trắc nghiệm &amp; điền từ) do AI tạo theo chủ đề này.
        </p>
        {error ? (
          <p className="mt-2 text-sm" style={{ color: "var(--accent)" }}>
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="btn-primary mt-3 text-sm"
        >
          {loading ? "Đang tạo đề…" : "Tạo đề & bắt đầu"}
        </button>
      </div>
    );
  }

  const correctCount = questions.reduce((acc, q, i) => {
    const a = answers[i] ?? "";
    return acc + (normalizeAns(a) === normalizeAns(q.answer) ? 1 : 0);
  }, 0);
  const answeredAll = questions.every((_, i) => (answers[i] ?? "").trim() !== "");

  return (
    <div className="mt-4 space-y-3">
      {/* Thanh công cụ: luôn hiện khi đã có đề */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs ink-muted">{questions.length} câu hỏi</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            className="btn-ghost text-xs"
            title="Xoá câu trả lời, giữ nguyên đề"
          >
            Làm lại
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="btn-ghost text-xs"
            title="Sinh một đề khác"
          >
            {loading ? "Đang tạo…" : "Tạo đề mới"}
          </button>
        </div>
      </div>

      {submitted ? (
        <div
          className="rounded-md p-3"
          style={{ background: "var(--canvas-soft)" }}
        >
          <p className="text-sm font-semibold">
            Kết quả: {correctCount}/{questions.length} câu đúng (
            {Math.round((correctCount / questions.length) * 100)}%)
          </p>
        </div>
      ) : null}

      <ol className="space-y-4">
        {questions.map((q, i) => {
          const a = answers[i] ?? "";
          const correct = normalizeAns(a) === normalizeAns(q.answer);
          return (
            <li key={i} className="rounded-md p-3" style={{ background: "var(--canvas-soft)" }}>
              <p className="text-sm font-medium">
                <span className="ink-muted">{i + 1}. </span>
                {q.prompt}
                <span
                  className="ml-2 rounded-capsule px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                  style={{ background: "var(--canvas)", color: "var(--ink-muted)" }}
                >
                  {q.type === "mcq" ? "Trắc nghiệm" : "Điền từ"}
                </span>
              </p>

              {q.type === "mcq" && q.options ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((opt, oi) => {
                    const chosen = a === opt;
                    const isAns = normalizeAns(opt) === normalizeAns(q.answer);
                    let bg = "var(--canvas)";
                    let fg = "var(--ink)";
                    let border = "var(--border-mid)";
                    if (submitted) {
                      if (isAns) {
                        bg = "rgba(22,163,74,0.14)";
                        fg = "#16a34a";
                        border = "#16a34a";
                      } else if (chosen) {
                        bg = "rgba(239,68,68,0.12)";
                        fg = "#ef4444";
                        border = "#ef4444";
                      }
                    } else if (chosen) {
                      bg = `${color}1a`;
                      border = color;
                    }
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                        className="rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-default"
                        style={{ background: bg, color: fg, borderColor: border }}
                      >
                        {opt}
                        {submitted && isAns ? " ✓" : null}
                        {submitted && chosen && !isAns ? " ✗" : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={a}
                  onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                  readOnly={submitted}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Điền từ…"
                  className="input mt-2 max-w-xs"
                  style={
                    submitted
                      ? { borderColor: correct ? "#16a34a" : "#ef4444" }
                      : undefined
                  }
                />
              )}

              {submitted ? (
                <p className="mt-2 text-xs ink-muted">
                  <span
                    className="font-semibold"
                    style={{ color: correct ? "#16a34a" : "#ef4444" }}
                  >
                    {correct ? "Đúng · " : `Đáp án: ${q.answer} · `}
                  </span>
                  {q.explain}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={!answeredAll}
          className="btn-primary w-full text-sm disabled:opacity-50"
        >
          {answeredAll ? "Nộp bài" : "Hãy trả lời tất cả câu hỏi"}
        </button>
      ) : null}
    </div>
  );
}
