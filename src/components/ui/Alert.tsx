import type { ReactNode } from "react";

type AlertTone = "info" | "warning" | "danger";

const toneClasses: Record<AlertTone, string> = {
  info: "border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  danger:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div role="alert" className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}
