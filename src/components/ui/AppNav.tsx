"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type AppNavItem = {
  href: string;
  label: string;
};

// Less-used links move into the "Lainnya" menu on desktop so the nav never
// needs a horizontal scroll strip at 1280px and wider.
const SECONDARY_HREFS = new Set([
  "/team",
  "/batches",
  "/equipment",
  "/decisions",
  "/people",
  "/broadcast",
]);

const drawerTop = { top: "var(--app-header-h, 61px)" } as const;

export function AppNav({
  items,
  desktopControls,
  mobileControls,
}: {
  items: AppNavItem[];
  desktopControls: ReactNode;
  mobileControls: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const primaryItems = items.filter((item) => !SECONDARY_HREFS.has(item.href));
  const secondaryItems = items.filter((item) => SECONDARY_HREFS.has(item.href));

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOpen(false);
      setMoreOpen(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (open) setOpen(false);
      setMoreOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!moreOpen) return;

    const handlePointer = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };

    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [moreOpen]);

  // Tie the drawer/backdrop offset to the real (possibly wrapped) header
  // height instead of a hardcoded 60px.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-header]");
    if (!header) return;

    const apply = () => {
      header.style.setProperty(
        "--app-header-h",
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;

    const main = document.getElementById("konten");
    const footer = document.querySelector("footer");
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const toggle = toggleRef.current;

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    focusables()[0]?.focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleTab);
      toggle?.focus();
    };
  }, [open]);

  function renderItem(item: AppNavItem, variant: "desktop" | "mobile" | "menu") {
    const active = isActive(item.href);
    const base =
      "flex items-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800";
    const shape =
      variant === "desktop"
        ? "min-h-9 px-2.5 py-1.5 text-sm"
        : variant === "menu"
          ? "min-h-10 w-full px-3 py-2 text-sm"
          : "min-h-11 px-3 py-2 text-sm";
    return (
      <Link
        key={item.href}
        href={item.href}
        role={variant === "menu" ? "menuitem" : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          setOpen(false);
          setMoreOpen(false);
        }}
        className={[
          base,
          shape,
          active
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-700 dark:text-zinc-300",
        ].join(" ")}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
          Music Youth Team Hub
        </span>
        <button
          ref={toggleRef}
          type="button"
          aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
          aria-expanded={open}
          aria-controls="app-nav-panel"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      <div className="hidden min-w-0 flex-col gap-2 lg:flex">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
            Music Youth Team Hub
          </span>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {desktopControls}
          </div>
        </div>
        <nav aria-label="Navigasi utama" className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-0.5">
            {primaryItems.map((item) => renderItem(item, "desktop"))}
            {secondaryItems.length > 0 ? (
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  onClick={() => setMoreOpen((value) => !value)}
                  className="flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
                >
                  Lainnya
                  <span aria-hidden className="text-xs">
                    ▾
                  </span>
                </button>
                {moreOpen ? (
                  <div
                    role="menu"
                    aria-label="Navigasi lainnya"
                    className="absolute left-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {secondaryItems.map((item) => renderItem(item, "menu"))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      <button
        type="button"
        aria-label="Tutup menu navigasi"
        onClick={() => setOpen(false)}
        hidden={!open}
        style={drawerTop}
        className="fixed inset-x-0 bottom-0 z-[60] bg-black/40 lg:hidden"
      />
      <div
        ref={panelRef}
        id="app-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        hidden={!open}
        style={drawerTop}
        className="fixed bottom-0 right-0 z-[70] flex w-[88vw] max-w-sm flex-col gap-3 overflow-y-auto overscroll-contain border-l border-zinc-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
      >
        <nav aria-label="Navigasi seluler" className="flex flex-col gap-1">
          {items.map((item) => renderItem(item, "mobile"))}
        </nav>
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {mobileControls}
        </div>
      </div>
    </>
  );
}
