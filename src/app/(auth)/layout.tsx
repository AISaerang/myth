import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-8">
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight">Music Team Hub</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Portal privat tim musik
        </p>
      </div>
      {children}
    </div>
  );
}
