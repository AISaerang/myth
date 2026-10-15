import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { inviteTokenSchema } from "@/lib/validation/auth";
import { MasukForm } from "./MasukForm";

// Public invite gate. GET never consumes the token (chat-link previews
// must not burn it); redemption happens only via POST in MasukForm.
export default async function MasukPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = inviteTokenSchema.safeParse(token).success;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-8">
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight">Music Youth Team Hub</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Portal privat tim musik
        </p>
      </div>
      <Card title="Link undangan">
        {valid ? (
          <MasukForm token={token} />
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p>Link undangan tidak valid atau kedaluwarsa.</p>
            <p className="text-zinc-500 dark:text-zinc-400">
              Minta link baru ke admin, atau{" "}
              <Link href="/login" className="font-medium underline">
                masuk dengan username + password
              </Link>
              .
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
