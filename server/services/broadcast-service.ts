import "server-only";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export interface BroadcastRecipient {
  userId: string;
  username: string;
  displayName: string;
  role: Role;
  skills: string[];
  assignmentCount: number;
}

// Active accounts with their linked personnel profile (skills) and song
// assignment count, for the admin broadcast page. Users without a linked
// profile still appear (coordinator-style message).
export async function getBroadcastRecipients(): Promise<BroadcastRecipient[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      person: {
        select: {
          id: true,
          skills: {
            select: { instrumentSkill: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });
  const personIds = users
    .map((u) => u.person?.id)
    .filter((id): id is string => Boolean(id));
  const counts = personIds.length
    ? await prisma.songAssignment.groupBy({
        by: ["personId"],
        where: { personId: { in: personIds } },
        _count: { personId: true },
      })
    : [];
  const countByPerson = new Map(
    counts.map((c) => [c.personId, c._count.personId]),
  );
  return users.map((u) => ({
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    skills: (u.person?.skills ?? []).map((s) => s.instrumentSkill.name),
    assignmentCount: u.person ? (countByPerson.get(u.person.id) ?? 0) : 0,
  }));
}
