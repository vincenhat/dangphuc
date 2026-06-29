export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a 24-hour HH:MM string for display, respecting the user's locale.
 * Returns "" for invalid or empty input.
 */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm)) return value;
  const d = new Date();
  d.setHours(h, mm, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function relativeFromNow(value: string): string {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "";
  const diff = target - Date.now();
  const abs = Math.abs(diff);
  const days = Math.round(abs / 86_400_000);
  const hours = Math.round(abs / 3_600_000);
  const minutes = Math.round(abs / 60_000);
  const future = diff > 0;
  if (days >= 1) return future ? `in ${days}d` : `${days}d ago`;
  if (hours >= 1) return future ? `in ${hours}h` : `${hours}h ago`;
  return future ? `in ${minutes}m` : `${minutes}m ago`;
}
