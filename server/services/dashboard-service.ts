import "server-only";
import { prisma } from "@/lib/db";
import { isTaskOverdue } from "@/lib/task-status";

// Readiness dashboard MD (docs/01): status lagu/batch, blocker,
// overdue, rehearsal berikutnya, kesiapan teknis, update terbaru.
// Semua angka bisa diklik menuju datanya (docs/04).
export async function getAdminReadiness(eventId: string, now: Date = new Date()) {
  const [
    eventSongs,
    batches,
    tasks,
    equipment,
    upcomingRehearsals,
    helpNeeded,
    latestAudit,
  ] = await Promise.all([
    prisma.eventSong.findMany({
      where: { eventId },
      select: {
        songId: true,
        status: true,
        isPublished: true,
        song: { select: { title: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: [{ song: { title: "asc" } }],
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
      where: { eventSong: { is: { eventId } }, status: "NEEDS_HELP" },
      select: {
        eventSong: {
          select: { song: { select: { id: true, title: true } } },
        },
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

  const songs = eventSongs.map((eventSong) => ({
    id: eventSong.songId,
    title: eventSong.song.title,
    status: eventSong.status,
    isPublished: eventSong.isPublished,
    _count: eventSong._count,
  }));
  const helpNeededForEvent = helpNeeded.flatMap((progress) =>
    progress.eventSong
      ? [{ ...progress, song: progress.eventSong.song }]
      : [],
  );
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
    helpNeeded: helpNeededForEvent,
    upcomingRehearsals,
    equipment,
    latestAudit,
    counts: {
      totalSongs: songs.length,
      attentionSongs: attentionSongs.length,
      overdueTasks: overdueTasks.length,
      blockedTasks: blockedTasks.length,
      blockedEquipment: blockedEquipment.length,
      helpNeeded: helpNeededForEvent.length,
    },
  };
}

// Dashboard pemantau (OBSERVER): seperti admin tapi Publish-only.
// Tidak ada kontak pribadi, invite, password, atau audit sensitif.
// DRAFT internal tidak pernah masuk angka maupun list.
export async function getObserverDashboard(eventId: string, now: Date = new Date()) {
  const [
    eventSongs,
    batches,
    tasks,
    equipment,
    upcomingRehearsals,
    helpNeeded,
  ] = await Promise.all([
    prisma.eventSong.findMany({
      where: { eventId, isPublished: true },
      select: {
        songId: true,
        status: true,
        isPublished: true,
        song: { select: { title: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: [{ song: { title: "asc" } }],
    }),
    prisma.songBatch.findMany({
      where: {
        eventId,
        status: { not: "ARCHIVED" },
        items: {
          some: {
            OR: [
              { eventSong: { is: { eventId, isPublished: true } } },
              {
                eventSongId: null,
                song: { is: { eventId, isPublished: true } },
              },
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        items: {
          where: {
            OR: [
              { eventSong: { is: { eventId, isPublished: true } } },
              {
                eventSongId: null,
                song: { is: { eventId, isPublished: true } },
              },
            ],
          },
          select: { songId: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: {
        eventId,
        OR: [
          { relatedSongId: null },
          {
            relatedSong: {
              eventSongs: { some: { eventId, isPublished: true } },
            },
          },
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
      where: {
        eventSong: { is: { eventId, isPublished: true } },
        status: "NEEDS_HELP",
      },
      select: {
        eventSong: {
          select: { song: { select: { id: true, title: true } } },
        },
        person: { select: { displayName: true } },
        note: true,
      },
    }),
  ]);

  const songs = eventSongs.map((eventSong) => ({
    id: eventSong.songId,
    title: eventSong.song.title,
    status: eventSong.status,
    isPublished: eventSong.isPublished,
    _count: eventSong._count,
  }));
  const helpNeededForEvent = helpNeeded.flatMap((progress) =>
    progress.eventSong
      ? [{ ...progress, song: progress.eventSong.song }]
      : [],
  );
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
    helpNeeded: helpNeededForEvent,
    upcomingRehearsals,
    equipment,
    counts: {
      totalSongs: songs.length,
      attentionSongs: attentionSongs.length,
      overdueTasks: overdueTasks.length,
      blockedTasks: blockedTasks.length,
      blockedEquipment: blockedEquipment.length,
      helpNeeded: helpNeededForEvent.length,
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
        where: {
          personId: person.id,
          eventSong: { is: { eventId, isPublished: true } },
        },
        select: {
          eventSong: {
            select: {
              status: true,
              liturgicalFunction: true,
              song: {
                select: {
                  id: true,
                  title: true,
                },
              },
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
                assignments: {
                  some: {
                    personId: person.id,
                    eventSong: { is: { eventId } },
                  },
                },
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
          isActive: true,
          OR: [{ eventId: null }, { eventId }],
          song: {
            eventSongs: {
              some: {
                eventId,
                isPublished: true,
                assignments: { some: { personId: person.id } },
              },
            },
          },
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
    mySongs: assignments.flatMap((assignment) =>
      assignment.eventSong
        ? [
            {
              song: {
                id: assignment.eventSong.song.id,
                title: assignment.eventSong.song.title,
                status: assignment.eventSong.status,
                liturgicalFunction: assignment.eventSong.liturgicalFunction,
                progress: assignment.eventSong.progress,
              },
              instrumentSkill: assignment.instrumentSkill,
            },
          ]
        : [],
    ),
    myTasks: tasks,
    upcomingRehearsals,
    latestMaterials,
  };
}
