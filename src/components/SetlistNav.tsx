"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { SetlistNavResult } from "@/lib/setlist-nav";

function songHref(songId: string, eventId: string, batchId: string): string {
  const query = new URLSearchParams({ eventId, batchId });
  return `/songs/${songId}?${query.toString()}`;
}

function batchHref(eventId: string, batch: SetlistNavResult["batch"]): string {
  if (!batch) return `/songs?eventId=${encodeURIComponent(eventId)}`;
  return `/songs?eventId=${encodeURIComponent(eventId)}#${batch.anchorId}`;
}

function NavSlot({
  href,
  label,
  title,
  align,
}: {
  href: string;
  label: string;
  title?: string;
  align: "left" | "right";
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 min-w-0 flex-col justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className="font-medium">{label}</span>
      {title ? (
        <span className="min-w-0 truncate text-xs text-zinc-500">{title}</span>
      ) : null}
    </Link>
  );
}

export function SetlistNav({
  songId,
  eventId,
  nav,
}: {
  songId: string;
  eventId: string;
  nav: SetlistNavResult;
}) {
  const router = useRouter();
  const prevHref = nav.batch
    ? nav.prev
      ? songHref(nav.prev.songId, eventId, nav.batch.id)
      : batchHref(eventId, nav.batch)
    : null;
  const nextHref = nav.batch
    ? nav.next
      ? songHref(nav.next.songId, eventId, nav.batch.id)
      : batchHref(eventId, nav.batch)
    : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable='true'], [role='textbox']",
        )
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && prevHref) {
        event.preventDefault();
        router.push(prevHref);
      } else if (event.key === "ArrowRight" && nextHref) {
        event.preventDefault();
        router.push(nextHref);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [nextHref, prevHref, router]);

  if (!nav.batch) return null;

  return (
    <nav aria-label="Navigasi setlist" className="flex min-w-0 flex-col gap-2">
      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <NavSlot
          href={prevHref ?? batchHref(eventId, nav.batch)}
          label={nav.prev ? "← Lagu sebelumnya" : `Awal · ${nav.batch.name}`}
          title={nav.prev?.title}
          align="left"
        />
        <Link
          href={batchHref(eventId, nav.batch)}
          className="col-span-2 flex min-h-11 items-center justify-center px-2 text-center text-xs font-medium text-zinc-600 underline dark:text-zinc-300 lg:col-span-1"
        >
          {nav.batch.name} · {nav.position}/{nav.total}
        </Link>
        <NavSlot
          href={nextHref ?? batchHref(eventId, nav.batch)}
          label={nav.next ? "Lagu berikutnya →" : `Akhir · ${nav.batch.name}`}
          title={nav.next?.title}
          align="right"
        />
      </div>
      {nav.otherBatches.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-zinc-500">Juga di:</span>
          {nav.otherBatches.map((batch) => (
            <Link
              key={batch.id}
              href={songHref(songId, eventId, batch.id)}
              className="min-h-11 py-2 font-medium underline"
            >
              {batch.name}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
