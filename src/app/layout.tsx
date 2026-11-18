import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Music Youth Team Hub",
    template: "%s — Music Youth Team Hub",
  },
  description:
    "Portal privat koordinasi persiapan tim musik ibadah pemuda wilayah.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" className="h-full">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-black dark:text-zinc-100">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Lewati ke konten
        </a>
        <div className="flex w-full flex-1 flex-col">
          {children}
        </div>
        <footer className="border-t border-zinc-200 py-4 dark:border-zinc-800">
          <p className="mx-auto w-full max-w-screen-2xl px-3 text-xs text-zinc-500 dark:text-zinc-400 sm:px-4 lg:px-6 xl:px-8">
            Data draft tidak boleh tampak final. Zona waktu: Asia/Jakarta.
          </p>
        </footer>
      </body>
    </html>
  );
}
