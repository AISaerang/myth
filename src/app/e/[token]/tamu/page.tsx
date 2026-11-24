import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EventBrief } from "@/app/(app)/event/EventBrief";
import { toPublicEvent } from "@server/services/event-service";
import { loadGuestContext } from "./guest-context";

export default async function GuestBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await loadGuestContext(token);
  if (!guest.ok) return null;

  const { link } = guest.context;
  const base = `/e/${token}/tamu`;
  return (
    <div className="flex flex-col gap-4">
      <EventBrief event={toPublicEvent(link.event)} />
      <Card title="Akses tamu">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Kamu dapat melihat ringkasan event, daftar lagu
          {link.includeDrafts ? " (termasuk draft internal)" : " yang sudah dipublish"},
          jadwal rehearsal, dan daftar equipment. Semua data bersifat hanya
          lihat.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          <li>
            <Link href={`${base}/lagu`} className="font-medium underline">
              Lihat lagu
            </Link>
          </li>
          <li>
            <Link href={`${base}/rehearsal`} className="font-medium underline">
              Jadwal rehearsal
            </Link>
          </li>
          <li>
            <Link href={`${base}/equipment`} className="font-medium underline">
              Equipment
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
