import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser } from "@/lib/auth";
import { formatJakarta } from "@/lib/format";
import { listUsers } from "@server/services/user-service";
import { CreateUserForm } from "./CreateUserForm";
import {
  ActiveToggleForm,
  EditUserForm,
  InviteLinkForm,
  ResetPasswordForm,
} from "./UserRowForms";

export default async function PeoplePage() {
  const admin = await requireAdminUser();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Personel &amp; Akses
      </h1>
      <CreateUserForm />
      <Card title={`Terdaftar (${users.length})`}>
        {users.length === 0 ? (
          <EmptyState title="Belum ada akun" />
        ) : (
          <ul className="flex flex-col gap-4">
            {users.map((u) => {
              const isSelf = u.id === admin.id;
              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{u.displayName}</p>
                    <Badge tone={u.role === "ADMIN" ? "success" : "neutral"}>
                      {u.role}
                    </Badge>
                    {u.isActive ? (
                      <Badge tone="success">Aktif</Badge>
                    ) : (
                      <Badge tone="danger">Nonaktif</Badge>
                    )}
                    {u.mustChangePassword ? (
                      <Badge tone="warning">Password sementara</Badge>
                    ) : null}
                    {isSelf ? <Badge tone="neutral">Ini kamu</Badge> : null}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    @{u.username}
                    {u.lastLoginAt
                      ? ` · login terakhir ${formatJakarta(u.lastLoginAt)}`
                      : " · belum pernah login"}
                  </p>
                  <EditUserForm
                    userId={u.id}
                    displayName={u.displayName}
                    role={u.role}
                    disabled={isSelf}
                  />
                  <div className="flex flex-wrap gap-4">
                    <ResetPasswordForm
                      userId={u.id}
                      username={u.username}
                    />
                    <InviteLinkForm userId={u.id} username={u.username} />
                    <ActiveToggleForm
                      userId={u.id}
                      isActive={u.isActive}
                      disabled={isSelf}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
