"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type AppNavItem = {
  href: string;
  label: string;
};

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const renderItem = (item: AppNavItem) => {
    const isActive =
      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={[
          "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800",
          isActive
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-700 dark:text-zinc-300",
        ].join(" ")}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:hidden">
        <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
          Music Youth Team Hub
        </span>
        <button
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

      <div className="hidden min-w-0 md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-x-4 md:gap-y-2 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span className="min-w-0 truncate text-sm font-semibold tracking-tight md:col-start-1 md:row-start-1">
          Music Youth Team Hub
        </span>
        <nav
          aria-label="Navigasi utama"
          className="min-w-0 md:col-span-2 md:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1"
        >
          <div className="flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap">
            {items.map(renderItem)}
          </div>
        </nav>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 md:col-start-2 md:row-start-1 lg:col-start-3">
          {desktopControls}
        </div>
      </div>

      <button
        type="button"
        aria-label="Tutup menu navigasi"
        onClick={() => setOpen(false)}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[60px] z-[60] bg-black/40 md:hidden"
      />
      <nav
        id="app-nav-panel"
        aria-label="Menu navigasi"
        aria-hidden={!open}
        hidden={!open}
        className="fixed bottom-0 right-0 top-[60px] z-[70] flex w-[88vw] max-w-sm flex-col gap-3 overflow-y-auto overscroll-contain border-l border-zinc-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl md:hidden dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">{items.map(renderItem)}</div>
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {mobileControls}
        </div>
      </nav>
    </>
  );
}
