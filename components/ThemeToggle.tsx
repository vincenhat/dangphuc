"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "pt_theme";
const COOKIE_NAME = "pt_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

/**
 * Persist the chosen theme in BOTH localStorage and a cookie.
 *
 * The cookie is what the SSR layout reads on the very first request, so the
 * server can render the correct `dark` class on <html> with no flash.
 * localStorage is the same source the inline bootstrap script uses for the
 * client-only fallback. Writing to both means we recover gracefully when one
 * side is cleared (Safari ITP eviction, private mode, manual storage clear).
 */
function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${COOKIE_NAME}=${theme}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  // The bootstrap script in layout.tsx already set the `dark` class on <html>
  // before React mounted, so this is the cheapest source of truth.
  if (document.documentElement.classList.contains("dark")) return "dark";
  return "light";
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = readInitialTheme();
    setTheme(t);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    persistTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="btn-ghost flex items-center gap-2 text-xs"
    >
      {mounted && theme === "dark" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
      {!compact && <span>{mounted ? (theme === "dark" ? "Dark" : "Light") : "Theme"}</span>}
    </button>
  );
}
