import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser } from "@/lib/auth";
import { getEvent } from "@server/services/event-service";
import { EventBrief } from "../EventBrief";
import { EventForm, type EventFormDefaults } from "../EventForm";

function toFormDefaults(event: NonNullable<Awaited<ReturnType<typeof getEvent>>>): EventFormDefaults {
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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        {event.name}
      </h1>
      <EventBrief
        event={event}
        picContact={event.committeePicContact}
      />
      <EventForm mode="edit" eventId={event.id} defaults={toFormDefaults(event)} />
      {event.eventStatus === "CANCELLED" ? (
        <EmptyState title="Event dibatalkan" description="Event ini tidak tampil sebagai event berjalan untuk personel." />
      ) : null}
    </div>
  );
}
