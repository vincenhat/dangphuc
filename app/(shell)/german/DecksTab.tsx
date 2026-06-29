"use client";

import { useMemo, useState } from "react";
import {
  type CefrLevel,
  CEFR_LEVELS,
  isValidCefr,
} from "@/lib/study";
import {
  type GermanArticle,
  type GermanCard,
  type GermanPos,
  GERMAN_ARTICLES,
  GERMAN_POS,
  isValidArticle,
  isValidPos,
  nounLabel,
} from "@/lib/german";
import { speakWord } from "./speak";

interface FormState {
  word: string;
  definition: string;
  example: string;
  translation: string;
  ipa: string;
  cefr: CefrLevel | "";
  pos: GermanPos | "";
  article: GermanArticle | "";
  plural: string;
  tags: string;
}

const EMPTY_FORM: FormState = {
  word: "",
  definition: "",
  example: "",
  translation: "",
  ipa: "",
  cefr: "",
  pos: "",
  article: "",
  plural: "",
  tags: "",
};

const POS_LABEL: Record<GermanPos, string> = {
  noun: "Substantiv · Danh từ",
  verb: "Verb · Động từ",
  adjective: "Adjektiv · Tính từ",
  adverb: "Adverb · Trạng từ",
  other: "Khác",
};

export default function DecksTab({
  initial,
  model,
  onChanged,
  onError,
}: {
  initial: GermanCard[];
  model: string | null;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [cards, setCards] = useState<GermanCard[]>(initial);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCefr, setFilterCefr] = useState<CefrLevel | "">("");
  type RecentFilter = "all" | "today" | "7d" | "30d";
  const [recent, setRecent] = useState<RecentFilter>("all");

  if (initial !== cards && cards === initial) {
    /* no-op */
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoffMs = recentCutoffMs(recent);
    const out = cards.filter((c) => {
      if (filterCefr && c.cefr !== filterCefr) return false;
      if (cutoffMs !== null) {
        const t = Date.parse(c.created_at);
        if (Number.isNaN(t) || t < cutoffMs) return false;
      }
      if (!q) return true;
      return (
        c.word.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q) ||
        c.translation.toLowerCase().includes(q) ||
        (c.plural ?? "").toLowerCase().includes(q) ||
        (c.tags ?? "").toLowerCase().includes(q)
      );
    });
    if (recent !== "all") {
      out.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return out;
  }, [cards, search, filterCefr, recent]);

  async function refreshLocal() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (filterCefr) params.set("cefr", filterCefr);
    const res = await fetch(`/api/german/cards?${params.toString()}`);
    const data = (await res.json()) as { cards?: GermanCard[] };
    setCards(data.cards ?? []);
  }

  async function generate() {
    const w = form.word.trim();
    if (!w) {
      onError("Nhập từ tiếng Đức trước đã.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/german/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: w, model }),
      });
      const data = (await res.json()) as {
        definition?: string;
        example?: string;
        translation?: string;
        ipa?: string;
        cefr?: string | null;
        pos?: string | null;
        article?: string | null;
        plural?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "AI thất bại");
      setForm((f) => ({
        ...f,
        definition: data.definition ?? f.definition,
        example: data.example ?? f.example,
        translation: data.translation ?? f.translation,
        ipa: data.ipa ?? f.ipa,
        cefr: isValidCefr(data.cefr) ? data.cefr : f.cefr,
        pos: isValidPos(data.pos) ? data.pos : f.pos,
        article: isValidArticle(data.article) ? data.article : f.article,
        plural: data.plural ?? f.plural,
      }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "AI thất bại");
    } finally {
      setGenerating(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const w = form.word.trim();
    if (!w) {
      onError("Bắt buộc nhập từ.");
      return;
    }
    setSaving(true);
    const payload = {
      word: w,
      definition: form.definition,
      example: form.example,
      translation: form.translation,
      ipa: form.ipa,
      cefr: form.cefr || null,
      pos: form.pos || null,
      article: form.pos === "noun" ? form.article || null : null,
      plural: form.pos === "noun" ? form.plural || null : null,
      tags: form.tags || null,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/german/cards/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Lưu thất bại");
        }
      } else {
        const res = await fetch("/api/german/cards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Lưu thất bại");
        }
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await onChanged();
      await refreshLocal();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: GermanCard) {
    setEditingId(c.id);
    setForm({
      word: c.word,
      definition: c.definition,
      example: c.example,
      translation: c.translation,
      ipa: c.ipa,
      cefr: c.cefr ?? "",
      pos: c.pos ?? "",
      article: c.article ?? "",
      plural: c.plural ?? "",
      tags: c.tags ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(c: GermanCard) {
    if (!window.confirm(`Xoá "${nounLabel(c)}"?`)) return;
    setCards((prev) => prev.filter((x) => x.id !== c.id));
    if (editingId === c.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    await fetch(`/api/german/cards/${encodeURIComponent(c.id)}`, { method: "DELETE" });
    await onChanged();
  }

  const isNoun = form.pos === "noun";

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
      {/* Form */}
      <form onSubmit={save} className="surface space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold tracking-tight">
            {editingId ? "Sửa thẻ" : "Thẻ mới · Neue Karte"}
          </h3>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="text-xs ink-muted hover:text-[var(--ink)]"
            >
              Huỷ
            </button>
          ) : null}
        </div>

        <Field label="Từ · Wort">
          <div className="flex gap-2">
            <input
              required
              maxLength={80}
              value={form.word}
              onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
              placeholder="vd. Hund, lernen, schnell"
              className="input"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={generate}
              disabled={generating || !form.word.trim()}
              className="btn-ghost shrink-0 text-xs"
              title="AI điền tự động"
            >
              {generating ? "…" : "AI ↗"}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Từ loại · Wortart">
            <select
              value={form.pos}
              onChange={(e) =>
                setForm((f) => ({ ...f, pos: e.target.value as GermanPos | "" }))
              }
              className="input"
            >
              <option value="">—</option>
              {GERMAN_POS.map((p) => (
                <option key={p} value={p}>
                  {POS_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mức · CEFR">
            <select
              value={form.cefr}
              onChange={(e) =>
                setForm((f) => ({ ...f, cefr: e.target.value as CefrLevel | "" }))
              }
              className="input"
            >
              <option value="">—</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {isNoun ? (
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label="Mạo từ · Artikel">
              <select
                value={form.article}
                onChange={(e) =>
                  setForm((f) => ({ ...f, article: e.target.value as GermanArticle | "" }))
                }
                className="input"
              >
                <option value="">—</option>
                {GERMAN_ARTICLES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số nhiều · Plural">
              <input
                maxLength={120}
                value={form.plural}
                onChange={(e) => setForm((f) => ({ ...f, plural: e.target.value }))}
                placeholder="vd. Hunde"
                className="input"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </div>
        ) : null}

        <Field label="Định nghĩa (Tiếng Anh)">
          <textarea
            value={form.definition}
            onChange={(e) =>
              setForm((f) => ({ ...f, definition: e.target.value }))
            }
            className="input min-h-[60px] resize-y"
            placeholder="Định nghĩa ngắn gọn."
          />
        </Field>

        <Field label="Ví dụ · Beispiel">
          <input
            value={form.example}
            onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
            className="input"
            placeholder="Câu tiếng Đức dùng từ này."
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tiếng Việt">
            <input
              value={form.translation}
              onChange={(e) =>
                setForm((f) => ({ ...f, translation: e.target.value }))
              }
              className="input"
              placeholder="bản dịch"
            />
          </Field>
          <Field label="IPA">
            <input
              value={form.ipa}
              onChange={(e) => setForm((f) => ({ ...f, ipa: e.target.value }))}
              className="input"
              placeholder="/ˈhʊnt/"
            />
          </Field>
        </div>

        <Field label="Thẻ phân loại · Tags">
          <input
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="input"
            placeholder="A1, Tiere, Familie"
          />
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Thêm thẻ"}
        </button>
      </form>

      {/* List */}
      <section className="surface">
        <header className="flex flex-wrap items-center gap-2 border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Bộ thẻ của bạn</p>
          <p className="text-xs ink-muted">{filtered.length}</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm…"
              className="input !w-44 !py-1.5 !text-xs"
            />
            <select
              value={filterCefr}
              onChange={(e) => setFilterCefr(e.target.value as CefrLevel | "")}
              className="input !w-auto !py-1.5 !text-xs"
              aria-label="Lọc theo CEFR"
            >
              <option value="">Tất cả mức</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={recent}
              onChange={(e) => setRecent(e.target.value as RecentFilter)}
              className="input !w-auto !py-1.5 !text-xs"
              aria-label="Lọc theo ngày thêm"
            >
              <option value="all">Bất kỳ lúc nào</option>
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
            </select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm ink-muted">
            Chưa có thẻ nào khớp. Thêm thẻ ở form bên trái.
          </p>
        ) : (
          <ul
            className="max-h-[70vh] divide-y overflow-y-auto"
            style={{ borderColor: "var(--border-soft)" }}
          >
            {filtered.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="text-base font-medium"
                  >
                    {nounLabel(c)}
                  </button>
                  {c.ipa ? <span className="text-xs ink-muted">{c.ipa}</span> : null}
                  {c.cefr ? (
                    <span
                      className="rounded-capsule px-2 py-0.5 text-[10px]"
                      style={{
                        background: "rgba(236,72,153,0.12)",
                        color: "var(--accent)",
                      }}
                    >
                      {c.cefr}
                    </span>
                  ) : null}
                  {c.pos ? (
                    <span className="text-[10px] uppercase tracking-wider ink-muted">
                      {c.pos}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => speakWord(c.word)}
                    aria-label={`Phát âm ${c.word}`}
                    className="ink-muted hover:text-[var(--ink)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
                      <path d="M16 9a4 4 0 0 1 0 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    aria-label="Xoá thẻ"
                    className="ml-auto ink-muted hover:text-[var(--ink)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                    </svg>
                  </button>
                </div>
                {c.translation ? (
                  <p className="mt-1 text-sm" style={{ color: "var(--accent-link)" }}>
                    VI · {c.translation}
                  </p>
                ) : null}
                {c.definition ? (
                  <p className="mt-0.5 text-sm">{c.definition}</p>
                ) : null}
                {c.example ? (
                  <p
                    className="mt-1 text-sm italic"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    „{c.example}“
                  </p>
                ) : null}
                <p className="mt-1 text-xs ink-muted">
                  Đến hạn {c.due_date}
                  {c.repetitions > 0
                    ? ` · đã ôn ${c.repetitions} lần`
                    : " · mới"}
                  {c.tags ? ` · ${c.tags}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function recentCutoffMs(preset: "all" | "today" | "7d" | "30d"): number | null {
  if (preset === "all") return null;
  const now = new Date();
  if (preset === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  const days = preset === "7d" ? 7 : 30;
  return now.getTime() - days * 86_400_000;
}
