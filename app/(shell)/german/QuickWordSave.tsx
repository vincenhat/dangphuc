"use client";

/**
 * Quick-save dialog used by the practice-test highlighter.
 *
 * Pre-fills `word` from the selection and `example` from the surrounding
 * sentence. Posts to /api/german/cards so the new card joins the user's
 * vocabulary deck immediately. CEFR is pre-selected from the active test
 * level so the new card lands in the right band.
 */

import { useEffect, useRef, useState } from "react";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/study";
import {
  type GermanArticle,
  type GermanPos,
  isValidArticle,
  isValidPos,
} from "@/lib/german";
import { getStoredModel } from "@/components/ModelPicker";

interface Props {
  initialWord: string;
  initialExample: string;
  initialCefr: CefrLevel;
  initialTags?: string;
  onClose: () => void;
  onSaved: (word: string) => void;
  onError: (msg: string) => void;
}

export default function QuickWordSave({
  initialWord,
  initialExample,
  initialCefr,
  initialTags = "from-test",
  onClose,
  onSaved,
  onError,
}: Props) {
  const [word, setWord] = useState(initialWord);
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState(initialExample);
  const [translation, setTranslation] = useState("");
  const [cefr, setCefr] = useState<CefrLevel>(initialCefr);
  const [tags, setTags] = useState(initialTags);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  // German-specific extras populated by AI fill. We don't expose them as form
  // fields here (the user can edit later from Decks if needed) but we DO send
  // them along when saving so the deck card lands with article + plural.
  const [pos, setPos] = useState<GermanPos | "">("");
  const [article, setArticle] = useState<GermanArticle | "">("");
  const [plural, setPlural] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Auto-dismiss the inline status after a short delay so it doesn't linger.
  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(null), 3200);
    return () => window.clearTimeout(t);
  }, [status]);

  // Ask Gemini to fill in definition, example, Vietnamese translation, IPA,
  // and CEFR for the current word — same endpoint the Decks tab uses.
  async function aiFill() {
    const w = word.trim();
    if (!w || generating) return;
    setStatus(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/german/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: w, model: getStoredModel() ?? undefined }),
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
      const filled: string[] = [];
      if (data.definition) {
        setDefinition(data.definition);
        filled.push("Definition");
      }
      // Keep the lesson sentence as the example if AI didn't return one.
      if (data.example && !example.trim()) {
        setExample(data.example);
        filled.push("Beispiel");
      }
      if (data.translation) {
        setTranslation(data.translation);
        filled.push("VN");
      }
      if (data.cefr && CEFR_LEVELS.includes(data.cefr as CefrLevel)) {
        setCefr(data.cefr as CefrLevel);
        filled.push("CEFR");
      }
      if (isValidPos(data.pos)) {
        setPos(data.pos);
        filled.push("Wortart");
      }
      if (isValidArticle(data.article)) {
        setArticle(data.article);
        filled.push("Artikel");
      }
      if (typeof data.plural === "string" && data.plural.trim()) {
        setPlural(data.plural);
        filled.push("Plural");
      }
      setStatus({
        kind: "ok",
        text: filled.length > 0
          ? `AI đã điền: ${filled.join(", ")}`
          : "AI không trả về dữ liệu mới",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI thất bại";
      setStatus({ kind: "err", text: msg });
      // Also notify the parent so they can log it if they want.
      onError(msg);
    } finally {
      setGenerating(false);
    }
  }

  // Close on Escape; Cmd/Ctrl+Enter saves.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, definition, example, translation, cefr, tags]);

  async function save() {
    const w = word.trim();
    if (!w) return;
    setSaving(true);
    try {
      const res = await fetch("/api/german/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          word: w,
          definition: definition.trim(),
          example: example.trim(),
          translation: translation.trim(),
          cefr,
          pos: pos || null,
          article: pos === "noun" ? article || null : null,
          plural: pos === "noun" ? plural || null : null,
          tags: tags.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Lưu thất bại");
      }
      onSaved(w);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lưu thẻ từ vựng"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="surface w-full max-w-md p-5 shadow-lift"
        style={{ background: "var(--canvas)" }}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-base font-semibold tracking-tight">Lưu vào bộ thẻ</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-xs ink-muted hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

        {status ? (
          <div
            role="status"
            className="mb-3 rounded-md border-l-4 px-3 py-2 text-xs"
            style={{
              borderColor: status.kind === "ok" ? "#16a34a" : "var(--accent)",
              background:
                status.kind === "ok"
                  ? "rgba(22,163,74,0.08)"
                  : "rgba(236,72,153,0.08)",
              color: status.kind === "ok" ? "#16a34a" : "var(--accent)",
            }}
          >
            {status.kind === "ok" ? "✓ " : "✗ "}
            {status.text}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="block text-xs font-medium ink-muted">Từ · Wort</span>
            <div className="mt-1 flex gap-2">
              <input
                ref={inputRef}
                required
                maxLength={80}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className="input"
              />
              <button
                type="button"
                onClick={aiFill}
                disabled={generating || !word.trim()}
                className="btn-ghost shrink-0 whitespace-nowrap text-xs"
                title="AI điền tự động"
              >
                {generating ? "…" : "AI ↗"}
              </button>
            </div>
            {pos || article || plural ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pos ? (
                  <span
                    className="rounded-capsule px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    style={{ background: "var(--canvas-soft)", color: "var(--ink-muted)" }}
                  >
                    {pos}
                  </span>
                ) : null}
                {article ? (
                  <span
                    className="rounded-capsule px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background:
                        article === "der"
                          ? "rgba(14,165,233,0.12)"
                          : article === "die"
                            ? "rgba(236,72,153,0.12)"
                            : "rgba(22,163,74,0.12)",
                      color:
                        article === "der"
                          ? "#0ea5e9"
                          : article === "die"
                            ? "#ec4899"
                            : "#16a34a",
                    }}
                  >
                    {article} {word}
                  </span>
                ) : null}
                {plural && pos === "noun" ? (
                  <span
                    className="rounded-capsule px-2 py-0.5 text-[10px]"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}
                  >
                    Plural: die {plural}
                  </span>
                ) : null}
              </div>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
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
              <span className="block text-xs font-medium ink-muted">Thẻ phân loại · Tags</span>
              <input
                maxLength={120}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="input mt-1"
                placeholder="cách nhau bằng dấu phẩy"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium ink-muted">
              Tiếng Việt (không bắt buộc)
            </span>
            <input
              maxLength={280}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="input mt-1"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium ink-muted">
              Định nghĩa (không bắt buộc)
            </span>
            <textarea
              maxLength={1000}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              className="input mt-1 min-h-16 resize-y"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium ink-muted">
              Ví dụ (tự lấy từ đoạn văn)
            </span>
            <textarea
              maxLength={1000}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="input mt-1 min-h-16 resize-y"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">
              Huỷ
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu thẻ"}
            </button>
          </div>

          <p className="text-[11px] ink-muted">
            ⌘ / Ctrl + Enter để lưu · Esc để đóng
          </p>
        </form>
      </div>
    </div>
  );
}
