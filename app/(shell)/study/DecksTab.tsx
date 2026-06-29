"use client";

import { useMemo, useState } from "react";
import {
  type CefrLevel,
  type StudyCard,
  CEFR_LEVELS,
  isValidCefr,
} from "@/lib/study";
import { speakWord } from "./speak";

interface FormState {
  word: string;
  definition: string;
  example: string;
  translation: string;
  ipa: string;
  cefr: CefrLevel | "";
  tags: string;
}

const EMPTY_FORM: FormState = {
  word: "",
  definition: "",
  example: "",
  translation: "",
  ipa: "",
  cefr: "",
  tags: "",
};

export default function DecksTab({
  initial,
  model,
  onChanged,
  onError,
}: {
  initial: StudyCard[];
  model: string | null;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [cards, setCards] = useState<StudyCard[]>(initial);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCefr, setFilterCefr] = useState<CefrLevel | "">("");
  // "Recently added" filter — narrows + sorts the list by created_at DESC.
  type RecentFilter = "all" | "today" | "7d" | "30d";
  const [recent, setRecent] = useState<RecentFilter>("all");

  // Update local state when parent reloads.
  if (initial !== cards && cards === initial) {
    /* no-op; React handles via initial prop */
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
        (c.tags ?? "").toLowerCase().includes(q)
      );
    });
    // When the user is asking for "recently added" anything, surface newest
    // first. Otherwise keep the existing due-date order from the API.
    if (recent !== "all") {
      out.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return out;
  }, [cards, search, filterCefr, recent]);

  async function refreshLocal() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (filterCefr) params.set("cefr", filterCefr);
    const res = await fetch(`/api/study/cards?${params.toString()}`);
    const data = (await res.json()) as { cards?: StudyCard[] };
    setCards(data.cards ?? []);
  }

  async function generate() {
    const w = form.word.trim();
    if (!w) {
      onError("Type a word first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/study/generate", {
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
      onError("Word is required.");
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
      tags: form.tags || null,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/study/cards/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Save failed");
        }
      } else {
        const res = await fetch("/api/study/cards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Save failed");
        }
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await onChanged();
      await refreshLocal();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: StudyCard) {
    setEditingId(c.id);
    setForm({
      word: c.word,
      definition: c.definition,
      example: c.example,
      translation: c.translation,
      ipa: c.ipa,
      cefr: c.cefr ?? "",
      tags: c.tags ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(c: StudyCard) {
    if (!window.confirm(`Delete "${c.word}"?`)) return;
    setCards((prev) => prev.filter((x) => x.id !== c.id));
    if (editingId === c.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    await fetch(`/api/study/cards/${encodeURIComponent(c.id)}`, {
      method: "DELETE",
    });
    await onChanged();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
      {/* Form */}
      <form onSubmit={save} className="surface space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold tracking-tight">
            {editingId ? "Edit card" : "New card"}
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
              Cancel
            </button>
          ) : null}
        </div>

        <Field label="Word">
          <div className="flex gap-2">
            <input
              required
              maxLength={80}
              value={form.word}
              onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
              placeholder="e.g. ephemeral"
              className="input"
            />
            <button
              type="button"
              onClick={generate}
              disabled={generating || !form.word.trim()}
              className="btn-ghost shrink-0 text-xs"
              title="Fill with Gemini"
            >
              {generating ? "…" : "AI ↗"}
            </button>
          </div>
        </Field>

        <Field label="Definition">
          <textarea
            value={form.definition}
            onChange={(e) =>
              setForm((f) => ({ ...f, definition: e.target.value }))
            }
            className="input min-h-[60px] resize-y"
            placeholder="A short, simple definition."
          />
        </Field>

        <Field label="Example sentence">
          <input
            value={form.example}
            onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
            className="input"
            placeholder="The word in a complete sentence."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vietnamese">
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
              placeholder="/ɪˈfɛmərəl/"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CEFR level">
            <select
              value={form.cefr}
              onChange={(e) =>
                setForm((f) => ({ ...f, cefr: e.target.value as CefrLevel | "" }))
              }
              className="input"
            >
              <option value="">Unset</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags">
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="input"
              placeholder="business, idioms"
            />
          </Field>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : editingId ? "Save changes" : "Add card"}
        </button>
      </form>

      {/* List */}
      <section className="surface">
        <header className="flex flex-wrap items-center gap-2 border-b hairline px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Your cards</p>
          <p className="text-xs ink-muted">{filtered.length}</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="input !w-44 !py-1.5 !text-xs"
            />
            <select
              value={filterCefr}
              onChange={(e) => setFilterCefr(e.target.value as CefrLevel | "")}
              className="input !w-auto !py-1.5 !text-xs"
              aria-label="Filter by CEFR level"
            >
              <option value="">All levels</option>
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
              aria-label="Filter by date added"
            >
              <option value="all">Any time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm ink-muted">
            No cards match your filter.
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
                    {c.word}
                  </button>
                  {c.ipa ? (
                    <span className="text-xs ink-muted">{c.ipa}</span>
                  ) : null}
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
                  <button
                    type="button"
                    onClick={() => speakWord(c.word)}
                    aria-label={`Pronounce ${c.word}`}
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
                    aria-label="Delete card"
                    className="ml-auto ink-muted hover:text-[var(--ink)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                    </svg>
                  </button>
                </div>
                {c.definition ? (
                  <p className="mt-1 text-sm">{c.definition}</p>
                ) : null}
                {c.example ? (
                  <p
                    className="mt-1 text-sm italic"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    “{c.example}”
                  </p>
                ) : null}
                {c.translation ? (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--accent-link)" }}
                  >
                    VI · {c.translation}
                  </p>
                ) : null}
                <p className="mt-1 text-xs ink-muted">
                  Due {c.due_date}
                  {c.repetitions > 0
                    ? ` · ${c.repetitions} review${c.repetitions === 1 ? "" : "s"}`
                    : " · new"}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/**
 * Convert a "recently added" preset into the lower-bound timestamp (ms).
 * Returns null when the preset is "all" so we skip the date check entirely.
 *
 * "Today" uses the local midnight rather than the last 24h so it matches
 * the way the user thinks about "today's additions".
 */
function recentCutoffMs(preset: "all" | "today" | "7d" | "30d"): number | null {
  if (preset === "all") return null;
  const now = new Date();
  if (preset === "today") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getTime();
  }
  const days = preset === "7d" ? 7 : 30;
  return now.getTime() - days * 86_400_000;
}
