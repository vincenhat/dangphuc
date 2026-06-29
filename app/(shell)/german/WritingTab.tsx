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

interface NounForm {
  article: "der" | "die" | "das";
  plural: string;
  genitive_singular: string;
  note: string;
}
interface VerbForm {
  ich: string;
  du: string;
  er: string;
  praeteritum: string;
  partizip2: string;
  perfekt_aux: "haben" | "sein";
  type: "regular" | "irregular";
  note: string;
}
interface AdjForm {
  comparative: string;
  superlative: string;
  note: string;
}
interface WordForms {
  word: string;
  noun: NounForm | null;
  verb: VerbForm | null;
  adjective: AdjForm | null;
  note?: string;
}

const ISSUE_TONE: Record<WritingIssue["type"], string> = {
  grammar: "#ef4444",
  spelling: "#f59e0b",
  punctuation: "#0ea5e9",
  style: "#a855f7",
};

const ISSUE_LABEL: Record<WritingIssue["type"], string> = {
  grammar: "Ngữ pháp",
  spelling: "Chính tả",
  punctuation: "Dấu câu",
  style: "Văn phong",
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
      if (!res.ok) throw new Error(data.error || "Kiểm tra thất bại");
      setResult({
        id: data.id ?? "",
        corrected: data.corrected ?? "",
        issues: data.issues ?? [],
        upgrades: data.upgrades ?? [],
      });
      const hres = await fetch("/api/german/writing");
      const hdata = (await hres.json()) as { entries?: WritingEntry[] };
      setHistory(hdata.entries ?? []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Kiểm tra thất bại");
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
    if (!window.confirm("Xoá bài viết này?")) return;
    setHistory((prev) => prev.filter((x) => x.id !== id));
    if (result?.id === id) setResult(null);
    await fetch(`/api/german/writing?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <WordFormsEngine model={model} onError={onError} />

        <div className="surface p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] ink-muted">
            Bài viết của bạn · Dein Text
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán đoạn văn tiếng Đức (tối đa ~4000 ký tự). Thử viết về ngày của bạn, bộ phim, hay kế hoạch cuối tuần."
            maxLength={4000}
            className="input min-h-[180px] resize-y"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs ink-muted">{text.length} / 4000 ký tự</p>
            <button
              type="button"
              onClick={check}
              disabled={busy || !text.trim()}
              className="btn-primary"
            >
              {busy ? "Đang kiểm tra…" : "Kiểm tra bài viết"}
            </button>
          </div>
        </div>

        {result ? (
          <>
            <section className="surface p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] ink-muted">
                Bản sửa · Korrigierte Version
              </p>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {result.corrected || (
                  <span className="ink-muted">Không cần sửa, bài đã ổn.</span>
                )}
              </p>
            </section>

            <section className="surface">
              <header className="border-b hairline px-4 py-3">
                <p className="text-sm font-semibold tracking-tight">
                  Lỗi tìm thấy ({result.issues.length})
                </p>
              </header>
              {result.issues.length === 0 ? (
                <p className="px-4 py-6 text-sm ink-muted">Không có lỗi nào.</p>
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
                          {ISSUE_LABEL[i.type]}
                        </span>
                        <span
                          className="text-sm line-through"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          {i.original}
                        </span>
                        <span className="text-sm">→</span>
                        <span className="text-sm font-medium">{i.suggestion}</span>
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
                  Gợi ý từ vựng nâng cao ({result.upgrades.length})
                </p>
                <p className="mt-0.5 text-xs ink-muted">
                  Từ mạnh hơn nhưng vẫn tự nhiên.
                </p>
              </header>
              {result.upgrades.length === 0 ? (
                <p className="px-4 py-6 text-sm ink-muted">
                  Không có gợi ý nâng cao — từ bạn dùng đã ổn.
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

      <aside className="surface flex h-fit flex-col">
        <header className="border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Gần đây</p>
          <p className="mt-0.5 text-xs ink-muted">50 bài gần nhất</p>
        </header>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-sm ink-muted">
            Bài viết đã chấm sẽ hiện ở đây.
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
                  <p className="mt-0.5 text-xs ink-muted">{formatDate(e.created_at)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Xoá bài"
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
 * Word Forms cho tiếng Đức: nhập một từ → sinh biến thể đầy đủ.
 * - Substantiv: der/die/das, Plural, Genitiv Singular
 * - Verb: chia 3 ngôi Präsens, Präteritum, Partizip II, haben/sein
 * - Adjektiv: Komparativ, Superlativ
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

  const hasAny = data && (data.noun || data.verb || data.adjective);

  return (
    <section className="surface p-4">
      <div className="flex items-center gap-1.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
          <path d="M13 3l3.5 8L21 12l-4.5 1L13 21l-3.5-8L5 12l4.5-1z" />
        </svg>
        <p className="text-sm font-semibold tracking-tight">
          Word Forms · Biến thể từ tiếng Đức
        </p>
      </div>
      <p className="mt-0.5 text-xs ink-muted">
        Nhập một từ để xem mạo từ, số nhiều, chia động từ (Präsens / Präteritum /
        Partizip II), so sánh tính từ.
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
          placeholder="vd. Hund, gehen, schnell…"
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
                  label="Substantiv · Danh từ"
                  color="#0ea5e9"
                  badge={data.noun.article}
                  badgeColor={
                    data.noun.article === "der"
                      ? "#0ea5e9"
                      : data.noun.article === "die"
                        ? "#ec4899"
                        : "#16a34a"
                  }
                  rows={[
                    { k: "Nominativ Sg.", v: `${data.noun.article} ${data.word}` },
                    { k: "Plural (die)", v: data.noun.plural || "—" },
                    { k: "Genitiv Sg.", v: data.noun.genitive_singular || "—" },
                  ]}
                  note={data.noun.note}
                />
              ) : null}
              {data.verb ? (
                <FormCard
                  label="Verb · Động từ"
                  color="#ec4899"
                  badge={data.verb.type === "irregular" ? "bất quy tắc" : "thường"}
                  badgeColor={data.verb.type === "irregular" ? "#f59e0b" : "#16a34a"}
                  rows={[
                    { k: "ich", v: data.verb.ich },
                    { k: "du", v: data.verb.du },
                    { k: "er / sie / es", v: data.verb.er },
                    { k: "Präteritum (er)", v: data.verb.praeteritum },
                    { k: "Partizip II", v: data.verb.partizip2 },
                    {
                      k: "Perfekt mit",
                      v: data.verb.perfekt_aux === "sein" ? "sein" : "haben",
                    },
                  ]}
                  note={data.verb.note}
                />
              ) : null}
              {data.adjective ? (
                <FormCard
                  label="Adjektiv · Tính từ"
                  color="#f59e0b"
                  badge="So sánh"
                  badgeColor="#a855f7"
                  rows={[
                    { k: "Komparativ", v: data.adjective.comparative },
                    { k: "Superlativ", v: data.adjective.superlative },
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
    <div
      className="rounded-md border-l-4 p-3"
      style={{ borderColor: color, background: "var(--canvas-soft)" }}
    >
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
