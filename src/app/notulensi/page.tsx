import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Notulensi",
  description:
    "Arsip notulensi rapat penatalayanan dan panitia — dapat dibaca publik.",
};

const EDITIONS = [
  {
    href: "/notulensi/2026-10-16",
    date: "16 Okt 2026",
    title: "Setlist, aransemen, sequencer & portal latihan",
  },
];

export default function NotulensiIndexPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Notulensi
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Arsip rapat penatalayanan dan panitia. Halaman ini publik — bisa
          dibaca tanpa akun.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {EDITIONS.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {e.date}
              </span>
              <span className="block font-medium">{e.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
