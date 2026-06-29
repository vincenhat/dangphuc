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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Ask Gemini to fill in definition, example, Vietnamese translation, IPA,
  // and CEFR for the current word — same endpoint the Decks tab uses.
  async function aiFill() {
    const w = word.trim();
    if (!w || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/german/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ từ: w, model: getStoredModel() ?? undefined }),
      });
      const data = (await res.json()) as {
        definition?: string;
        example?: string;
        translation?: string;
        ipa?: string;
        cefr?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "AI thất bại");
      if (data.definition) setDefinition(data.definition);
      // Keep the lesson sentence as the example if AI didn't return one.
      if (data.example && !example.trim()) setExample(data.example);
      if (data.translation) setTranslation(data.translation);
      if (data.cefr && CEFR_LEVELS.includes(data.cefr as CefrLevel)) {
        setCefr(data.cefr as CefrLevel);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "AI thất bại");
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
          từ: w,
          definition: definition.trim(),
          example: example.trim(),
          translation: translation.trim(),
          cefr,
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
          <h3 className="text-base font-semibold tracking-tight">Save to deck</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-xs ink-muted hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

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
            ⌘ / Ctrl + Enter to save · Esc to close
          </p>
        </form>
      </div>
    </div>
  );
}
