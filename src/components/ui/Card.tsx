import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5 ${className}`}
    >
      {title ? (
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
