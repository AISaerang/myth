import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { isTaskOverdue } from "@/lib/task-status";
import { getCurrentEvent } from "@server/services/event-service";
import {
  getAdminReadiness,
  getUserDashboard,
} from "@server/services/dashboard-service";
import { SongStatusBadge } from "../songs/SongStatusBadge";
import { EventStatusBadge } from "../event/EventStatusBadge";
import { RehearsalTypeBadge } from "../rehearsals/OpsBadges";
import { AdminTimelineCard, UserTimelineCard } from "./TimelineCard";
import { MATERIAL_CATEGORY_LABEL } from "../songs/material-labels";
import {
  OverdueBadge,
  PracticeStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "../tasks/WorkBadges";

const linkCard =
  "block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900";

export default async function DashboardPage() {
  const user = await requireFreshUser();
  const event = await getCurrentEvent();

  if (!event) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Halo, {user.displayName}
        </h1>
        {isAdmin(user) ? (
          <Card title="Mulai dari event brief">
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Buat event dulu, lalu kelola personel, lagu, dan jadwal dari navigasi.
            </p>
            <Link href="/event" className="font-medium underline">
              Buka Event Brief
            </Link>
          </Card>
        ) : (
          <EmptyState
            title="Belum ada event aktif"
            description="Event brief akan tampil di sini setelah admin membuatnya."
          />
        )}
      </div>
    );
  }

  if (isAdmin(user)) {
    const data = await getAdminReadiness(event.id);
    const c = data.counts;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {event.name}
          </h1>
          <EventStatusBadge status={event.eventStatus} />
        </div>
        {event.eventDate ? (
          <p className="text-sm text-zinc-500">
            {formatJakarta(event.eventDate, { hour: undefined, minute: undefined })}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link href="/songs" className={linkCard}>
            <p className="text-2xl font-bold">{c.totalSongs}</p>
            <p className="text-sm text-zinc-500">Total lagu</p>
          </Link>
          <Link href="/songs" className={linkCard}>
            <p className="text-2xl font-bold">{c.attentionSongs}</p>
            <p className="text-sm text-zinc-500">Lagu perlu review</p>
          </Link>
          <Link href="/batches" className={linkCard}>
            <p className="text-2xl font-bold">
              {data.batches.filter((b) => b.status === "COMPLETED").length}/{data.batches.length}
            </p>
            <p className="text-sm text-zinc-500">Batch selesai</p>
          </Link>
          <Link href={`/tasks?eventId=${event.id}&filter=overdue`} className={linkCard}>
            <p className="text-2xl font-bold">{c.overdueTasks}</p>
            <p className="text-sm text-zinc-500">Task terlambat</p>
          </Link>
          <Link href={`/tasks?eventId=${event.id}&filter=blocked`} className={linkCard}>
            <p className="text-2xl font-bold">{c.blockedTasks}</p>
            <p className="text-sm text-zinc-500">Task blocked</p>
          </Link>
          <Link href={`/equipment?eventId=${event.id}&filter=BLOCKED`} className={linkCard}>
            <p className="text-2xl font-bold">{c.blockedEquipment}</p>
            <p className="text-sm text-zinc-500">Blocker teknis</p>
          </Link>
        </div>

        <AdminTimelineCard
          eventId={event.id}
          eventName={event.name}
          eventDate={event.eventDate}
        />

        {c.blockedTasks + c.overdueTasks + c.blockedEquipment + c.helpNeeded > 0 ? (
          <Card title="Perlu ditindaklanjuti">
            <ul className="flex flex-col gap-2 text-sm">
              {data.blockedTasks.map((t) => (
                <li key={`bt-${t.id}`}>
                  <Badge tone="danger">Blocked</Badge>{" "}
                  <Link href="/tasks" className="font-medium underline">
                    {t.title}
                  </Link>
                  {t.assignee ? ` — PIC ${t.assignee.displayName}` : " — tanpa PIC"}
                </li>
              ))}
              {data.overdueTasks
                .filter((t) => t.status !== "BLOCKED")
                .map((t) => (
                  <li key={`ot-${t.id}`}>
                    <Badge tone="danger">Terlambat</Badge>{" "}
                    <Link href="/tasks" className="font-medium underline">
                      {t.title}
                    </Link>
                  </li>
                ))}
              {data.blockedEquipment.map((e) => (
                <li key={`be-${e.id}`}>
                  <Badge tone="danger">Teknis</Badge>{" "}
                  <Link href="/equipment" className="font-medium underline">
                    {e.name}
                  </Link>
                  {e.assignee ? ` — PIC ${e.assignee.displayName}` : " — tanpa PIC"}
                </li>
              ))}
              {data.helpNeeded.map((h, i) => (
                <li key={`ph-${i}`}>
                  <Badge tone="danger">Perlu bantuan</Badge>{" "}
                  <Link href={`/songs/${h.song.id}`} className="font-medium underline">
                    {h.song.title}
                  </Link>{" "}
                  — {h.person.displayName}
                  {h.note ? `: ${h.note}` : ""}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card title="Perlu ditindaklanjuti">
            <p className="text-sm text-zinc-500">
              Nihil — semua terpantau aman.
            </p>
          </Card>
        )}

        <Card title="Kesiapan lagu">
          {data.songs.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada lagu.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.songs.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <Link href={`/songs/${s.id}`} className="font-medium underline">
                    {s.title}
                  </Link>
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500">
                      {s._count.assignments} personel
                    </span>
                    {!s.isPublished ? <Badge tone="neutral">Draft</Badge> : null}
                    <SongStatusBadge status={s.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Rehearsal berikutnya">
          {data.upcomingRehearsals.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada jadwal.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.upcomingRehearsals.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/rehearsals/${r.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <span>
                      <span className="font-medium">{r.title}</span>
                      <span className="block text-xs text-zinc-500">
                        {formatJakarta(r.startsAt)}
                      </span>
                    </span>
                    <RehearsalTypeBadge type={r.type} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Checklist teknis">
          {data.equipment.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada item.</p>
          ) : (
            <p className="text-sm">
              {data.equipment.filter((e) => e.status === "TESTED").length}/
              {data.equipment.length} teruji ·{" "}
              {data.equipment.filter((e) => e.status === "BLOCKED").length} blocked ·{" "}
              {data.equipment.filter((e) => e.status === "NOT_CHECKED").length} belum dicek —{" "}
              <Link href="/equipment" className="font-medium underline">
                buka checklist
              </Link>
            </p>
          )}
        </Card>

        <Card title="Update terbaru">
          {data.latestAudit.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada aktivitas.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.latestAudit.map((a) => (
                <li key={a.id} className="text-zinc-600 dark:text-zinc-400">
                  {a.summary}{" "}
                  <span className="text-xs text-zinc-400">
                    · {formatJakarta(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  const data = await getUserDashboard(user.id, event.id);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Halo, {user.displayName}
        </h1>
      </div>
      <p className="text-sm text-zinc-500">
        {event.name}
        {event.eventDate
          ? ` · ${formatJakarta(event.eventDate, { hour: undefined, minute: undefined })}`
          : ""}
      </p>

      {data.upcomingRehearsals.length > 0 ? (
        <Card title="Rehearsal berikutnya">
          <ul className="flex flex-col gap-1">
            {data.upcomingRehearsals.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/rehearsals/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-zinc-500">
                      {formatJakarta(r.startsAt)}
                    </span>
                  </span>
                  <RehearsalTypeBadge type={r.type} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title={`Laguku (${data.mySongs.length})`}>
        {data.mySongs.length === 0 ? (
          <EmptyState
            title="Belum ada lagu untukmu"
            description="Admin/MD akan menugaskan lagu yang perlu dipelajari."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {data.mySongs.map((a) => (
              <li key={a.song.id}>
                <Link
                  href={`/songs/${a.song.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    <span className="font-medium">{a.song.title}</span>
                    <span className="block text-xs text-zinc-500">
                      {a.instrumentSkill ? `Part: ${a.instrumentSkill.name}` : ""}
                    </span>
                  </span>
                  <PracticeStatusBadge
                    status={a.song.progress[0]?.status ?? "NOT_STARTED"}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <UserTimelineCard
        userId={user.id}
        eventId={event.id}
        eventName={event.name}
        eventDate={event.eventDate}
      />

      {data.myTasks.length > 0 ? (
        <Card title={`Task aktifku (${data.myTasks.length})`}>
          <ul className="flex flex-col gap-1 text-sm">
            {data.myTasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <Link href="/tasks" className="font-medium underline">
                  {t.title}
                </Link>
                <span className="flex items-center gap-1">
                  {isTaskOverdue(t.status, t.dueAt) ? <OverdueBadge /> : null}
                  <TaskPriorityBadge priority={t.priority} />
                  <TaskStatusBadge status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.latestMaterials.length > 0 ? (
        <Card title="Materi terbaru">
          <ul className="flex flex-col gap-1 text-sm">
            {data.latestMaterials.map((m) => (
              <li key={m.id}>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  {m.title}
                </a>{" "}
                <span className="text-zinc-500">
                  · {MATERIAL_CATEGORY_LABEL[m.category]} ·{" "}
                  <Link href={`/songs/${m.song.id}`} className="underline">
                    {m.song.title}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
