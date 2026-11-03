import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { requireFreshUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageEvent, canManageMembers, canWriteEventData, isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { getAccessibleEvent, getEventRole } from "@server/services/event-access";
import { EventAccessControl } from "./EventAccessControl";
import { EventBrief } from "../EventBrief";
import { EventForm, type EventFormDefaults } from "../EventForm";

function toFormDefaults(
  event: NonNullable<Awaited<ReturnType<typeof getAccessibleEvent>>>,
): EventFormDefaults {
  return {
    name: event.name,
    description: event.description,
    eventDate: event.eventDate
      ? event.eventDate.toISOString().slice(0, 10)
      : undefined,
    startTime: event.startTime,
    endTime: event.endTime,
    venue: event.venue,
    theme: event.theme,
    targetDurationMinutes: event.targetDurationMinutes,
    eventStatus: event.eventStatus,
    liturgicalFlowUrl: event.liturgicalFlowUrl,
    committeePicName: event.committeePicName,
    committeePicContact: event.committeePicContact,
    notes: event.notes,
  };
}

async function EventDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const user = await requireFreshUser();
  const { id } = await params;
  const event = await getAccessibleEvent(user, id);
  if (!event) notFound();
  const role = await getEventRole(user, event.id);
  if (!role) notFound();
  const canEdit = canWriteEventData(role, Boolean(event.accessClosedAt), isAdmin(user));
  const canControlAccess = canManageEvent(role);
  const closedBy = event.accessClosedById
    ? await prisma.user.findUnique({
        where: { id: event.accessClosedById },
        select: { displayName: true },
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        {event.name}
      </h1>
      <EventBrief
        event={event}
        picContact={isAdmin(user) ? event.committeePicContact : null}
      />
      {canEdit ? (
        <EventForm mode="edit" eventId={event.id} defaults={toFormDefaults(event)} />
      ) : null}
      {canManageMembers(role) ? (
        <Link href={`/event/${event.id}/members`} className="text-sm font-medium underline">
          Kelola anggota event
        </Link>
      ) : null}
      {canControlAccess ? (
        <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <p className="font-medium">Akses member</p>
            {event.accessClosedAt ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Event ditutup {formatJakarta(event.accessClosedAt)}
                {closedBy ? ` oleh ${closedBy.displayName}` : ""}. Member dan pantau
                tidak dapat mengakses event ini sampai akses dibuka kembali.
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Member dan pantau dapat mengakses event ini. Menutup akses tidak terjadi otomatis saat event selesai.
              </p>
            )}
          </div>
          <EventAccessControl eventId={event.id} accessClosedAt={event.accessClosedAt} />
        </section>
      ) : event.accessClosedAt && !isAdmin(user) ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Event tertutup; perubahan event brief dinonaktifkan.
        </p>
      ) : null}
      {event.eventStatus === "CANCELLED" ? (
        <EmptyState title="Event dibatalkan" description="Event ini tidak tampil sebagai event berjalan untuk personel." />
      ) : null}
    </div>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p aria-busy="true" aria-live="polite" className="text-sm text-zinc-500">
          Memuat event...
        </p>
      }
    >
      <EventDetailContent params={params} />
    </Suspense>
  );
}
