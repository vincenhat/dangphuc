"use client";

/**
 * Reading practice tab.
 *
 * - Generator: pick a topic, CEFR level, and category, then ask Gemini to
 *   produce a short level-appropriate passage with comprehension questions
 *   and a small glossary.
 * - History: previously generated readings, filterable by level and category.
 * - Runner: displays the chosen reading with the same Highlightable used
 *   in the practice test, so users can highlight and save vocabulary while
 *   reading.
 */

import { useEffect, useState } from "react";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/study";
import {
  READING_CATEGORIES,
  type Reading,
  type ReadingCategory,
} from "@/lib/study-reading";
import { formatDate } from "@/lib/format";
import ReadingRunner from "./ReadingRunner";

interface ReadingSummaryRow {
  id: string;
  topic: string;
  cefr: string;
  category: string;
  title: string;
  summary: string | null;
  created_at: string;
}

export interface ActiveReading {
  id: string;
  reading: Reading;
}

const TOPIC_SUGGESTIONS = [
  "Kaffee und Kuchen in Wien",
  "Ein Wochenende in Berlin",
  "Wie Vögel den Heimweg finden",
  "Warum Schüler genug schlafen müssen",
  "Smartphones und das Lernen",
  "Das deutsche Oktoberfest",
  "Arbeiten im Café",
  "Geld sparen als Student",
];

export default function ReadingTab({
  onError,
  model,
  active,
  setActive,
}: {
  onError: (msg: string) => void;
  model: string | null;
  active: ActiveReading | null;
  setActive: (r: ActiveReading | null) => void;
}) {
  const [topic, setTopic] = useState(TOPIC_SUGGESTIONS[0]);
  const [cefr, setCefr] = useState<CefrLevel>("B1");
  const [category, setCategory] = useState<ReadingCategory>("Story");
  const [generating, setGenerating] = useState(false);

  const [history, setHistory] = useState<ReadingSummaryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // History filters
  const [filterCefr, setFilterCefr] = useState<CefrLevel | "">("");
  const [filterCategory, setFilterCategory] = useState<ReadingCategory | "">("");
  const [filterQ, setFilterQ] = useState("");

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCefr, filterCategory, filterQ]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCefr) params.set("cefr", filterCefr);
      if (filterCategory) params.set("category", filterCategory);
      if (filterQ.trim()) params.set("q", filterQ.trim());
      const res = await fetch(
        `/api/german/readings?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { readings?: ReadingSummaryRow[] };
      setHistory(data.readings ?? []);
    } catch {
      // history is non-critical
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
      const res = await fetch("/api/german/readings/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), cefr, category, model }),
      });
      const data = (await res.json()) as {
        id?: string;
        reading?: Reading;
        error?: string;
      };
      if (!res.ok || !data.id || !data.reading) {
        throw new Error(data.error || "Không tạo được bài đọc");
      }
      setActive({ id: data.id, reading: data.reading });
      void loadHistory();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Tạo thất bại");
    } finally {
      setGenerating(false);
    }
  }

  async function openReading(id: string) {
    try {
      const res = await fetch(
        `/api/german/readings/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as
        | (Reading & { id: string })
        | { error?: string };
      if (!res.ok || !("id" in data)) {
        throw new Error("Không mở được bài đọc");
      }
      setActive({
        id: (data as Reading & { id: string }).id,
        reading: data as Reading,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Mở thất bại");
    }
  }

  async function deleteReading(id: string) {
    if (!window.confirm("Xoá bài đọc này?")) return;
    setHistory((prev) => prev.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
    await fetch(`/api/german/readings/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (active) {
    return (
      <ReadingRunner
        id={active.id}
        reading={active.reading}
        onClose={() => {
          setActive(null);
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
        <h3 className="text-sm font-semibold tracking-tight">Bài đọc mới · Neue Lektüre</h3>
        <p className="mt-1 text-xs ink-muted">
          AI viết một đoạn ngắn bằng tiếng Đức, phù hợp với mức CEFR bạn chọn,
          kèm từ vựng trọng tâm (có mạo từ) và câu hỏi hiểu. Highlight từ bất kỳ
          để lưu vào bộ thẻ.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium ink-muted">Chủ đề · Thema</span>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!generating && topic.trim()) void generate();
                }
              }}
              maxLength={200}
              rows={2}
              placeholder="vd. Ein Wochenende in Berlin · Enter để tạo, Shift+Enter để xuống dòng"
              className="input mt-1 min-h-[64px] resize-y"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOPIC_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="rounded-capsule px-2.5 py-1 text-[11px] transition-colors"
                  style={{
                    background: "var(--canvas-soft)",
                    color: "var(--ink-muted)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </label>

          <div className="grid gap-3 md:grid-cols-[140px_160px_auto] md:items-end">
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

            <label className="block">
              <span className="block text-xs font-medium ink-muted">Thể loại · Kategorie</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReadingCategory)}
                className="input mt-1"
              >
                {READING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={generate}
              disabled={generating || !topic.trim()}
              className="btn-primary md:ml-auto"
            >
              {generating ? "Đang viết…" : "Tạo bài"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {READING_CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="rounded-capsule px-3 py-1.5 text-xs transition-colors"
                style={{
                  background: active ? "var(--accent)" : "var(--canvas-soft)",
                  color: active ? "#fff" : "var(--ink-muted)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs ink-muted">
          Mỗi bài đọc tốn một lần gọi AI. Độ dài thay đổi theo mức: A1 ngắn,
          C1+ dài hơn.
        </p>
      </section>

      {/* History */}
      <aside className="surface flex h-fit flex-col">
        <header className="border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Bài đọc đã lưu</p>
          <p className="mt-0.5 text-xs ink-muted">50 gần nhất</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="Tìm chủ đề…"
              className="input !w-32 !py-1 !text-xs"
            />
            <select
              value={filterCefr}
              onChange={(e) => setFilterCefr(e.target.value as CefrLevel | "")}
              className="input !w-auto !py-1 !text-xs"
              aria-label="Lọc theo mức"
            >
              <option value="">Tất cả mức</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as ReadingCategory | "")
              }
              className="input !w-auto !py-1 !text-xs"
              aria-label="Lọc theo thể loại"
            >
              <option value="">Tất cả thể loại</option>
              {READING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </header>
        {historyLoading ? (
          <p className="px-4 py-6 text-sm ink-muted">Đang tải…</p>
        ) : history.length === 0 ? (
          <p className="px-4 py-6 text-sm ink-muted">Chưa có bài đọc nào.</p>
        ) : (
          <ul
            className="max-h-[60vh] divide-y overflow-y-auto"
            style={{ borderColor: "var(--border-soft)" }}
          >
            {history.map((r) => (
              <li key={r.id} className="flex items-start gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => openReading(r.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs ink-muted">
                    {r.cefr} · {r.category} · {formatDate(r.created_at)}
                  </p>
                  {r.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs ink-muted">
                      {r.summary}
                    </p>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => deleteReading(r.id)}
                  aria-label="Xoá bài đọc"
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
                    <path d="M3 6h18M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
