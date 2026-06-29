"use client";

/**
 * Highlightable text block for the practice test.
 *
 * Renders a passage or sentence as a sequence of text segments derived from
 * a list of highlight ranges. Selecting any range of text inside the block
 * pops up a small floating toolbar with two actions:
 *
 *  - "Highlight"  → tint the selection. Persisted in the parent so it survives
 *                   tab switches and (optionally) page reloads.
 *  - "Lưu từ"  → fires `onSaveWord` with the selected text and the
 *                   sentence containing it; the parent decides what to do
 *                   (open a quick-add modal for the deck).
 *
 * Click an existing highlight to remove it.
 */

import { useEffect, useMemo, useRef, useState } from "react";

export interface HighlightRange {
  start: number; // inclusive char offset
  end: number;   // exclusive
}

interface Props {
  text: string;
  highlights: HighlightRange[];
  onAddHighlight: (range: HighlightRange) => void;
  onRemoveHighlight: (index: number) => void;
  onSaveWord: (selectedText: string, sentence: string) => void;
  className?: string;
  preserveWhitespace?: boolean;
  /** Disable interaction once the test is submitted. */
  readOnly?: boolean;
}

interface ToolbarPos {
  top: number;
  left: number;
  selStart: number;
  selEnd: number;
  text: string;
}

const HIGHLIGHT_BG = "rgba(245, 197, 24, 0.32)";
const HIGHLIGHT_BORDER = "rgba(245, 197, 24, 0.65)";

export default function Highlightable({
  text,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  onSaveWord,
  className,
  preserveWhitespace,
  readOnly,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<ToolbarPos | null>(null);

  // Build the segment list — alternating plain and highlighted runs.
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  // Hide the toolbar on outside click + Escape.
  useEffect(() => {
    if (!toolbar) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setToolbar(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setToolbar(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolbar]);

  function handleSelect() {
    if (readOnly) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setToolbar(null);
      return;
    }
    const root = wrapRef.current;
    if (!root) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      return;
    }

    const start = offsetWithin(root, range.startContainer, range.startOffset);
    const end = offsetWithin(root, range.endContainer, range.endOffset);
    if (start === null || end === null) return;
    const a = Math.min(start, end);
    const b = Math.max(start, end);
    if (b - a < 1) return;
    const picked = text.slice(a, b).trim();
    if (!picked) return;

    // Position the toolbar above the selection.
    const rect = range.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    setToolbar({
      top: rect.top - rootRect.top - 44,
      left: Math.max(0, rect.left - rootRect.left + rect.width / 2 - 80),
      selStart: a,
      selEnd: b,
      text: picked,
    });
  }

  function applyHighlight() {
    if (!toolbar) return;
    onAddHighlight({ start: toolbar.selStart, end: toolbar.selEnd });
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }

  function saveWord() {
    if (!toolbar) return;
    const sentence = sentenceAround(text, toolbar.selStart, toolbar.selEnd);
    onSaveWord(toolbar.text, sentence);
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div
      ref={wrapRef}
      className={`relative ${className ?? ""}`}
      onMouseUp={handleSelect}
      onTouchEnd={handleSelect}
      style={preserveWhitespace ? { whiteSpace: "pre-wrap" } : undefined}
    >
      {segments.map((seg, i) =>
        seg.kind === "plain" ? (
          <span key={i} data-start={seg.start}>
            {seg.text}
          </span>
        ) : (
          <span
            key={i}
            data-start={seg.start}
            onClick={(e) => {
              if (readOnly) return;
              e.stopPropagation();
              if (window.confirm("Remove this highlight?")) {
                onRemoveHighlight(seg.index);
              }
            }}
            title={readOnly ? "" : "Click to remove highlight"}
            style={{
              background: HIGHLIGHT_BG,
              borderBottom: `2px solid ${HIGHLIGHT_BORDER}`,
              borderRadius: 2,
              padding: "0 1px",
              cursor: readOnly ? "default" : "pointer",
            }}
          >
            {seg.text}
          </span>
        ),
      )}

      {toolbar ? (
        <div
          role="toolbar"
          className="absolute z-30 flex gap-1 rounded-md border hairline p-1 shadow-lift"
          style={{
            top: toolbar.top,
            left: toolbar.left,
            background: "var(--canvas)",
            // Prevent the popup itself from clearing the selection.
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={applyHighlight}
            className="btn-ghost !min-h-[32px] !px-2 text-xs"
          >
            <span aria-hidden style={{ color: HIGHLIGHT_BORDER }}>●</span>{" "}
            Highlight
          </button>
          <button
            type="button"
            onClick={saveWord}
            className="btn-primary !min-h-[32px] !px-2 text-xs"
          >
            Save word
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------- internals ----------

type Segment =
  | { kind: "plain"; text: string; start: number }
  | { kind: "hl"; text: string; start: number; index: number };

function buildSegments(text: string, raws: HighlightRange[]): Segment[] {
  if (raws.length === 0) return [{ kind: "plain", text, start: 0 }];
  // Sort + clip + drop empties (we don't merge — overlapping clicks should
  // reveal both highlights so the user can prune them individually).
  const ranges = raws
    .map((r, i) => ({
      start: Math.max(0, Math.min(text.length, r.start)),
      end: Math.max(0, Math.min(text.length, r.end)),
      index: i,
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  if (ranges.length === 0) return [{ kind: "plain", text, start: 0 }];

  const out: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    const s = Math.max(cursor, r.start);
    const e = r.end;
    if (cursor < s) {
      out.push({ kind: "plain", text: text.slice(cursor, s), start: cursor });
    }
    if (e > s) {
      out.push({ kind: "hl", text: text.slice(s, e), start: s, index: r.index });
    }
    cursor = Math.max(cursor, e);
  }
  if (cursor < text.length) {
    out.push({ kind: "plain", text: text.slice(cursor), start: cursor });
  }
  return out;
}

/**
 * Compute the character offset of (node, offsetInNode) within `root`, treating
 * `root`'s combined text as a single string. Returns null if the node isn't
 * inside `root`.
 *
 * Each top-level child is a <span> wrapping a single text node. We sum the
 * lengths of every text node that comes strictly before `node`, then add the
 * in-node offset.
 */
function offsetWithin(
  root: HTMLElement,
  node: Node,
  offsetInNode: number,
): number | null {
  if (!root.contains(node)) return null;
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur === node) return total + offsetInNode;
    total += (cur.textContent ?? "").length;
    cur = walker.nextNode();
  }
  // Selection ended outside the wrapper (e.g., on a span node, not a text
  // node). Fall back to the data-start attribute on the closest segment.
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const ds = el.dataset?.start ?? el.closest<HTMLElement>("[data-start]")?.dataset?.start;
    if (ds !== undefined) return Number(ds);
  }
  return null;
}

/**
 * Return the sentence containing the [start, end) selection. Uses simple
 * `. ! ?` boundaries — good enough for short test passages.
 */
function sentenceAround(text: string, start: number, end: number): string {
  let from = start;
  while (from > 0 && !".!?\n".includes(text[from - 1])) from -= 1;
  let to = end;
  while (to < text.length && !".!?\n".includes(text[to])) to += 1;
  if (to < text.length) to += 1; // include the punctuation
  return text.slice(from, to).trim();
}
