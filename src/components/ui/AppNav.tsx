"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type AppNavItem = {
  href: string;
  label: string;
};

export function AppNav({ items }: { items: AppNavItem[] }) {
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
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
      <button
        type="button"
        aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
        aria-expanded={open}
        aria-controls="app-nav-panel"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg text-zinc-700 transition-colors hover:bg-zinc-100 md:hidden dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ☰
      </button>

      <nav aria-label="Navigasi utama" className="hidden md:block">
        <div className="flex min-w-0 flex-wrap items-center gap-1 overflow-x-auto whitespace-nowrap">
          {items.map(renderItem)}
        </div>
      </nav>

      {open ? (
        <div className="md:hidden">
          <nav
            id="app-nav-panel"
            aria-label="Navigasi utama mobile"
            className="mt-3 flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {items.map(renderItem)}
          </nav>
        </div>
      ) : null}
    </>
  );
}
