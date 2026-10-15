import "server-only";
import { prisma } from "@/lib/db";
import { isTaskOverdue } from "@/lib/task-status";

// Readiness dashboard MD (docs/01): status lagu/batch, blocker,
// overdue, rehearsal berikutnya, kesiapan teknis, update terbaru.
// Semua angka bisa diklik menuju datanya (docs/04).
export async function getAdminReadiness(eventId: string, now: Date = new Date()) {
  const [
    songs,
    batches,
    tasks,
    equipment,
    upcomingRehearsals,
    helpNeeded,
    latestAudit,
  ] = await Promise.all([
    prisma.song.findMany({
      where: { eventId },
      select: {
        id: true,
        title: true,
        status: true,
        isPublished: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.songBatch.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { eventId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        assignee: { select: { displayName: true } },
      },
    }),
    prisma.equipmentItem.findMany({
      where: { eventId },
      select: { id: true, name: true, status: true, assignee: { select: { displayName: true } } },
    }),
    prisma.rehearsal.findMany({
      where: {
        eventId,
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
        startsAt: { gte: now },
      },
      select: { id: true, title: true, type: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.practiceProgress.findMany({
      where: { song: { eventId }, status: "NEEDS_HELP" },
      select: {
        song: { select: { id: true, title: true } },
        person: { select: { displayName: true } },
        note: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, summary: true, createdAt: true },
    }),
  ]);

  const overdueTasks = tasks.filter((t) => isTaskOverdue(t.status, t.dueAt, now));
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
  const blockedEquipment = equipment.filter((e) => e.status === "BLOCKED");
  const attentionSongs = songs.filter((s) => s.status === "NEEDS_REVIEW");

  return {
    songs,
    batches,
    overdueTasks,
    blockedTasks,
    blockedEquipment,
    attentionSongs,
    helpNeeded,
    upcomingRehearsals,
    equipment,
    latestAudit,
    counts: {
      totalSongs: songs.length,
      attentionSongs: attentionSongs.length,
      overdueTasks: overdueTasks.length,
      blockedTasks: blockedTasks.length,
      blockedEquipment: blockedEquipment.length,
      helpNeeded: helpNeeded.length,
    },
  };
}

// Dashboard pemantau (OBSERVER): seperti admin tapi Publish-only.
// Tidak ada kontak pribadi, invite, password, atau audit sensitif.
// DRAFT internal tidak pernah masuk angka maupun list.
export async function getObserverDashboard(eventId: string, now: Date = new Date()) {
  const [
    songs,
    batches,
    tasks,
    equipment,
    upcomingRehearsals,
    helpNeeded,
  ] = await Promise.all([
    prisma.song.findMany({
      where: { eventId, isPublished: true },
      select: {
        id: true,
        title: true,
        status: true,
        isPublished: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.songBatch.findMany({
      where: { eventId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: {
        eventId,
        OR: [
          { relatedSongId: null },
          { relatedSong: { isPublished: true } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        assignee: { select: { displayName: true } },
      },
    }),
    prisma.equipmentItem.findMany({
      where: { eventId },
      select: { id: true, name: true, status: true, assignee: { select: { displayName: true } } },
    }),
    prisma.rehearsal.findMany({
      where: {
        eventId,
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
        startsAt: { gte: now },
      },
      select: { id: true, title: true, type: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.practiceProgress.findMany({
      where: { song: { eventId, isPublished: true }, status: "NEEDS_HELP" },
      select: {
        song: { select: { id: true, title: true } },
        person: { select: { displayName: true } },
        note: true,
      },
    }),
  ]);

  const overdueTasks = tasks.filter((t) => isTaskOverdue(t.status, t.dueAt, now));
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
  const blockedEquipment = equipment.filter((e) => e.status === "BLOCKED");
  const attentionSongs = songs.filter((s) => s.status === "NEEDS_REVIEW");

  return {
    songs,
    batches,
    overdueTasks,
    blockedTasks,
    blockedEquipment,
    attentionSongs,
    helpNeeded,
    upcomingRehearsals,
    equipment,
    counts: {
      totalSongs: songs.length,
      attentionSongs: attentionSongs.length,
      overdueTasks: overdueTasks.length,
      blockedTasks: blockedTasks.length,
      blockedEquipment: blockedEquipment.length,
      helpNeeded: helpNeeded.length,
    },
  };
}

// Dashboard personal personel (docs/01, docs/04).
export async function getUserDashboard(userId: string, eventId: string, now: Date = new Date()) {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) {
    return {
      mySongs: [],
      myTasks: [],
      upcomingRehearsals: [],
      latestMaterials: [],
    };
  }
  const [assignments, tasks, upcomingRehearsals, latestMaterials] =
    await Promise.all([
      prisma.songAssignment.findMany({
        where: { personId: person.id, song: { eventId, isPublished: true } },
        select: {
          song: {
            select: {
              id: true,
              title: true,
              status: true,
              liturgicalFunction: true,
              progress: {
                where: { personId: person.id },
                select: { status: true },
              },
            },
          },
          instrumentSkill: { select: { name: true } },
        },
        orderBy: { song: { title: "asc" } },
      }),
      prisma.task.findMany({
        where: {
          eventId,
          OR: [
            { assigneePersonId: person.id },
            {
              relatedSong: {
                assignments: { some: { personId: person.id } },
              },
            },
          ],
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueAt: true,
          assigneePersonId: true,
        },
        orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
        take: 10,
      }),
      prisma.rehearsal.findMany({
        where: {
          eventId,
          status: { in: ["SCHEDULED", "RESCHEDULED"] },
          startsAt: { gte: now },
        },
        select: { id: true, title: true, type: true, startsAt: true, venueOrMeetingUrl: true },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      prisma.songMaterial.findMany({
        where: {
          song: { eventId, isPublished: true, assignments: { some: { personId: person.id } } },
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          category: true,
          url: true,
          song: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
  return {
    mySongs: assignments,
    myTasks: tasks,
    upcomingRehearsals,
    latestMaterials,
  };
}
