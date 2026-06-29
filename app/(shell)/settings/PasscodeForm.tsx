"use client";

import { useState } from "react";

export default function PasscodeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (next.length < 4) {
      setMessage({ kind: "err", text: "New passcode must be at least 4 characters." });
      return;
    }
    if (next !== confirm) {
      setMessage({ kind: "err", text: "New passcodes don't match." });
      return;
    }
    if (next === current) {
      setMessage({ kind: "err", text: "New passcode must differ from the current one." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/passcode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) {
        setMessage({ kind: "err", text: data.error || "Update failed." });
        return;
      }
      setMessage({ kind: "ok", text: "Passcode updated." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setMessage({ kind: "err", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface max-w-md p-6">
      <Field
        id="current"
        label="Current passcode"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        autoFocus
      />
      <Field
        id="next"
        label="New passcode"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        hint="At least 4 characters."
      />
      <Field
        id="confirm"
        label="Confirm new passcode"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      {message ? (
        <p
          role={message.kind === "err" ? "alert" : undefined}
          className="mt-1 text-sm"
          style={{
            color: message.kind === "err" ? "var(--accent)" : "var(--ink-muted)",
          }}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Updating…" : "Update passcode"}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="mb-4 block">
      <span className="block text-sm font-medium">{label}</span>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        required
        className="input mt-2"
      />
      {hint ? <span className="mt-1 block text-xs ink-muted">{hint}</span> : null}
    </label>
  );
}
