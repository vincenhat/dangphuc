"use client";

import { useState } from "react";
import type { WritingEntry, WritingIssue, WritingUpgrade } from "@/lib/study";
import { formatDate } from "@/lib/format";
import {
  buildAdjectiveWeak,
  buildNounCases,
  GENUS_LABEL,
  KASUS_LABEL,
  VERB_PRONOUNS,
  type GermanArticle,
  type Genus,
  type Kasus,
} from "@/lib/german";

interface ApiResult {
  id: string;
  corrected: string;
  issues: WritingIssue[];
  upgrades: WritingUpgrade[];
}

interface NounForm {
  article: GermanArticle;
  plural: string;
  genitive_singular: string;
  note: string;
}
interface VerbPersonForms {
  ich: string;
  du: string;
  er: string;
  wir: string;
  ihr: string;
  sie: string;
}
interface VerbForm {
  praesens: VerbPersonForms;
  praeteritum: VerbPersonForms;
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

const KASUS_ORDER: readonly Kasus[] = ["nom", "akk", "dat", "gen"];
const GENUS_ORDER: readonly Genus[] = ["m", "f", "n", "pl"];

const ARTICLE_COLOR: Record<GermanArticle, string> = {
  der: "#0ea5e9",
  die: "#ec4899",
  das: "#16a34a",
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
 * Word Forms engine. Nhập một từ tiếng Đức → AI phân tích từ loại và trả về
 * thông tin cốt lõi, sau đó component dựng bảng chia hoàn chỉnh:
 *   - Substantiv: bảng 4 cách × Singular/Plural (8 ô)
 *   - Verb: Präsens 6 ngôi + Präteritum 6 ngôi + Partizip II + haben/sein
 *   - Adjektiv: bảng schwache Deklination 4 cách × 4 giống (16 ô)
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
        Nhập một từ. Danh từ → bảng 4 Kasus × Singular/Plural. Tính từ →
        schwache Deklination 4 × 4 (mit bestimmtem Artikel). Động từ → Präsens
        & Präteritum đầy đủ 6 ngôi + Partizip II + haben/sein.
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
          placeholder="vd. Hund, gehen, schnell, schön…"
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
          <div className="mt-4 space-y-5">
            <p className="text-sm">
              Từ <span className="font-semibold">{data.word}</span> có thể là:
            </p>

            {data.noun ? <NounTable word={data.word} noun={data.noun} /> : null}
            {data.verb ? <VerbTables word={data.word} verb={data.verb} /> : null}
            {data.adjective ? (
              <AdjectiveTable word={data.word} adj={data.adjective} />
            ) : null}
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

// ─────────────────────────────────────────────── Substantiv table ──

function NounTable({ word, noun }: { word: string; noun: NounForm }) {
  const color = ARTICLE_COLOR[noun.article];
  const cases = buildNounCases(
    word,
    noun.article,
    noun.plural,
    noun.genitive_singular,
  );

  return (
    <div
      className="rounded-md border-l-4 p-3"
      style={{ borderColor: color, background: "var(--canvas-soft)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight" style={{ color }}>
          Substantiv · Danh từ
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill text={noun.article} color={color} />
          <Pill
            text={`Plural: die ${noun.plural || "—"}`}
            color="#6366f1"
          />
          {noun.genitive_singular ? (
            <Pill text={`Gen Sg: ${noun.genitive_singular}`} color="#a855f7" />
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs ink-muted">
        Chia 4 cách × số ít/số nhiều. Lưu ý: Dativ Plural luôn thêm -n
        (trừ khi đã có sẵn -n/-s).
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1.5 pr-3 text-xs font-medium uppercase tracking-wider ink-muted">
                Kasus
              </th>
              <th className="py-1.5 pr-3 text-xs font-medium uppercase tracking-wider ink-muted">
                Singular
              </th>
              <th className="py-1.5 text-xs font-medium uppercase tracking-wider ink-muted">
                Plural
              </th>
            </tr>
          </thead>
          <tbody>
            {KASUS_ORDER.map((k) => (
              <tr key={k} className="border-t hairline">
                <td
                  className="py-1.5 pr-3 text-xs font-medium"
                  style={{ color }}
                >
                  {KASUS_LABEL[k]}
                </td>
                <td className="py-1.5 pr-3 font-medium">{cases.sg[k]}</td>
                <td className="py-1.5 font-medium" style={{ color: "var(--accent-link)" }}>
                  {cases.pl[k]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {noun.note ? <p className="mt-2 text-xs ink-muted">{noun.note}</p> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────── Verb tables ──

function VerbTables({ word, verb }: { word: string; verb: VerbForm }) {
  const color = "#ec4899";
  const typeLabel = verb.type === "irregular" ? "bất quy tắc" : "thường";
  const typeColor = verb.type === "irregular" ? "#f59e0b" : "#16a34a";

  return (
    <div
      className="rounded-md border-l-4 p-3"
      style={{ borderColor: color, background: "var(--canvas-soft)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight" style={{ color }}>
          Verb · Động từ ({word})
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill text={typeLabel} color={typeColor} />
          <Pill
            text={`Perfekt mit ${verb.perfekt_aux}`}
            color={verb.perfekt_aux === "sein" ? "#0ea5e9" : "#a855f7"}
          />
          {verb.partizip2 ? (
            <Pill text={`Partizip II: ${verb.partizip2}`} color="#16a34a" />
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ConjugationTable title="Präsens · Hiện tại" forms={verb.praesens} color={color} />
        <ConjugationTable
          title="Präteritum · Quá khứ"
          forms={verb.praeteritum}
          color={color}
        />
      </div>

      {verb.note ? <p className="mt-2 text-xs ink-muted">{verb.note}</p> : null}
    </div>
  );
}

function ConjugationTable({
  title,
  forms,
  color,
}: {
  title: string;
  forms: VerbPersonForms;
  color: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {title}
      </p>
      <table className="w-full text-sm">
        <tbody>
          {VERB_PRONOUNS.map(({ key, label }) => (
            <tr key={key} className="border-t hairline">
              <td className="w-28 py-1 pr-3 text-xs ink-muted">{label}</td>
              <td className="py-1 font-medium">{forms[key] || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────── Adjective table ──

function AdjectiveTable({ word, adj }: { word: string; adj: AdjForm }) {
  const color = "#f59e0b";
  const decl = buildAdjectiveWeak(word);

  return (
    <div
      className="rounded-md border-l-4 p-3"
      style={{ borderColor: color, background: "var(--canvas-soft)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight" style={{ color }}>
          Adjektiv · Tính từ
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill text={`Komp: ${adj.comparative || "—"}`} color="#a855f7" />
          <Pill text={`Sup: ${adj.superlative || "—"}`} color="#0ea5e9" />
        </div>
      </div>

      <p className="mt-2 text-xs ink-muted">
        Schwache Deklination (với bestimmter Artikel der/die/das). Chỉ Nominativ
        (mọi giống) và Akkusativ (Fem/Neut) thêm -e; còn lại thêm -en.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1.5 pr-3 text-xs font-medium uppercase tracking-wider ink-muted">
                Kasus
              </th>
              {GENUS_ORDER.map((g) => (
                <th
                  key={g}
                  className="py-1.5 pr-3 text-xs font-medium uppercase tracking-wider ink-muted"
                >
                  {GENUS_LABEL[g]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KASUS_ORDER.map((k) => (
              <tr key={k} className="border-t hairline">
                <td className="py-1.5 pr-3 text-xs font-medium" style={{ color }}>
                  {KASUS_LABEL[k]}
                </td>
                {GENUS_ORDER.map((g) => (
                  <td
                    key={g}
                    className="py-1.5 pr-3 font-medium"
                    style={{ color: g === "pl" ? "var(--accent-link)" : undefined }}
                  >
                    {decl[k][g]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adj.note ? <p className="mt-2 text-xs ink-muted">{adj.note}</p> : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────── Pill ──

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="rounded-capsule px-2 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}1f`, color }}
    >
      {text}
    </span>
  );
}
