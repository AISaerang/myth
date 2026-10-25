import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin, isObserver } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { getCurrentEvent } from "@server/services/event-service";
import { listPersonnelForAdmin } from "@server/services/personnel-service";
import { listSongs } from "@server/services/song-service";
import { getRehearsal } from "@server/services/rehearsal-service";
import { prisma } from "@/lib/db";
import { OverdueBadge, TaskPriorityBadge, TaskStatusBadge } from "../../tasks/WorkBadges";
import { isTaskOverdue } from "@/lib/task-status";
import { SongStatusBadge } from "../../songs/SongStatusBadge";
import { AttendanceBadge, RehearsalStatusBadge, RehearsalTypeBadge } from "../OpsBadges";
import { RehearsalSongMover } from "@/components/ui/MoveButtons";
import { RehearsalForm } from "../RehearsalForm";
import { toJakartaLocalInput } from "@/lib/datetime-local";
import {
  AttendanceCard,
  AttendanceRowForm,
  SongChecklistForm,
} from "./RehearsalDetailForms";

export default async function RehearsalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFreshUser();
  const { id } = await params;
  const rehearsal = await getRehearsal(id);
  if (!rehearsal) notFound();
  const admin = isAdmin(user);
  const observer = isObserver(user);

  if (!admin) {
    // Personel hanya melihat rehearsal event berjalan.
    const current = await getCurrentEvent();
    if (!current || current.id !== rehearsal.eventId) notFound();
  }

  const myPerson = admin
    ? null
    : await prisma.person.findUnique({ where: { userId: user.id } });
  const myAttendance = myPerson
    ? rehearsal.attendance.find((a) => a.personId === myPerson.id)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {rehearsal.title}
        </h1>
        <RehearsalTypeBadge type={rehearsal.type} />
        <RehearsalStatusBadge status={rehearsal.status} />
      </div>

      <Card title="Jadwal">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Mulai</dt>
            <dd className="font-medium">{formatJakarta(rehearsal.startsAt)}</dd>
          </div>
          {rehearsal.endsAt ? (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Selesai</dt>
              <dd className="font-medium">{formatJakarta(rehearsal.endsAt)}</dd>
            </div>
          ) : null}
        </dl>
        {rehearsal.venueOrMeetingUrl ? (
          <p className="mt-2 text-sm">
            Lokasi/link:{" "}
            {/^https?:\/\//i.test(rehearsal.venueOrMeetingUrl) ? (
              <a
                href={rehearsal.venueOrMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Buka meeting
              </a>
            ) : (
              <span className="font-medium">{rehearsal.venueOrMeetingUrl}</span>
            )}
          </p>
        ) : null}
        {rehearsal.agenda ? (
          <div className="mt-2 text-sm">
            <p className="font-medium">Agenda</p>
            <p className="text-zinc-600 dark:text-zinc-400">{rehearsal.agenda}</p>
          </div>
        ) : null}
        {rehearsal.notes ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {rehearsal.notes}
          </p>
        ) : null}
      </Card>

      <Card title={`Lagu (${rehearsal.songs.length})`}>
        {rehearsal.songs.length === 0 && !admin ? (
          <EmptyState title="Belum ada lagu ditentukan" />
        ) : (
          <ul className="flex flex-col gap-1">
            {rehearsal.songs.map((s, index) => (
              <li
                key={s.songId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs text-zinc-500">
                    {index + 1}
                  </span>
                  <Link href={`/songs/${s.songId}`} className="font-medium underline">
                    {s.song.title}
                  </Link>
                </span>
                <span className="flex items-center gap-2">
                  {admin ? (
                    <RehearsalSongMover
                      rehearsalId={rehearsal.id}
                      orderedIds={rehearsal.songs.map((x) => x.songId)}
                      index={index}
                      title={s.song.title}
                    />
                  ) : null}
                  <SongStatusBadge status={s.song.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {admin ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <AdminSongChecklist rehearsalId={rehearsal.id} eventId={rehearsal.eventId} />
          </div>
        ) : null}
      </Card>

      {admin ? (
        <AdminAttendance rehearsalId={rehearsal.id} />
      ) : observer ? (
        <Card title={`Kehadiran (${rehearsal.attendance.length})`}>
          {rehearsal.attendance.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada data kehadiran.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {rehearsal.attendance.map((a) => (
                <li
                  key={a.personId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="font-medium">
                    {a.person.displayName}
                    {a.note ? (
                      <span className="block text-xs font-normal text-zinc-500">
                        {a.note}
                      </span>
                    ) : null}
                  </span>
                  <AttendanceBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card title="Kehadiranku">
          {myAttendance ? (
            <div className="flex items-center gap-2 text-sm">
              <AttendanceBadge status={myAttendance.status} />
              {myAttendance.note ? <span>{myAttendance.note}</span> : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Belum dicatat.</p>
          )}
        </Card>
      )}

      {rehearsal.tasks.length > 0 ? (
        <Card title={`Action items (${rehearsal.tasks.length})`}>
          <ul className="flex flex-col gap-2 text-sm">
            {rehearsal.tasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <Link href="/tasks" className="font-medium underline">
                  {t.title}
                </Link>
                <span className="flex items-center gap-1">
                  {isTaskOverdue(t.status, null) ? <OverdueBadge /> : null}
                  <TaskPriorityBadge priority={t.priority} />
                  <TaskStatusBadge status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {admin ? (
        <RehearsalForm
          mode="edit"
          rehearsalId={rehearsal.id}
          defaults={{
            title: rehearsal.title,
            type: rehearsal.type,
            startsAt: toJakartaLocalInput(rehearsal.startsAt),
            endsAt: toJakartaLocalInput(rehearsal.endsAt),
            venueOrMeetingUrl: rehearsal.venueOrMeetingUrl,
            agenda: rehearsal.agenda,
            status: rehearsal.status,
            notes: rehearsal.notes,
          }}
        />
      ) : null}
    </div>
  );
}

async function AdminSongChecklist({
  rehearsalId,
  eventId,
}: {
  rehearsalId: string;
  eventId: string;
}) {
  const [songs, rehearsal] = await Promise.all([
    listSongs(eventId),
    getRehearsal(rehearsalId),
  ]);
  if (!rehearsal) return null;
  return (
    <SongChecklistForm
      rehearsalId={rehearsalId}
      songs={songs.map((s) => ({ id: s.id, title: s.title }))}
      selected={rehearsal.songs.map((s) => s.songId)}
    />
  );
}

async function AdminAttendance({ rehearsalId }: { rehearsalId: string }) {
  const [people, rehearsal] = await Promise.all([
    listPersonnelForAdmin(),
    getRehearsal(rehearsalId),
  ]);
  if (!rehearsal) return null;
  const active = people.filter((p) => p.isActive);
  const rows = new Map(rehearsal.attendance.map((a) => [a.personId, a]));
  return (
    <AttendanceCard>
      <div className="flex flex-col gap-2">
        {active.map((p) => {
          const row = rows.get(p.id);
          return (
            <AttendanceRowForm
              key={p.id}
              rehearsalId={rehearsalId}
              personId={p.id}
              personName={p.displayName}
              current={row?.status}
              currentNote={row?.note}
            />
          );
        })}
      </div>
    </AttendanceCard>
  );
}
