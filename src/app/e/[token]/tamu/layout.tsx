import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { shareLinkErrorMessage } from "@/lib/share-link";
import { exitGuestAction } from "@server/actions/share-links";
import { GuestSessionCleanup } from "./GuestSessionCleanup";
import { loadGuestContext } from "./guest-context";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const navItems = [
  { href: "", label: "Ringkasan" },
  { href: "/lagu", label: "Lagu" },
  { href: "/rehearsal", label: "Rehearsal" },
  { href: "/equipment", label: "Equipment" },
] as const;

export default async function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await loadGuestContext(token);
  if (!guest.ok) {
    const message =
      guest.reason === "session"
        ? "Sesi tamu sudah tidak berlaku. Buka tautan event lagi."
        : shareLinkErrorMessage(guest.reason);
    return (
      <main
        id="konten"
        className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-3 py-8"
      >
        <GuestSessionCleanup />
        <Alert tone="danger" title="Mode tamu tidak aktif">
          <p>{message}</p>
        </Alert>
        <div className="flex flex-col gap-2">
          <Link
            href={`/e/${token}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 font-medium dark:border-zinc-700 dark:bg-zinc-900"
          >
            Buka halaman tautan
          </Link>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/e/${token}`)}`}
            className="text-center text-sm font-medium underline"
          >
            Masuk dengan akun
          </Link>
        </div>
      </main>
    );
  }

  const { link, session } = guest.context;
  const base = `/e/${token}/tamu`;
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 break-words font-semibold">
                  {link.event.name}
                </p>
                <Badge tone="warning">Tamu · hanya lihat</Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {session.displayName
                  ? `Tamu: ${session.displayName}`
                  : "Tamu tanpa nama"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/e/${token}`)}`}
                className="text-sm font-medium underline"
              >
                Masuk dengan akun
              </Link>
              <form action={exitGuestAction}>
                <input type="hidden" name="token" value={token} />
                <Button type="submit" variant="secondary" size="sm">
                  Keluar dari mode tamu
                </Button>
              </form>
            </div>
          </div>
          <nav
            aria-label="Navigasi tamu"
            className="-mx-1 flex gap-1 overflow-x-auto"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={`${base}${item.href}`}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main
        id="konten"
        className="mx-auto w-full max-w-screen-lg flex-1 px-3 py-4 sm:px-4"
      >
        {children}
      </main>
    </div>
  );
}
