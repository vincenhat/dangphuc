"use client";

/**
 * Shared AI-model switcher.
 *
 * Fetches the models the server can actually use (those with a configured
 * API key), persists the user's choice to localStorage under a single key
 * shared across every AI surface, and exposes that choice via `useAIModel`.
 *
 * The selected model id is sent in each AI request body as `model`. The
 * server falls back gracefully if the id is unknown or its key is missing.
 */

import { useEffect, useState } from "react";

export interface ModelOption {
  id: string;
  label: string;
  provider: "gemini" | "groq" | "openrouter";
  note: string;
}

const STORAGE_KEY = "pt_ai_model";

let cachedModels: ModelOption[] | null = null;
let cachedDefault: string | null = null;

/** Read the persisted model id (client only). */
export function getStoredModel(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredModel(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * Hook returning the current model id and the available options. Components
 * pass `model` into their AI requests and render <ModelPicker> to change it.
 */
export function useAIModel(): {
  model: string | null;
  setModel: (id: string) => void;
  options: ModelOption[];
  loading: boolean;
} {
  const [options, setOptions] = useState<ModelOption[]>(cachedModels ?? []);
  const [model, setModelState] = useState<string | null>(getStoredModel());
  const [loading, setLoading] = useState(!cachedModels);

  useEffect(() => {
    let cancelled = false;
    if (cachedModels) {
      reconcile(cachedModels, cachedDefault);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/ai/models", { cache: "no-store" });
        const data = (await res.json()) as { models?: ModelOption[]; default?: string };
        if (cancelled) return;
        cachedModels = data.models ?? [];
        cachedDefault = data.default ?? null;
        reconcile(cachedModels, cachedDefault);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };

    function reconcile(opts: ModelOption[], def: string | null) {
      setOptions(opts);
      // If the stored choice isn't offered anymore, fall back to default.
      const stored = getStoredModel();
      const valid = stored && opts.some((o) => o.id === stored) ? stored : null;
      const next = valid ?? (def && opts.some((o) => o.id === def) ? def : opts[0]?.id ?? null);
      setModelState(next);
      if (next && next !== stored) setStoredModel(next);
      setLoading(false);
    }
  }, []);

  function setModel(id: string) {
    setModelState(id);
    setStoredModel(id);
  }

  return { model, setModel, options, loading };
}

export default function ModelPicker({
  model,
  setModel,
  options,
  loading,
  compact = false,
}: {
  model: string | null;
  setModel: (id: string) => void;
  options: ModelOption[];
  loading: boolean;
  compact?: boolean;
}) {
  if (loading) {
    return <span className="text-xs ink-muted">Loading models…</span>;
  }
  if (options.length === 0) {
    return (
      <span className="text-xs" style={{ color: "var(--accent)" }}>
        No AI key configured
      </span>
    );
  }

  const current = options.find((o) => o.id === model);

  return (
    <label className="flex items-center gap-2">
      {!compact ? (
        <span className="text-xs uppercase tracking-[0.16em] ink-muted">Model</span>
      ) : null}
      <select
        value={model ?? ""}
        onChange={(e) => setModel(e.target.value)}
        className="input !w-auto !py-1.5 !text-xs"
        aria-label="AI model"
        title={current?.note}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
