import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/auth";
import { SHARE_GUEST_COOKIE_NAME } from "@/lib/share-cookie";
import { isShareTokenShape } from "@/lib/share-token";
import {
  SHARE_THROTTLE_MESSAGE,
  shareLinkErrorMessage,
} from "@/lib/share-link";
import {
  resolveGuestSession,
  resolveShareLinkGuarded,
} from "@server/services/share-link-service";
import { GuestStartForm } from "./GuestStartForm";

const loginButtonClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="konten"
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-3 py-8"
    >
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight">Music Youth Team Hub</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tautan event
        </p>
      </div>
      {children}
    </main>
  );
}

export default async function ShareLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getSessionUser();
  if (user) redirect(`/e/${token}/continue`);

  if (!isShareTokenShape(token)) {
    return (
      <Shell>
        <Alert tone="danger" title="Tautan tidak dapat dibuka">
          <p>Link tidak valid.</p>
        </Alert>
      </Shell>
    );
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const resolved = await resolveShareLinkGuarded(token, ip);
  if (!resolved.ok) {
    return (
      <Shell>
        <Alert tone="danger" title="Tautan tidak dapat dibuka">
          <p>
            {resolved.reason === null
              ? SHARE_THROTTLE_MESSAGE
              : shareLinkErrorMessage(resolved.reason)}
          </p>
        </Alert>
      </Shell>
    );
  }

  const guestToken = (await cookies()).get(SHARE_GUEST_COOKIE_NAME)?.value;
  if (guestToken) {
    const guest = await resolveGuestSession(guestToken);
    if (guest.ok && guest.context.link.id === resolved.link.id) {
      redirect(`/e/${token}/tamu`);
    }
  }

  const callback = encodeURIComponent(`/e/${token}`);
  return (
    <Shell>
      <Card title={resolved.link.event.name}>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Buka event ini dengan akunmu, atau lanjut sebagai tamu read-only.
          Tamu hanya dapat melihat event ini.
        </p>
        <div className="flex flex-col gap-3">
          <Link href={`/login?callbackUrl=${callback}`} className={loginButtonClass}>
            Masuk dengan akun
          </Link>
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <GuestStartForm token={token} />
          </div>
        </div>
      </Card>
    </Shell>
  );
}
