import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { isTaskOverdue } from "@/lib/task-status";
import { prisma } from "@/lib/db";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import { listPersonnelForAdmin } from "@server/services/personnel-service";
import { listRehearsals } from "@server/services/rehearsal-service";
import { listSongs } from "@server/services/song-service";
import { listRelevantTasks, listTasks } from "@server/services/task-service";
import { EventPicker } from "../songs/EventPicker";
import { CreateTaskForm, EditTaskForm, MyTaskStatusForm } from "./TaskForms";
import {
  OverdueBadge,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "./WorkBadges";

type Filter = "all" | "active" | "blocked" | "overdue" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "blocked", label: "Blocked" },
  { value: "overdue", label: "Terlambat" },
  { value: "done", label: "Selesai" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; filter?: string }>;
}) {
  const user = await requireFreshUser();
  const params = await searchParams;
  const admin = isAdmin(user);

  const events = await listEvents();
  if (events.length === 0) {
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum mengelola task."
      />
    );
  }
  const current = await getCurrentEvent();
  const eventId =
    params.eventId && events.some((e) => e.id === params.eventId)
      ? params.eventId
      : (current?.id ?? events[0].id);
  const filter: Filter = FILTERS.some((f) => f.value === params.filter)
    ? (params.filter as Filter)
    : "all";

  const all = admin
    ? await listTasks(eventId)
    : await listRelevantTasks(user.id, eventId);

  const visible = all.filter((t) => {
    const overdue = isTaskOverdue(t.status, t.dueAt);
    switch (filter) {
      case "active":
        return t.status === "TODO" || t.status === "IN_PROGRESS" || t.status === "BLOCKED";
      case "blocked":
        return t.status === "BLOCKED";
      case "overdue":
        return overdue;
      case "done":
        return t.status === "DONE" || t.status === "CANCELLED";
      default:
        return true;
    }
  });
  const blocked = all.filter((t) => t.status === "BLOCKED");
  const overdue = all.filter((t) => isTaskOverdue(t.status, t.dueAt));

  const [people, songs, rehearsals] = admin
    ? await Promise.all([
        listPersonnelForAdmin().then((p) =>
          p.filter((x) => x.isActive).map((x) => ({ id: x.id, displayName: x.displayName })),
        ),
        listSongs(eventId).then((s) => s.map((x) => ({ id: x.id, title: x.title }))),
        listRehearsals(eventId).then((r) => r.map((x) => ({ id: x.id, title: x.title }))),
      ])
    : [[], [], []];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {admin ? "Tasks & Blockers" : "Task Saya"}
        </h1>
        {admin ? (
          <EventPicker
            events={events.map((e) => ({ id: e.id, name: e.name }))}
            value={eventId}
          />
        ) : null}
      </div>

      {admin && (blocked.length > 0 || overdue.length > 0) ? (
        <Card title="Perlu perhatian">
          <ul className="flex flex-col gap-1 text-sm">
            {blocked.map((t) => (
              <li key={t.id}>
                Blocked: <span className="font-medium">{t.title}</span>
                {t.assignee ? ` — PIC ${t.assignee.displayName}` : " — tanpa PIC"}
              </li>
            ))}
            {overdue
              .filter((t) => t.status !== "BLOCKED")
              .map((t) => (
                <li key={t.id}>
                  Terlambat: <span className="font-medium">{t.title}</span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      <nav aria-label="Filter task" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/tasks?eventId=${eventId}&filter=${f.value}`}
            aria-current={filter === f.value ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              filter === f.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {admin ? (
        <CreateTaskForm eventId={eventId} context={{ people, songs, rehearsals }} />
      ) : null}

      <Card title={`${visible.length} task`}>
        {visible.length === 0 ? (
          <EmptyState title="Tidak ada task pada filter ini" />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{t.title}</p>
                  <span className="flex items-center gap-1">
                    {isTaskOverdue(t.status, t.dueAt) ? <OverdueBadge /> : null}
                    <TaskPriorityBadge priority={t.priority} />
                    <TaskStatusBadge status={t.status} />
                  </span>
                </div>
                {t.description ? (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {t.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {t.assignee ? `PIC: ${t.assignee.displayName}` : "Tanpa PIC"}
                  {t.relatedSong ? ` · Lagu: ${t.relatedSong.title}` : ""}
                  {t.relatedRehearsal ? ` · Rehearsal: ${t.relatedRehearsal.title}` : ""}
                  {t.dueAt ? ` · Tenggat ${formatJakarta(t.dueAt)}` : ""}
                </p>
                {admin ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium underline">
                      Ubah
                    </summary>
                    <div className="mt-2">
                      <EditTaskForm
                        taskId={t.id}
                        eventId={eventId}
                        context={{ people, songs, rehearsals }}
                        defaults={{
                          title: t.title,
                          description: t.description,
                          status: t.status,
                          priority: t.priority,
                          dueAt: t.dueAt
                            ? new Date(t.dueAt).toISOString().slice(0, 16)
                            : "",
                          assigneePersonId: t.assigneePersonId,
                          relatedSongId: t.relatedSongId,
                          relatedRehearsalId: t.relatedRehearsalId,
                        }}
                      />
                    </div>
                  </details>
                ) : (
                  <UserTaskAction taskId={t.id} status={t.status} userId={user.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function UserTaskAction({
  taskId,
  status,
  userId,
}: {
  taskId: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  userId: string;
}) {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) return null;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.assigneePersonId !== person.id) return null;
  return (
    <div className="mt-2">
      <MyTaskStatusForm taskId={taskId} current={status} />
    </div>
  );
}
