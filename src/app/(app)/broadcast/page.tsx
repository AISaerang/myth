import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser } from "@/lib/auth";
import { buildGroupMessage } from "@/lib/broadcast-messages";
import { defaultTempPassword } from "@/lib/default-temp-password";
import { getBroadcastRecipients } from "@server/services/broadcast-service";
import { DirectMessageCard, GroupMessageCard } from "./BroadcastClient";

function appBaseUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Admin-only broadcast center: copy-ready WhatsApp onboarding messages
// built from live data (names, usernames, skills, assignments).
export default async function BroadcastPage() {
  await requireAdminUser();
  const appUrl = appBaseUrl();
  const defaultPassword = defaultTempPassword();
  const recipients = await getBroadcastRecipients();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Broadcast Undangan
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Pesan grup + japri per personel, terisi otomatis dari data. Link
        undangan tetap unik per orang (berlaku 7 hari, sekali pakai).
        Password sementara default sudah terisi; pengguna wajib
        menggantinya saat login pertama.
      </p>
      <GroupMessageCard message={buildGroupMessage(appUrl)} />
      {recipients.length === 0 ? (
        <EmptyState title="Belum ada akun aktif" />
      ) : (
        recipients.map((r) => (
          <DirectMessageCard
            key={r.userId}
            recipient={r}
            appUrl={appUrl}
            defaultPassword={defaultPassword}
          />
        ))
      )}
    </div>
  );
}
