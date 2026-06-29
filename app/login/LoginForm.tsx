"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Sign-in failed.");
        setSubmitting(false);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-5">
      <label className="block">
        <span className="block text-sm font-medium">Passcode</span>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          maxLength={200}
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="input mt-2"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "passcode-error" : undefined}
        />
      </label>

      {error ? (
        <p id="passcode-error" role="alert" className="text-sm" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
