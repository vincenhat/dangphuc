"use client";

import { useState } from "react";
import type { WritingEntry, WritingIssue, WritingUpgrade } from "@/lib/study";
import { formatDate } from "@/lib/format";

interface ApiResult {
  id: string;
  corrected: string;
  issues: WritingIssue[];
  upgrades: WritingUpgrade[];
}

interface WordForms {
  word: string;
  noun: { plural: string; type: "regular" | "irregular"; note: string } | null;
  verb: { v2: string; v3: string; type: "regular" | "irregular"; note: string } | null;
  adjective: { comparative: string; superlative: string; note: string } | null;
  note?: string;
}

const ISSUE_TONE: Record<WritingIssue["type"], string> = {
  grammar: "#ef4444",
  spelling: "#f59e0b",
  punctuation: "#0ea5e9",
  style: "#a855f7",
};

export default function WritingTab({
  initial,
  model,
  onError,
}: {
  initial: WritingEntry[];
  model: string | null;
  onError: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [history, setHistory] = useState<WritingEntry[]>(initial);

  async function check() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/german/writing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t, model }),
      });
      const data = (await res.json()) as Partial<ApiResult> & { error?: string };
      if (!res.ok) throw new Error(data.error || "Check failed");
      const next: ApiResult = {
        id: data.id ?? "",
        corrected: data.corrected ?? "",
        issues: data.issues ?? [],
        upgrades: data.upgrades ?? [],
      };
      setResult(next);
      // Reload history so the new entry shows up.
      const hres = await fetch("/api/german/writing");
      const hdata = (await hres.json()) as { entries?: WritingEntry[] };
      setHistory(hdata.entries ?? []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadEntry(e: WritingEntry) {
    setText(e.original);
    setResult({
      id: e.id,
      corrected: e.corrected ?? "",
      issues: parseJsonArray<WritingIssue>(e.issues),
      upgrades: parseJsonArray<WritingUpgrade>(e.upgrades),
    });
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this writing entry?")) return;
    setHistory((prev) => prev.filter((x) => x.id !== id));
    if (result?.id === id) setResult(null);
    await fetch(`/api/german/writing?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Editor + result */}
      <div className="space-y-5">
        <WordFormsEngine model={model} onError={onError} />

        <div className="surface p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] ink-muted">
            Your text
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a paragraph (max ~4000 chars). Try writing about your day, a movie, or your weekend plans."
            maxLength={4000}
            className="input min-h-[180px] resize-y"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs ink-muted">{text.length} / 4000 chars</p>
            <button
              type="button"
              onClick={check}
              disabled={busy || !text.trim()}
              className="btn-primary"
            >
              {busy ? "Checking…" : "Check writing"}
            </button>
          </div>
        </div>

        {result ? (
          <>
            <section className="surface p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] ink-muted">
                Corrected version
              </p>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {result.corrected || (
                  <span className="ink-muted">Looks good, no rewrite needed.</span>
                )}
              </p>
            </section>

            <section className="surface">
              <header className="border-b hairline px-4 py-3">
                <p className="text-sm font-semibold tracking-tight">
                  Issues ({result.issues.length})
                </p>
              </header>
              {result.issues.length === 0 ? (
                <p className="px-4 py-6 text-sm ink-muted">No issues found.</p>
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
                  {result.issues.map((i, idx) => (
                    <li key={idx} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className="rounded-capsule px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{
                            background: `${ISSUE_TONE[i.type]}1f`,
                            color: ISSUE_TONE[i.type],
                          }}
                        >
                          {i.type}
                        </span>
                        <span
                          className="text-sm line-through"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          {i.original}
                        </span>
                        <span className="text-sm">→</span>
                        <span className="text-sm font-medium">
                          {i.suggestion}
                        </span>
                      </div>
                      {i.explanation ? (
                        <p className="mt-1 text-xs ink-muted">{i.explanation}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface">
              <header className="border-b hairline px-4 py-3">
                <p className="text-sm font-semibold tracking-tight">
                  Vocabulary upgrades ({result.upgrades.length})
                </p>
                <p className="mt-0.5 text-xs ink-muted">
                  Stronger word choices that still sound natural.
                </p>
              </header>
              {result.upgrades.length === 0 ? (
                <p className="px-4 py-6 text-sm ink-muted">
                  No upgrades — your word choice is solid.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
                  {result.upgrades.map((u, idx) => (
                    <li key={idx} className="px-4 py-3">
                      <p className="text-sm">
                        <span className="ink-muted">{u.original}</span>
                        <span className="mx-1.5">→</span>
                        <span className="font-medium">{u.suggestion}</span>
                      </p>
                      {u.why ? (
                        <p className="mt-1 text-xs ink-muted">{u.why}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>

      {/* History */}
      <aside className="surface flex h-fit flex-col">
        <header className="border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Recent</p>
          <p className="mt-0.5 text-xs ink-muted">Last 50 entries</p>
        </header>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-sm ink-muted">
            Your writing history will appear here.
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y overflow-y-auto" style={{ borderColor: "var(--border-soft)" }}>
            {history.map((e) => (
              <li key={e.id} className="flex items-start gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => loadEntry(e)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm">{e.original}</p>
                  <p className="mt-0.5 text-xs ink-muted">
                    {formatDate(e.created_at)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Delete entry"
                  className="ink-muted hover:text-[var(--ink)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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

function parseJsonArray<T>(s: string | null): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * AI Engine: nhập một từ → sinh các biến thể theo từ loại (danh từ số nhiều,
 * động từ V2/V3, tính từ so sánh hơn/nhất). Hiện tất cả từ loại mà từ đó có.
 */
function WordFormsEngine({
  model,
  onError,
}: {
  model: string | null;
  onError: (msg: string) => void;
}) {
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<WordForms | null>(null);

  async function analyze() {
    const w = word.trim();
    if (!w || busy) return;
    setBusy(true);
    setData(null);
    try {
      const res = await fetch("/api/german/word-forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: w, model }),
      });
      const json = (await res.json()) as WordForms & { error?: string };
      if (!res.ok) throw new Error(json.error || "Phân tích thất bại");
      setData(json);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Phân tích thất bại");
    } finally {
      setBusy(false);
    }
  }

  const TYPE_LABEL = { regular: "thường", irregular: "bất quy tắc" } as const;
  const TYPE_COLOR = { regular: "#16a34a", irregular: "#f59e0b" } as const;

  const hasAny = data && (data.noun || data.verb || data.adjective);

  return (
    <section className="surface p-4">
      <div className="flex items-center gap-1.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
          <path d="M13 3l3.5 8L21 12l-4.5 1L13 21l-3.5-8L5 12l4.5-1z" />
        </svg>
        <p className="text-sm font-semibold tracking-tight">Word Forms · Biến thể từ</p>
      </div>
      <p className="mt-0.5 text-xs ink-muted">
        Nhập một từ tiếng Anh để xem biến thể danh từ / động từ / tính từ.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void analyze();
            }
          }}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          placeholder="vd: child, go, happy, run…"
          className="input"
        />
        <button
          type="button"
          onClick={analyze}
          disabled={busy || !word.trim()}
          className="btn-primary shrink-0"
        >
          {busy ? "Đang phân tích…" : "Phân tích"}
        </button>
      </div>

      {data ? (
        hasAny ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Từ <span className="font-semibold">{data.word}</span> có thể là:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.noun ? (
                <FormCard
                  label="Danh từ · Noun"
                  color="#0ea5e9"
                  badge={`Danh từ ${TYPE_LABEL[data.noun.type]}`}
                  badgeColor={TYPE_COLOR[data.noun.type]}
                  rows={[{ k: "Số nhiều", v: data.noun.plural }]}
                  note={data.noun.note}
                />
              ) : null}
              {data.verb ? (
                <FormCard
                  label="Động từ · Verb"
                  color="#ec4899"
                  badge={`Động từ ${TYPE_LABEL[data.verb.type]}`}
                  badgeColor={TYPE_COLOR[data.verb.type]}
                  rows={[
                    { k: "Cột 2 (V2)", v: data.verb.v2 },
                    { k: "Cột 3 (V3)", v: data.verb.v3 },
                  ]}
                  note={data.verb.note}
                />
              ) : null}
              {data.adjective ? (
                <FormCard
                  label="Tính từ · Adjective"
                  color="#f59e0b"
                  badge="So sánh"
                  badgeColor="#a855f7"
                  rows={[
                    { k: "So sánh hơn", v: data.adjective.comparative },
                    { k: "So sánh nhất", v: data.adjective.superlative },
                  ]}
                  note={data.adjective.note}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm ink-muted">
            {data.note ?? "Không tìm thấy biến thể cho từ này."}
          </p>
        )
      ) : null}
    </section>
  );
}

function FormCard({
  label,
  color,
  badge,
  badgeColor,
  rows,
  note,
}: {
  label: string;
  color: string;
  badge: string;
  badgeColor: string;
  rows: { k: string; v: string }[];
  note: string;
}) {
  return (
    <div className="rounded-md border-l-4 p-3" style={{ borderColor: color, background: "var(--canvas-soft)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight" style={{ color }}>
          {label}
        </p>
        <span
          className="rounded-capsule px-2 py-0.5 text-[10px] font-medium"
          style={{ background: `${badgeColor}1f`, color: badgeColor }}
        >
          {badge}
        </span>
      </div>
      <dl className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2">
            <dt className="text-xs ink-muted">{r.k}</dt>
            <dd className="text-sm font-medium">{r.v || "—"}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-2 text-xs ink-muted">{note}</p> : null}
    </div>
  );
}
