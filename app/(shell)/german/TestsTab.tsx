"use client";

import { useEffect, useState } from "react";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/study";
import type {
  AnswerMap,
  TestFeedback,
  TestStructure,
} from "@/lib/study-test";
import { formatDate } from "@/lib/format";
import TestRunner from "./TestRunner";

interface TestSummaryRow {
  id: string;
  topic: string;
  cefr: string;
  score: number | null;
  max_score: number;
  status: "in_progress" | "submitted";
  created_at: string;
  submitted_at: string | null;
}

export interface ActiveTest {
  id: string;
  test: TestStructure;
  answers: AnswerMap | null;
  feedback: TestFeedback | null;
  status: "in_progress" | "submitted";
}

const TOPIC_SUGGESTIONS = [
  "Reisen und Urlaub",
  "Tagesabläufe",
  "Essen und Kochen",
  "Technologie in der Schule",
  "Hobbys und Freizeit",
  "Stadtleben und Landleben",
  "Arbeit und Beruf",
];

export default function TestsTab({
  onError,
  model,
  active,
  setActive,
}: {
  onError: (msg: string) => void;
  model: string | null;
  active: ActiveTest | null;
  setActive: (t: ActiveTest | null) => void;
}) {
  const [topic, setTopic] = useState(TOPIC_SUGGESTIONS[0]);
  const [cefr, setCefr] = useState<CefrLevel>("B1");
  const [generating, setGenerating] = useState(false);

  const [history, setHistory] = useState<TestSummaryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/german/tests", { cache: "no-store" });
      const data = (await res.json()) as { tests?: TestSummaryRow[] };
      setHistory(data.tests ?? []);
    } catch {
      // history is non-critical, swallow
    } finally {
      setHistoryLoading(false);
    }
  }

  async function generate() {
    if (!topic.trim()) {
      onError("Chọn chủ đề trước đã.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/german/tests/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), cefr, model }),
      });
      const data = (await res.json()) as {
        id?: string;
        test?: TestStructure;
        error?: string;
      };
      if (!res.ok || !data.id || !data.test) {
        throw new Error(data.error || "Không tạo được đề");
      }
      setActive({
        id: data.id,
        test: data.test,
        answers: null,
        feedback: null,
        status: "in_progress",
      });
      void loadHistory();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Tạo thất bại");
    } finally {
      setGenerating(false);
    }
  }

  async function openTest(id: string) {
    try {
      const res = await fetch(`/api/german/tests/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        id: string;
        test: TestStructure;
        answers: AnswerMap | null;
        feedback: TestFeedback | null;
        status: "in_progress" | "submitted";
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Không mở được đề");
      setActive({
        id: data.id,
        test: data.test,
        answers: data.answers,
        feedback: data.feedback,
        status: data.status,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Mở thất bại");
    }
  }

  async function deleteTest(id: string) {
    if (!window.confirm("Xoá đề này và kết quả?")) return;
    setHistory((prev) => prev.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
    await fetch(`/api/german/tests/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (active) {
    return (
      <TestRunner
        id={active.id}
        test={active.test}
        savedAnswers={active.answers}
        savedFeedback={active.feedback}
        savedStatus={active.status}
        model={model}
        onClose={() => {
          setActive(null);
          void loadHistory();
        }}
        onAnswersChange={(answers) => {
          setActive({ ...active, answers });
        }}
        onSubmitted={(feedback) => {
          setActive({ ...active, feedback, status: "submitted" });
          void loadHistory();
        }}
        onError={onError}
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Generator */}
      <section className="surface p-5">
        <h3 className="text-sm font-semibold tracking-tight">Đề thi mới · Neuer Übungstest</h3>
        <p className="mt-1 text-xs ink-muted">
          AI tạo đề CEFR với 4 phần: Lesen, Wortschatz, Grammatik, Schreiben.
          Trắc nghiệm tự chấm; phần viết do AI chấm bằng tiêu chí DaF.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_auto]">
          <label className="block">
            <span className="block text-xs font-medium ink-muted">Chủ đề · Thema</span>
            <input
              list="topic-suggestions"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
              placeholder="vd. Reisen und Urlaub"
              className="input mt-1"
            />
            <datalist id="topic-suggestions">
              {TOPIC_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="block text-xs font-medium ink-muted">Mức · CEFR</span>
            <select
              value={cefr}
              onChange={(e) => setCefr(e.target.value as CefrLevel)}
              className="input mt-1"
            >
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="btn-primary w-full md:w-auto"
            >
              {generating ? "Đang tạo…" : "Tạo đề"}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs ink-muted">
          Một đề mất khoảng 10–20 phút. Tạo đề tốn 1 lần gọi AI; nộp bài tốn
          thêm 1 lần nữa (chấm Schreiben).
        </p>
      </section>

      {/* History */}
      <aside className="surface flex h-fit flex-col">
        <header className="border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Đề đã làm</p>
          <p className="mt-0.5 text-xs ink-muted">50 gần nhất</p>
        </header>
        {historyLoading ? (
          <p className="px-4 py-6 text-sm ink-muted">Đang tải…</p>
        ) : history.length === 0 ? (
          <p className="px-4 py-6 text-sm ink-muted">Chưa có đề nào.</p>
        ) : (
          <ul
            className="max-h-[60vh] divide-y overflow-y-auto"
            style={{ borderColor: "var(--border-soft)" }}
          >
            {history.map((t) => {
              const submitted = t.status === "submitted";
              const pct =
                submitted && t.score !== null
                  ? Math.round((t.score / t.max_score) * 100)
                  : null;
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-2 px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => openTest(t.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">{t.topic}</p>
                    <p className="mt-0.5 text-xs ink-muted">
                      {t.cefr} ·{" "}
                      {submitted
                        ? `${t.score}/${t.max_score}${pct !== null ? ` (${pct}%)` : ""}`
                        : "đang làm"}
                      {" · "}
                      {formatDate(t.created_at)}
                    </p>
                  </button>
                  {submitted && pct !== null ? (
                    <span
                      className="rounded-capsule px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background:
                          pct >= 80
                            ? "rgba(22,163,74,0.15)"
                            : pct >= 60
                              ? "rgba(236,72,153,0.15)"
                              : "rgba(239,68,68,0.15)",
                        color:
                          pct >= 80
                            ? "#16a34a"
                            : pct >= 60
                              ? "var(--accent)"
                              : "#ef4444",
                      }}
                    >
                      {pct}%
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteTest(t.id)}
                    aria-label="Xoá đề"
                    className="ink-muted hover:text-[var(--ink)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
