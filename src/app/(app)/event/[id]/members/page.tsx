import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { canManageMembers, isAdmin } from "@/lib/permissions";
import { getAccessibleEvent, getEventRole } from "@server/services/event-access";
import {
  listEventMemberships,
  searchAssignableUsers,
} from "@server/services/event-membership-service";
import { AddEventMemberForm, EventMemberRoleForm, RemoveEventMemberButton } from "./MemberForms";

async function EventMembersContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const user = await requireFreshUser();
  const { id: eventId } = await params;
  const query = (await searchParams).q?.trim() ?? "";
  const event = await getAccessibleEvent(user, eventId);
  if (!event) notFound();

  const role = await getEventRole(user, event.id);
  const canManage = canManageMembers(role) || isAdmin(user);
  if (!canManage) notFound();

  const [memberships, accounts] = await Promise.all([
    listEventMemberships(event.id),
    searchAssignableUsers(event.id, query),
  ]);
  const readOnly = Boolean(event.accessClosedAt) && !isAdmin(user);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Anggota event
          </h1>
          <p className="text-sm text-zinc-500">{event.name}</p>
        </div>
        <Link href={`/event/${event.id}`} className="text-sm font-medium underline">
          Kembali ke event
        </Link>
      </div>
      {readOnly ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Event tertutup; membership hanya dapat dilihat.
        </p>
      ) : null}
      <Card title={`Anggota (${memberships.length})`}>
        {memberships.length === 0 ? (
          <EmptyState title="Belum ada anggota event" />
        ) : (
          <ul className="flex flex-col gap-3">
            {memberships.map((membership) => (
              <li
                key={membership.id}
                className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{membership.user.displayName}</span>
                  <span className="text-sm text-zinc-500">@{membership.user.username}</span>
                  <Badge tone={membership.user.isActive ? "success" : "danger"}>
                    {membership.user.isActive ? "Akun aktif" : "Akun nonaktif"}
                  </Badge>
                  {membership.user.role === "ADMIN" ? (
                    <Badge tone="neutral">Superadmin</Badge>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {readOnly ? (
                    <Badge tone="neutral">{membership.role}</Badge>
                  ) : (
                    <EventMemberRoleForm
                      eventId={event.id}
                      membershipId={membership.id}
                      role={membership.role}
                    />
                  )}
                  {!readOnly ? (
                    <RemoveEventMemberButton
                      eventId={event.id}
                      membershipId={membership.id}
                      displayName={membership.user.displayName}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {!readOnly ? (
        <Card title="Tambahkan akun yang sudah ada">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Akun harus sudah dibuat oleh superadmin dan berstatus aktif. Tidak ada akun baru atau password yang dibuat di sini.
          </p>
          <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="account-search" className="sr-only">
              Cari username atau nama
            </label>
            <input
              id="account-search"
              name="q"
              type="search"
              minLength={2}
              maxLength={100}
              defaultValue={query}
              placeholder="Cari username atau nama (min. 2 karakter)"
              className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
            >
              Cari
            </button>
          </form>
          {!query || query.length < 2 ? (
            <p className="text-sm text-zinc-500">
              Ketik minimal dua karakter untuk mencari akun aktif.
            </p>
          ) : accounts.length === 0 ? (
            <EmptyState title="Tidak ada akun aktif yang cocok dan belum menjadi anggota" />
          ) : (
            <ul className="flex flex-col gap-3">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                >
                  <span>
                    <span className="font-medium">{account.displayName}</span>
                    <span className="ml-2 text-sm text-zinc-500">
                      @{account.username}
                    </span>
                  </span>
                  <AddEventMemberForm
                    eventId={event.id}
                    username={account.username}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}

export default function EventMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p aria-busy="true" aria-live="polite" className="text-sm text-zinc-500">
          Memuat anggota...
        </p>
      }
    >
      <EventMembersContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
