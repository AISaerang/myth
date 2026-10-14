import { Card } from "@/components/ui/Card";
import { formatJakarta } from "@/lib/format";
import type { PublicEvent } from "@server/services/event-service";
import { EventStatusBadge } from "./EventStatusBadge";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function EventBrief({
  event,
  picContact,
}: {
  event: PublicEvent;
  // Hanya diisi untuk admin; tidak pernah dikirim ke user biasa.
  picContact?: string | null;
}) {
  return (
    <Card title={event.name}>
      <div className="mb-3 flex flex-wrap gap-2">
        <EventStatusBadge status={event.eventStatus} />
        {event.eventStatus !== "CONFIRMED" &&
        event.eventStatus !== "COMPLETED" ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Data ini belum final.
          </span>
        ) : null}
      </div>
      {event.description ? (
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {event.description}
        </p>
      ) : null}
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {event.eventDate ? (
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Tanggal</dt>
            <dd className="font-medium">
              {formatJakarta(event.eventDate, {
                hour: undefined,
                minute: undefined,
              })}
            </dd>
          </div>
        ) : null}
        <Field
          label="Waktu"
          value={
            event.startTime || event.endTime
              ? `${event.startTime ?? "?"}–${event.endTime ?? "?"} (${event.timezone})`
              : null
          }
        />
        <Field label="Lokasi" value={event.venue} />
        <Field label="Tema" value={event.theme} />
        <Field
          label="Target durasi"
          value={
            event.targetDurationMinutes
              ? `${event.targetDurationMinutes} menit`
              : null
          }
        />
        <Field label="PIC panitia" value={event.committeePicName} />
        {picContact ? (
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">
              Kontak PIC (admin)
            </dt>
            <dd className="font-medium">{picContact}</dd>
          </div>
        ) : null}
      </dl>
      {event.liturgicalFlowUrl ? (
        <p className="mt-3 text-sm">
          <a
            href={event.liturgicalFlowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Buka liturgi/rundown
          </a>
        </p>
      ) : null}
      {event.notes ? (
        <p className="mt-3 border-t border-zinc-200 pt-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {event.notes}
        </p>
      ) : null}
    </Card>
  );
}
