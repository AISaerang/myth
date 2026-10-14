import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center dark:border-zinc-700">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
