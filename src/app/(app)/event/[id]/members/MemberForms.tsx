"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { EventRole } from "@/generated/prisma/client";
import {
  addEventMemberAction,
  changeEventMemberRoleAction,
  removeEventMemberAction,
} from "@server/actions/event-membership";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function ActionMessage({
  state,
}: {
  state: { ok: boolean; error?: string };
}) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok) return <Alert tone="info">Perubahan disimpan.</Alert>;
  return null;
}

function RoleOptions() {
  return (
    <>
      <option value="MEMBER">Member</option>
      <option value="OBSERVER">Pantau</option>
      <option value="EVENT_ADMIN">Admin event</option>
    </>
  );
}

export function AddEventMemberForm({
  eventId,
  username,
}: {
  eventId: string;
  username: string;
}) {
  const [state, formAction, pending] = useActionState(addEventMemberAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="username" value={username} />
      <label className="sr-only" htmlFor={`role-${username}`}>Role event</label>
      <select
        id={`role-${username}`}
        name="role"
        defaultValue="MEMBER"
        className={inputClass}
      >
        <RoleOptions />
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Menambahkan…" : "Tambahkan"}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function EventMemberRoleForm({
  eventId,
  membershipId,
  role,
}: {
  eventId: string;
  membershipId: string;
  role: EventRole;
}) {
  const [state, formAction, pending] = useActionState(
    changeEventMemberRoleAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <label className="sr-only" htmlFor={`membership-role-${membershipId}`}>
        Role event
      </label>
      <select
        id={`membership-role-${membershipId}`}
        name="role"
        defaultValue={role}
        className={inputClass}
      >
        <RoleOptions />
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        Simpan role
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function RemoveEventMemberButton({
  eventId,
  membershipId,
  displayName,
}: {
  eventId: string;
  membershipId: string;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(
    removeEventMemberAction,
    { ok: false },
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(`Keluarkan ${displayName} dari event ini?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="membershipId" value={membershipId} />
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          Keluarkan
        </Button>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}
