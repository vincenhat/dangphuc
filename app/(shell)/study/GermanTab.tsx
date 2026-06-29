"use client";

/**
 * German vocabulary tab.
 *
 * One tab, two sub-views toggled by a pill switch:
 *   • Review — SRS queue of cards due today, same SM-2 grading buttons as the
 *     English Review tab.
 *   • Decks  — add / edit / delete cards, AI fill, search, level filter.
 *
 * Data lives in the `german_cards` Firestore collection via /api/german/*.
 * The view is fully client-rendered (no SSR) so we don't grow the initial
 * payload for users who never open it.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CEFR_LEVELS,
  type CefrLevel,
  type Grade,
  formatInterval,
  isValidCefr,
} from "@/lib/study";
import {
  type GermanArticle,
  type GermanCard,
  type GermanPos,
  GERMAN_ARTICLES,
  GERMAN_POS,
  nounLabel,
} from "@/lib/german";
import { usePersistentState } from "@/lib/use-persistent-state";

type SubTab = "review" | "decks";

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

const GRADE_BUTTONS: { grade: Grade; label: string; bg: string }[] = [
  { grade: "again", label: "Again", bg: "#ef4444" },
  { grade: "hard", label: "Hard", bg: "#f59e0b" },
  { grade: "good", label: "Good", bg: "#16a34a" },
  { grade: "easy", label: "Easy", bg: "var(--accent)" },
];

const POS_LABEL: Record<GermanPos, string> = {
  noun: "Danh từ · Substantiv",
  verb: "Động từ · Verb",
  adjective: "Tính từ · Adjektiv",
  adverb: "Trạng từ · Adverb",
  other: "Khác",
};

/** Try to speak a German word using the browser's SpeechSynthesis API. */
function speakDe(word: string): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "de-DE";
  u.rate = 0.9;
  const voices = synth.getVoices();
  const de = voices.find((v) => v.lang?.toLowerCase().startsWith("de"));
  if (de) u.voice = de;
  synth.speak(u);
}

