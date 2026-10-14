import "server-only";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { PersonInput } from "@/lib/validation/personnel";

export interface PersonSkillView {
  instrumentSkillId: string;
  name: string;
  proficiencyNote: string | null;
}

export interface AdminPersonView {
  id: string;
  userId: string | null;
  username: string | null;
  displayName: string;
  congregation: string | null;
  contact: string | null;
  notes: string | null;
  isConfirmed: boolean;
  isActive: boolean;
  skills: PersonSkillView[];
}

export interface RosterPersonView {
  id: string;
  displayName: string;
  congregation: string | null;
  isConfirmed: boolean;
  skills: PersonSkillView[];
}

const skillInclude = {
  skills: {
    include: { instrumentSkill: { select: { id: true, name: true } } },
    orderBy: { instrumentSkill: { name: "asc" as const } },
  },
} as const;

function toSkillViews(
  person: { skills: { proficiencyNote: string | null; instrumentSkill: { id: string; name: string } }[] },
): PersonSkillView[] {
  return person.skills.map((s) => ({
    instrumentSkillId: s.instrumentSkill.id,
    name: s.instrumentSkill.name,
    proficiencyNote: s.proficiencyNote,
  }));
}

export async function listPersonnelForAdmin(): Promise<AdminPersonView[]> {
  const people = await prisma.person.findMany({
    include: {
      ...skillInclude,
      user: { select: { username: true } },
    },
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
  });
  return people.map((p) => ({
    id: p.id,
    userId: p.userId,
    username: p.user?.username ?? null,
    displayName: p.displayName,
    congregation: p.congregation,
    contact: p.contact,
    notes: p.notes,
    isConfirmed: p.isConfirmed,
    isActive: p.isActive,
    skills: toSkillViews(p),
  }));
}

// Roster untuk user biasa: hanya yang aktif + terkonfirmasi,
// tanpa kontak dan tanpa identitas login.
export async function listRosterForUsers(): Promise<RosterPersonView[]> {
  const people = await prisma.person.findMany({
    where: { isActive: true, isConfirmed: true },
    include: skillInclude,
    orderBy: { displayName: "asc" },
  });
  return people.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    congregation: p.congregation,
    isConfirmed: p.isConfirmed,
    skills: toSkillViews(p),
  }));
}

export async function createPerson(
  actorUserId: string,
  input: PersonInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const person = await prisma.person.create({
    data: {
      displayName: input.displayName,
      congregation: input.congregation || null,
      contact: input.contact || null,
      notes: input.notes || null,
      isConfirmed: input.isConfirmed,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.PERSON_CREATED,
    entityType: "Person",
    entityId: person.id,
    summary: `Personel ${person.displayName} ditambahkan.`,
    metadata: { displayName: person.displayName },
  });
  return { ok: true, id: person.id };
}

export async function updatePerson(
  actorUserId: string,
  id: string,
  input: PersonInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Personel tidak ditemukan." };
  const person = await prisma.person.update({
    where: { id },
    data: {
      displayName: input.displayName,
      congregation: input.congregation || null,
      contact: input.contact || null,
      notes: input.notes || null,
      isConfirmed: input.isConfirmed,
    },
  });
  const confirmNote =
    existing.isConfirmed !== person.isConfirmed
      ? person.isConfirmed
        ? " (dikonfirmasi)"
        : " (konfirmasi dicabut)"
      : "";
  await writeAudit({
    actorUserId,
    action: AuditAction.PERSON_UPDATED,
    entityType: "Person",
    entityId: id,
    summary: `Personel ${person.displayName} diubah${confirmNote}.`,
    metadata: { displayName: person.displayName },
  });
  return { ok: true };
}

export async function setPersonActive(
  actorUserId: string,
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Personel tidak ditemukan." };
  await prisma.person.update({ where: { id }, data: { isActive } });
  await writeAudit({
    actorUserId,
    action: AuditAction.PERSON_UPDATED,
    entityType: "Person",
    entityId: id,
    summary: `Personel ${existing.displayName} ${isActive ? "diaktifkan" : "dinonaktifkan"}.`,
    metadata: { displayName: existing.displayName },
  });
  return { ok: true };
}

// Dipakai saat admin membuat akun: setiap login identity mendapat
// operational identity. Idempoten bila person sudah tertaut; bila ada
// profil tanpa akun dengan nama yang sama (mis. dari seed), tautkan
// profil itu alih-alih membuat duplikat.
export async function ensurePersonForUser(
  userId: string,
  displayName: string,
): Promise<void> {
  const existing = await prisma.person.findUnique({ where: { userId } });
  if (existing) return;
  // TiDB/MySQL collation (_ci) is already case-insensitive, so plain
  // equals matches display names regardless of case. `mode: insensitive`
  // does not exist on the MySQL provider.
  const sameName = await prisma.person.findFirst({
    where: { userId: null, displayName: { equals: displayName } },
  });
  if (sameName) {
    await prisma.person.update({
      where: { id: sameName.id },
      data: { userId },
    });
    return;
  }
  await prisma.person.create({
    data: { userId, displayName, isConfirmed: false, isActive: true },
  });
}

export async function syncPersonActiveForUser(
  userId: string,
  isActive: boolean,
): Promise<void> {
  await prisma.person
    .updateMany({ where: { userId }, data: { isActive } })
    .catch(() => {});
}

export async function listSkills(): Promise<{ id: string; name: string }[]> {
  return prisma.instrumentSkill.findMany({ orderBy: { name: "asc" } });
}

export async function createSkill(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const normalized = name.trim();
  const existing = await prisma.instrumentSkill.findFirst({
    where: { name: { equals: normalized } },
  });
  if (existing) return { ok: false, error: "Skill sudah ada." };
  const skill = await prisma.instrumentSkill.create({
    data: { name: normalized },
  });
  return { ok: true, id: skill.id };
}

export async function assignSkill(
  personId: string,
  instrumentSkillId: string,
  proficiencyNote?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return { ok: false, error: "Personel tidak ditemukan." };
  const skill = await prisma.instrumentSkill.findUnique({
    where: { id: instrumentSkillId },
  });
  if (!skill) return { ok: false, error: "Skill tidak ditemukan." };
  const existing = await prisma.personSkill.findUnique({
    where: { personId_instrumentSkillId: { personId, instrumentSkillId } },
  });
  if (existing) return { ok: false, error: "Skill sudah dimiliki personel." };
  await prisma.personSkill.create({
    data: {
      personId,
      instrumentSkillId,
      proficiencyNote: proficiencyNote || null,
    },
  });
  return { ok: true };
}

export async function unassignSkill(
  personId: string,
  instrumentSkillId: string,
): Promise<void> {
  await prisma.personSkill
    .delete({
      where: { personId_instrumentSkillId: { personId, instrumentSkillId } },
    })
    .catch(() => {});
}

export async function deleteSkill(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inUse = await prisma.personSkill.count({
    where: { instrumentSkillId: id },
  });
  if (inUse > 0) {
    return {
      ok: false,
      error: `Skill masih dipakai ${inUse} personel; lepas dulu sebelum dihapus.`,
    };
  }
  await prisma.instrumentSkill.delete({ where: { id } }).catch(() => {});
  return { ok: true };
}
