import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import {
  listPersonnelForAdmin,
  listRosterForUsers,
  listSkills,
  type RosterPersonView,
} from "@server/services/personnel-service";
import {
  CreatePersonForm,
  EditPersonForm,
  PersonActiveToggle,
} from "./PersonForms";
import {
  AssignSkillForm,
  SkillManager,
  UnassignSkillButton,
} from "./SkillForms";

function SkillBadges({
  personId,
  skills,
  manageable,
}: {
  personId: string;
  skills: RosterPersonView["skills"];
  manageable?: boolean;
}) {
  if (skills.length === 0) {
    return <span className="text-sm text-zinc-500">Belum ada skill.</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1">
      {skills.map((s) => (
        <li key={s.instrumentSkillId}>
          <Badge tone="neutral">
            {s.name}
            {s.proficiencyNote ? ` · ${s.proficiencyNote}` : ""}
            {manageable ? (
              <>
                {" "}
                <UnassignSkillButton
                  personId={personId}
                  instrumentSkillId={s.instrumentSkillId}
                  name={s.name}
                />
              </>
            ) : null}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export default async function TeamPage() {
  const user = await requireFreshUser();

  if (!isAdmin(user)) {
    const roster = await listRosterForUsers();
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Tim</h1>
        {roster.length === 0 ? (
          <EmptyState
            title="Roster belum tersedia"
            description="Daftar personel terkonfirmasi akan tampil di sini."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roster.map((p) => (
              <li key={p.id}>
                <Card title={p.displayName}>
                  {p.congregation ? (
                    <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {p.congregation}
                    </p>
                  ) : null}
                  <SkillBadges personId={p.id} skills={p.skills} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [people, skills] = await Promise.all([
    listPersonnelForAdmin(),
    listSkills(),
  ]);
  const usage: Record<string, number> = {};
  for (const p of people) {
    for (const s of p.skills) usage[s.instrumentSkillId] = (usage[s.instrumentSkillId] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Tim &amp; Personel
      </h1>
      <CreatePersonForm />
      <SkillManager skills={skills} usage={usage} />
      <Card title={`Personel (${people.length})`}>
        {people.length === 0 ? (
          <EmptyState title="Belum ada personel" />
        ) : (
          <ul className="flex flex-col gap-4">
            {people.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.displayName}</p>
                  {p.isActive ? (
                    <Badge tone="success">Aktif</Badge>
                  ) : (
                    <Badge tone="danger">Nonaktif</Badge>
                  )}
                  {p.isConfirmed ? (
                    <Badge tone="success">Terkonfirmasi</Badge>
                  ) : (
                    <Badge tone="warning">Belum konfirmasi</Badge>
                  )}
                  {p.username ? (
                    <Badge tone="neutral">@{p.username}</Badge>
                  ) : (
                    <Badge tone="neutral">Tanpa akun</Badge>
                  )}
                  {p.congregation ? (
                    <span className="text-sm text-zinc-500">{p.congregation}</span>
                  ) : null}
                </div>
                {p.contact ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Kontak (admin): {p.contact}
                  </p>
                ) : null}
                {p.notes ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {p.notes}
                  </p>
                ) : null}
                <SkillBadges personId={p.id} skills={p.skills} manageable />
                <AssignSkillForm personId={p.id} skills={skills} />
                <EditPersonForm
                  personId={p.id}
                  displayName={p.displayName}
                  congregation={p.congregation}
                  contact={p.contact}
                  notes={p.notes}
                  isConfirmed={p.isConfirmed}
                />
                <PersonActiveToggle personId={p.id} isActive={p.isActive} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