export default function GermanTab({
  model,
  onError,
}: {
  model: string | null;
  onError: (msg: string) => void;
}) {
  const [sub, setSub] = usePersistentState<SubTab>("pt_german_sub", "review");

  const [cards, setCards] = useState<GermanCard[]>([]);
  const [due, setDue] = useState<GermanCard[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, dueRes] = await Promise.all([
        fetch("/api/german/cards", { cache: "no-store" }),
        fetch("/api/german/cards?due=1", { cache: "no-store" }),
      ]);
      const allData = (await allRes.json()) as { cards?: GermanCard[]; today?: string };
      const dueData = (await dueRes.json()) as { cards?: GermanCard[] };
      setCards(allData.cards ?? []);
      setDue(dueData.cards ?? []);
      if (allData.today) setToday(allData.today);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Reload failed");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      {/* Sub-tab pill switch */}
      <div className="surface flex items-center justify-between gap-2 p-2">
        <div className="flex gap-1.5">
          {(["review", "decks"] as const).map((s) => {
            const active = sub === s;
            const count =
              s === "review" ? due.length : s === "decks" ? cards.length : 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSub(s)}
                className="flex items-center gap-1.5 rounded-capsule px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: active ? "var(--accent)" : "var(--canvas-soft)",
                  color: active ? "#fff" : "var(--ink)",
                }}
              >
                <span>{s === "review" ? "Review" : "Decks"}</span>
                {count > 0 ? (
                  <span
                    className="rounded-capsule px-1.5 py-0.5 text-[10px]"
                    style={{
                      background: active ? "rgba(255,255,255,0.22)" : "var(--canvas)",
                      color: active ? "#fff" : "var(--ink-muted)",
                    }}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-xs ink-muted">{today || "…"}</p>
      </div>

      {loading && cards.length === 0 ? (
        <div className="surface p-10 text-center text-sm ink-muted">Đang tải…</div>
      ) : sub === "review" ? (
        <Review queue={due} onChanged={refresh} onError={onError} />
      ) : (
        <Decks
          cards={cards}
          model={model}
          onChanged={refresh}
          onError={onError}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────── Review view ──

function Review({
  queue,
  onChanged,
  onError,
}: {
  queue: GermanCard[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [local, setLocal] = useState<GermanCard[]>(queue);
  const [revealed, setRevealed] = useState(false);
  const [doneToday, setDoneToday] = useState(0);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  // Re-seed when the parent reloads.
  useEffect(() => {
    setLocal(queue);
    setRevealed(false);
    setDoneToday(0);
    setLastInterval(null);
  }, [queue]);

  const card = local[0] ?? null;

  const grade = useCallback(
    async (g: Grade) => {
      if (!card) return;
      try {
        const res = await fetch("/api/german/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: card.id, grade: g }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          nextInterval?: number;
          error?: string;
        };
        if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
        setLastInterval(data.nextInterval ?? null);
        setLocal((prev) => prev.slice(1));
        setRevealed(false);
        setDoneToday((n) => n + 1);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [card, onError],
  );

  // Keyboard: Space/Enter to reveal then 1-4 to grade.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (!revealed) return;
      if (e.key === "1") grade("again");
      else if (e.key === "2") grade("hard");
      else if (e.key === "3") grade("good");
      else if (e.key === "4") grade("easy");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, grade]);

  if (!card) {
    return (
      <div className="surface p-10 text-center">
        <h3 className="text-lg font-semibold tracking-tight">Hết bài hôm nay</h3>
        <p className="mt-2 ink-muted">
          {doneToday > 0
            ? `Bạn đã ôn ${doneToday} thẻ. Hẹn lại ngày mai.`
            : "Chưa có thẻ đến hạn. Thêm từ ở tab Decks, hoặc đợi đến ngày mai."}
        </p>
        <button
          type="button"
          onClick={() => onChanged()}
          className="btn-ghost mt-4 text-xs"
        >
          Reload
        </button>
      </div>
    );
  }

  // The displayed "front" of the card. For nouns we include the article so
  // memorising der/die/das is part of the recall, not extra credit.
  const front =
    card.pos === "noun" && card.article ? `${card.article} ${card.word}` : card.word;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <p className="text-sm ink-muted">
          {local.length} due · {doneToday} done today
        </p>
        {lastInterval !== null ? (
          <p className="text-xs ink-muted">
            Thẻ vừa rồi: lịch lại sau {formatInterval(lastInterval)}.
          </p>
        ) : null}
      </div>

      <article className="surface p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-3xl font-semibold tracking-tight">{front}</h3>
          {card.cefr ? (
            <span
              className="rounded-capsule px-2.5 py-0.5 text-xs"
              style={{
                background: "rgba(236,72,153,0.12)",
                color: "var(--accent)",
              }}
            >
              {card.cefr}
            </span>
          ) : null}
          {card.pos ? (
            <span className="text-xs ink-muted">{POS_LABEL[card.pos]}</span>
          ) : null}
          {card.ipa ? <p className="text-sm ink-muted">{card.ipa}</p> : null}
          <button
            type="button"
            onClick={() => speakDe(card.word)}
            className="btn-ghost ml-auto !px-2 text-xs"
            aria-label={`Phát âm ${card.word}`}
            title="Nghe phát âm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
              <path d="M19 6a8 8 0 0 1 0 12" />
            </svg>
          </button>
        </div>

        <div
          className={`mt-6 transition-opacity ${revealed ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!revealed}
        >
          {card.pos === "noun" && card.plural ? (
            <p className="text-sm" style={{ color: "var(--accent-link)" }}>
              Số nhiều: die {card.plural}
            </p>
          ) : null}
          {card.translation ? (
            <p className="mt-1 text-base font-medium" style={{ color: "var(--accent-link)" }}>
              {card.translation}
            </p>
          ) : null}
          {card.definition ? (
            <p className="mt-2 text-base leading-relaxed">{card.definition}</p>
          ) : null}
          {card.example ? (
            <p
              className="mt-3 text-base italic"
              style={{ color: "var(--ink-muted)" }}
            >
              „{card.example}“
            </p>
          ) : null}
          {card.tags ? (
            <p className="mt-3 text-xs ink-muted">{card.tags}</p>
          ) : null}
        </div>
      </article>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="btn-primary w-full"
        >
          Show answer · Space
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map((g, i) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => grade(g.grade)}
              className="rounded-md px-3 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: g.bg }}
            >
              <span className="block">{g.label}</span>
              <span className="block text-[10px] opacity-80">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Decks view ──

function Decks({
  cards,
  model,
  onChanged,
  onError,
}: {
  cards: GermanCard[];
  model: string | null;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCefr, setFilterCefr] = useState<CefrLevel | "">("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (filterCefr && c.cefr !== filterCefr) return false;
      if (!q) return true;
      return (
        c.word.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q) ||
        c.translation.toLowerCase().includes(q) ||
        (c.plural ?? "").toLowerCase().includes(q) ||
        (c.tags ?? "").toLowerCase().includes(q)
      );
    });
  }, [cards, search, filterCefr]);

  async function aiFill() {
    const w = form.word.trim();
    if (!w) {
      onError("Nhập từ trước đã.");
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
      if (!res.ok) throw new Error(data.error || "AI failed");
      setForm((f) => ({
        ...f,
        definition: data.definition ?? f.definition,
        example: data.example ?? f.example,
        translation: data.translation ?? f.translation,
        ipa: data.ipa ?? f.ipa,
        cefr: isValidCefr(data.cefr) ? data.cefr : f.cefr,
        pos:
          typeof data.pos === "string" &&
          (GERMAN_POS as readonly string[]).includes(data.pos)
            ? (data.pos as GermanPos)
            : f.pos,
        article:
          typeof data.article === "string" &&
          (GERMAN_ARTICLES as readonly string[]).includes(data.article)
            ? (data.article as GermanArticle)
            : f.article,
        plural: data.plural ?? f.plural,
      }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "AI failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const w = form.word.trim();
    if (!w) {
      onError("Word là bắt buộc.");
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
      const res = editingId
        ? await fetch(`/api/german/cards/${encodeURIComponent(editingId)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/german/cards", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Save failed");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
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
    if (!window.confirm(`Xoá "${c.word}"?`)) return;
    if (editingId === c.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    await fetch(`/api/german/cards/${encodeURIComponent(c.id)}`, {
      method: "DELETE",
    }).catch(() => {});
    await onChanged();
  }

  const isNoun = form.pos === "noun";

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
      {/* Form */}
      <form onSubmit={save} className="surface space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold tracking-tight">
            {editingId ? "Sửa thẻ" : "Thẻ mới (DE)"}
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

        <Field label="Từ tiếng Đức">
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
              onClick={aiFill}
              disabled={generating || !form.word.trim()}
              className="btn-ghost shrink-0 text-xs"
              title="AI điền tự động"
            >
              {generating ? "…" : "AI ↗"}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Từ loại · POS">
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
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="CEFR">
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
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Article">
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

        <Field label="Definition (English)">
          <textarea
            value={form.definition}
            onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))}
            className="input min-h-[60px] resize-y"
            placeholder="A short, simple definition."
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

        <Field label="Tags">
          <input
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="input"
            placeholder="A1, animals, family"
          />
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Thêm thẻ"}
        </button>
      </form>

      {/* List */}
      <section className="surface">
        <header className="flex flex-wrap items-center gap-2 border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Deck tiếng Đức</p>
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
              <option value="">Tất cả level</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm ink-muted">
            Chưa có thẻ nào. Thêm từ ở form bên trái.
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
                    <span className="text-[10px] ink-muted uppercase tracking-wider">
                      {c.pos}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => speakDe(c.word)}
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
                  Due {c.due_date}
                  {c.repetitions > 0
                    ? ` · ${c.repetitions} review${c.repetitions === 1 ? "" : "s"}`
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
