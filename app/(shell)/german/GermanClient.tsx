"use client";

import { useCallback, useState } from "react";
import type { GermanCard } from "@/lib/german";
import type { WritingEntry } from "@/lib/study";
import type { ActiveTest } from "./TestsTab";
import type { ActiveReading } from "./ReadingTab";
import { usePersistentState } from "@/lib/use-persistent-state";
import ModelPicker, { useAIModel } from "@/components/ModelPicker";
import DecksTab from "./DecksTab";
import SpellingTab from "./SpellingTab";
import ReviewTab from "./ReviewTab";
import ReadingTab from "./ReadingTab";
import GrammarTab from "./GrammarTab";
import TestsTab from "./TestsTab";
import WritingTab from "./WritingTab";

type Tab = "review" | "decks" | "spelling" | "reading" | "grammar" | "writing" | "tests";

const TABS: { value: Tab; label: string; description: string }[] = [
  { value: "review", label: "Ôn tập", description: "Karten heute fällig" },
  { value: "decks", label: "Bộ thẻ", description: "Dein Wortschatz" },
  { value: "spelling", label: "Đánh vần", description: "Was du hörst, tippen" },
  { value: "reading", label: "Đọc hiểu", description: "Kurze Lesetexte" },
  { value: "grammar", label: "Ngữ pháp", description: "Grammatik" },
  { value: "writing", label: "Viết", description: "AI Feedback" },
  { value: "tests", label: "Đề thi", description: "CEFR Übungstests" },
];

export default function GermanClient({
  initialCards,
  initialDue,
  initialWriting,
  today,
  initialError,
}: {
  initialCards: GermanCard[];
  initialDue: GermanCard[];
  initialWriting: WritingEntry[];
  today: string;
  initialError: string | null;
}) {
  const [tab, setTab] = usePersistentState<Tab>(
    "pt_german_tab",
    initialDue.length > 0 ? "review" : "decks",
  );
  const [cards, setCards] = useState<GermanCard[]>(initialCards);
  const [due, setDue] = useState<GermanCard[]>(initialDue);
  const [error, setError] = useState<string | null>(initialError);
  const [activeTest, setActiveTest] = usePersistentState<ActiveTest | null>(
    "pt_german_active_test",
    null,
  );
  const [activeReading, setActiveReading] = usePersistentState<ActiveReading | null>(
    "pt_german_active_reading",
    null,
  );
  const { model, setModel, options, loading } = useAIModel();

  const refreshCards = useCallback(async () => {
    try {
      const [allRes, dueRes] = await Promise.all([
        fetch("/api/german/cards", { cache: "no-store" }),
        fetch("/api/german/cards?due=1", { cache: "no-store" }),
      ]);
      const allData = (await allRes.json()) as { cards?: GermanCard[] };
      const dueData = (await dueRes.json()) as { cards?: GermanCard[] };
      setCards(allData.cards ?? []);
      setDue(dueData.cards ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải lại thất bại");
    }
  }, []);

  return (
    <div className="space-y-5">
      <nav
        role="tablist"
        className="surface scroll-tabs flex w-full items-stretch gap-0 overflow-x-auto p-0"
      >
        {TABS.map((t) => {
          const active = t.value === tab;
          const count = t.value === "review" ? due.length : null;
          const inProgress = t.value === "tests" && activeTest?.status === "in_progress";
          const readingOpen = t.value === "reading" && activeReading !== null;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors"
              style={{
                minWidth: "max-content",
                background: active ? "var(--canvas-soft)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-muted)",
                borderBottom: active
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              }}
            >
              <span className="font-semibold">{t.label}</span>
              {count !== null && count > 0 ? (
                <span
                  className="rounded-capsule px-2 py-0.5 text-[10px]"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {count}
                </span>
              ) : null}
              {inProgress || readingOpen ? (
                <span
                  aria-label={inProgress ? "Đang làm đề" : "Đang đọc"}
                  title={inProgress ? "Đang làm đề" : "Đang đọc"}
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="surface p-3 text-sm" style={{ color: "var(--accent)" }}>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-xs ink-muted underline-offset-2 hover:underline"
          >
            đóng
          </button>
        </div>
      ) : null}

      {tab !== "review" && tab !== "spelling" ? (
        <div className="surface flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-xs ink-muted">
            Mô hình AI dùng để sinh đề, chấm bài và gợi ý.
          </p>
          <ModelPicker
            model={model}
            setModel={setModel}
            options={options}
            loading={loading}
          />
        </div>
      ) : null}

      {tab === "review" ? (
        <ReviewTab
          initial={due}
          today={today}
          onChanged={refreshCards}
          onError={setError}
        />
      ) : tab === "decks" ? (
        <DecksTab
          initial={cards}
          model={model}
          onChanged={refreshCards}
          onError={setError}
        />
      ) : tab === "spelling" ? (
        <SpellingTab cards={cards} />
      ) : tab === "reading" ? (
        <ReadingTab
          onError={setError}
          model={model}
          active={activeReading}
          setActive={setActiveReading}
        />
      ) : tab === "grammar" ? (
        <GrammarTab />
      ) : tab === "writing" ? (
        <WritingTab initial={initialWriting} model={model} onError={setError} />
      ) : (
        <TestsTab
          onError={setError}
          model={model}
          active={activeTest}
          setActive={setActiveTest}
        />
      )}
    </div>
  );
}
