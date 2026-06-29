"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/study",
    label: "Study",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2z" />
        <path d="M9 7h5M9 11h5M9 15h3" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
];

const BRAND = "Đăng Phúc · Study";

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read collapsed state on mount and reflect it on <html> so the layout's CSS can react.
  useEffect(() => {
    let initial = false;
    try {
      initial = localStorage.getItem("pt_nav_collapsed") === "1";
    } catch {
      /* ignore */
    }
    setCollapsed(initial);
    document.documentElement.dataset.nav = initial ? "collapsed" : "expanded";
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (mobileOpen) root.classList.add("body-lock");
    else root.classList.remove("body-lock");
    return () => root.classList.remove("body-lock");
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.nav = next ? "collapsed" : "expanded";
    try {
      localStorage.setItem("pt_nav_collapsed", next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const widthClass = collapsed ? "md:w-16" : "md:w-64";

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b hairline bg-[var(--canvas)]"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: 12,
          paddingLeft: "max(env(safe-area-inset-left, 0px), 16px)",
          paddingRight: "max(env(safe-area-inset-right, 0px), 16px)",
        }}
      >
        <Link href="/study" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span
            className="inline-block h-5 w-5 rounded-md"
            style={{ background: "var(--accent)" }}
          />
          {BRAND}
        </Link>
        <button
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
          className="btn-ghost !min-h-[40px] !px-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {mobileOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 z-30 bg-black transition-opacity duration-200 ${
          mobileOpen ? "opacity-40 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        id="mobile-nav"
        data-collapsed={collapsed}
        className={`fixed inset-y-0 left-0 h-[100dvh] z-40 w-[80%] max-w-xs border-r hairline bg-[var(--canvas)] shadow-lift transition-transform duration-200 ease-out md:max-w-none md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:${widthClass} ${widthClass}`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 py-5">
          <div className="flex items-center justify-between gap-2 px-1">
            <Link
              href="/study"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 text-base font-semibold tracking-tight ${
                collapsed ? "md:justify-center md:w-full" : ""
              }`}
              aria-label={`${BRAND} home`}
            >
              <span
                className="inline-block h-6 w-6 rounded-md shrink-0"
                style={{ background: "var(--accent)" }}
              />
              {!collapsed && <span>{BRAND}</span>}
            </Link>

            {!collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            )}
          </div>

          {mounted && collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="hidden md:flex mx-auto mt-3 h-8 w-8 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}

          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors min-h-[44px] md:min-h-[40px] ${
                    collapsed ? "md:justify-center md:px-2" : ""
                  } ${
                    active
                      ? "bg-[var(--canvas-soft)] text-[var(--ink)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas-soft)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={active ? "text-[var(--accent)]" : ""}>{item.icon}</span>
                  <span className={`font-medium ${collapsed ? "md:hidden" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div
            className={`mt-auto flex items-center gap-2 pt-4 ${
              collapsed ? "md:flex-col md:items-stretch" : "justify-between"
            }`}
          >
            <ThemeToggle compact={collapsed} />
            <button
              type="button"
              onClick={() => {
                fetch("/api/login", { method: "DELETE" }).then(() => {
                  window.location.href = "/login";
                });
              }}
              title={collapsed ? "Sign out" : undefined}
              className="btn-ghost !min-h-[40px] text-xs"
              aria-label="Sign out"
            >
              {collapsed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 12H3m0 0l4-4m-4 4l4 4" />
                  <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
                </svg>
              ) : (
                "Sign out"
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
