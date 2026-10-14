"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/task-status";
import {
  createTaskAction,
  updateMyTaskStatusAction,
  updateTaskAction,
} from "@server/actions/work";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export interface TaskFormContext {
  people: { id: string; displayName: string }[];
  songs: { id: string; title: string }[];
  rehearsals: { id: string; title: string }[];
}

function TaskFields({
  people,
  songs,
  rehearsals,
  defaults,
}: TaskFormContext & {
  defaults?: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: string;
    assigneePersonId?: string | null;
    relatedSongId?: string | null;
    relatedRehearsalId?: string | null;
  };
}) {
  const d = defaults ?? {};
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="task-title" className="text-sm font-medium">
          Judul
        </label>
        <input
          id="task-title"
          name="title"
          required
          minLength={3}
          maxLength={150}
          defaultValue={d.title ?? ""}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="task-status" className="text-sm font-medium">
            Status
          </label>
          <select id="task-status" name="status" defaultValue={d.status ?? "TODO"} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="task-priority" className="text-sm font-medium">
            Prioritas
          </label>
          <select
            id="task-priority"
            name="priority"
            defaultValue={d.priority ?? "MEDIUM"}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="task-due" className="text-sm font-medium">
            Tenggat (opsional)
          </label>
          <input
            id="task-due"
            name="dueAt"
            type="datetime-local"
            defaultValue={d.dueAt ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="task-assignee" className="text-sm font-medium">
            PIC (opsional, wajib bila Blocked)
          </label>
          <select
            id="task-assignee"
            name="assigneePersonId"
            defaultValue={d.assigneePersonId ?? ""}
            className={inputClass}
          >
            <option value="">Tanpa PIC</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="task-song" className="text-sm font-medium">
            Lagu terkait (opsional)
          </label>
          <select
            id="task-song"
            name="relatedSongId"
            defaultValue={d.relatedSongId ?? ""}
            className={inputClass}
          >
            <option value="">Tanpa lagu</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="task-desc" className="text-sm font-medium">
          Deskripsi / tindak lanjut (wajib bila Blocked)
        </label>
        <textarea
          id="task-desc"
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={d.description ?? ""}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <label htmlFor="task-rehearsal" className="text-sm font-medium">
          Rehearsal terkait (opsional)
        </label>
        <select
          id="task-rehearsal"
          name="relatedRehearsalId"
          defaultValue={d.relatedRehearsalId ?? ""}
          className={inputClass}
        >
          <option value="">Tanpa rehearsal</option>
          {rehearsals.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export function CreateTaskForm({
  eventId,
  context,
}: {
  eventId: string;
  context: TaskFormContext;
}) {
  const [state, formAction, pending] = useActionState(createTaskAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <Card title="Buat task">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <TaskFields
          people={context.people}
          songs={context.songs}
          rehearsals={context.rehearsals}
        />
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {state.ok ? <Alert tone="info">Task dibuat.</Alert> : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Membuat…" : "Buat task"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function EditTaskForm({
  taskId,
  eventId,
  context,
  defaults,
}: {
  taskId: string;
  eventId: string;
  context: TaskFormContext;
  defaults: {
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt: string;
    assigneePersonId: string | null;
    relatedSongId: string | null;
    relatedRehearsalId: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateTaskAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="eventId" value={eventId} />
      <TaskFields
        people={context.people}
        songs={context.songs}
        rehearsals={context.rehearsals}
        defaults={defaults}
      />
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Perubahan disimpan.</Alert> : null}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export function MyTaskStatusForm({
  taskId,
  current,
}: {
  taskId: string;
  current: TaskStatus;
}) {
  const [state, formAction, pending] = useActionState(updateMyTaskStatusAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <select
        name="status"
        aria-label="Ubah status task"
        defaultValue={current}
        className={inputClass}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Update"}
      </Button>
      {!state.ok && state.error ? (
        <span className="w-full text-sm text-red-700 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
