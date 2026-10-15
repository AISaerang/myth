import "server-only";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { SuggestionInput, TaskInput } from "@/lib/validation/work";

const taskInclude = {
  assignee: { select: { id: true, displayName: true } },
  relatedSong: { select: { id: true, title: true, eventId: true } },
  relatedRehearsal: { select: { id: true, title: true, eventId: true } },
} as const;

export async function listTasks(eventId: string, status?: TaskStatus) {  return prisma.task.findMany({
    where: { eventId, ...(status ? { status } : {}) },
    include: taskInclude,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

// Task relevan untuk personel: ditugaskan ke profilnya ATAU terkait
// lagu yang ditugaskan kepadanya (docs/01, docs/06).
export async function listRelevantTasks(userId: string, eventId: string) {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) return [];
  const mySongIds = (
    await prisma.songAssignment.findMany({
      where: { personId: person.id, song: { eventId } },
      select: { songId: true },
    })
  ).map((a) => a.songId);
  return prisma.task.findMany({
    where: {
      eventId,
      OR: [
        { assigneePersonId: person.id },
        { relatedSongId: { in: mySongIds } },
      ],
    },
    include: taskInclude,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
  });
}

export async function listSongTasks(songId: string) {
  return prisma.task.findMany({
    where: { relatedSongId: songId },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { priority: "desc" }],
  });
}

export async function createTask(
  actorUserId: string,
  input: TaskInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  if (input.assigneePersonId) {
    const assignee = await prisma.person.findUnique({
      where: { id: input.assigneePersonId },
    });
    if (!assignee || !assignee.isActive) {
      return { ok: false, error: "PIC harus personel aktif." };
    }
  }
  if (input.relatedSongId) {
    const song = await prisma.song.findUnique({
      where: { id: input.relatedSongId },
    });
    if (!song || song.eventId !== input.eventId) {
      return { ok: false, error: "Lagu terkait harus satu event." };
    }
  }
  if (input.relatedRehearsalId) {
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: input.relatedRehearsalId },
    });
    if (!rehearsal || rehearsal.eventId !== input.eventId) {
      return { ok: false, error: "Rehearsal terkait harus satu event." };
    }
  }
  const task = await prisma.task.create({
    data: {
      eventId: input.eventId,
      title: input.title,
      description: input.description || null,
      status: input.status as TaskStatus,
      priority: input.priority as TaskPriority,
      dueAt: input.dueAt ?? null,
      assigneePersonId: input.assigneePersonId,
      relatedSongId: input.relatedSongId,
      relatedRehearsalId: input.relatedRehearsalId,
      createdById: actorUserId,
    },
  });
  return { ok: true, id: task.id };
}

export async function updateTask(
  id: string,
  input: TaskInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Task tidak ditemukan." };
  if (input.eventId !== existing.eventId) {
    return { ok: false, error: "Task tidak bisa pindah event." };
  }
  if (input.assigneePersonId) {
    const assignee = await prisma.person.findUnique({
      where: { id: input.assigneePersonId },
    });
    if (!assignee || !assignee.isActive) {
      return { ok: false, error: "PIC harus personel aktif." };
    }
  }
  if (input.relatedSongId) {
    const song = await prisma.song.findUnique({
      where: { id: input.relatedSongId },
    });
    if (!song || song.eventId !== existing.eventId) {
      return { ok: false, error: "Lagu terkait harus satu event." };
    }
  }
  if (input.relatedRehearsalId) {
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: input.relatedRehearsalId },
    });
    if (!rehearsal || rehearsal.eventId !== existing.eventId) {
      return { ok: false, error: "Rehearsal terkait harus satu event." };
    }
  }
  await prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      status: input.status as TaskStatus,
      priority: input.priority as TaskPriority,
      dueAt: input.dueAt ?? null,
      assigneePersonId: input.assigneePersonId ?? null,
      relatedSongId: input.relatedSongId ?? null,
      relatedRehearsalId: input.relatedRehearsalId ?? null,
    },
  });
  return { ok: true };
}

// Task untuk pemantau: semua task yang tidak terikat lagu DRAFT.
// Task tanpa lagu terkait selalu terlihat; task berlagu hanya bila
// lagunya sudah Publish (filter Publish ditegakkan server-side).
export async function listObserverTasks(eventId: string) {
  return prisma.task.findMany({
    where: {
      eventId,
      OR: [
        { relatedSongId: null },
        { relatedSong: { isPublished: true } },
      ],
    },
    include: taskInclude,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

// Usulan dari USER/OBSERVER: dibuat sebagai Task TODO tanpa PIC,
// dimoderasi MD (docs/11). Lagu terkait wajib Publish bila diisi.
export async function createSuggestion(
  actorUserId: string,
  input: SuggestionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  if (input.relatedSongId) {
    const song = await prisma.song.findUnique({
      where: { id: input.relatedSongId },
      select: { id: true, eventId: true, isPublished: true, title: true },
    });
    if (!song || song.eventId !== input.eventId) {
      return { ok: false, error: "Lagu terkait harus satu event." };
    }
    if (!song.isPublished) {
      return { ok: false, error: "Usulan hanya untuk lagu yang sudah dipublish." };
    }
  }
  if (input.relatedRehearsalId) {
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: input.relatedRehearsalId },
    });
    if (!rehearsal || rehearsal.eventId !== input.eventId) {
      return { ok: false, error: "Rehearsal terkait harus satu event." };
    }
  }
  const task = await prisma.task.create({
    data: {
      eventId: input.eventId,
      title: input.title,
      description: input.description,
      status: "TODO",
      priority: "MEDIUM",
      dueAt: null,
      assigneePersonId: null,
      relatedSongId: input.relatedSongId,
      relatedRehearsalId: input.relatedRehearsalId,
      createdById: actorUserId,
    },
  });
  return { ok: true, id: task.id };
}

// Pemilik usulan boleh revisi selama masih TODO (belum dimoderasi).
export async function updateOwnSuggestion(
  actorUserId: string,
  taskId: string,
  input: SuggestionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return { ok: false, error: "Usulan tidak ditemukan." };
  if (existing.createdById !== actorUserId) {
    return { ok: false, error: "Hanya pemilik usulan yang bisa mengubahnya." };
  }
  if (existing.status !== "TODO") {
    return { ok: false, error: "Usulan sudah dimoderasi MD; tidak bisa diubah." };
  }
  if (input.eventId !== existing.eventId) {
    return { ok: false, error: "Usulan tidak bisa pindah event." };
  }
  if (input.relatedSongId) {
    const song = await prisma.song.findUnique({
      where: { id: input.relatedSongId },
      select: { id: true, eventId: true, isPublished: true },
    });
    if (!song || song.eventId !== existing.eventId) {
      return { ok: false, error: "Lagu terkait harus satu event." };
    }
    if (!song.isPublished) {
      return { ok: false, error: "Usulan hanya untuk lagu yang sudah dipublish." };
    }
  }
  if (input.relatedRehearsalId) {
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: input.relatedRehearsalId },
    });
    if (!rehearsal || rehearsal.eventId !== existing.eventId) {
      return { ok: false, error: "Rehearsal terkait harus satu event." };
    }
  }
  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description,
      relatedSongId: input.relatedSongId ?? null,
      relatedRehearsalId: input.relatedRehearsalId ?? null,
    },
  });
  return { ok: true };
}
// PIC boleh memperbarui status task yang ditugaskan kepadanya
// (docs/06: "update assigned if enabled"). Hanya status yang berubah.
export async function updateMyTaskStatus(
  userId: string,
  taskId: string,
  status: TaskStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) return { ok: false, error: "Profil personel tidak ditemukan." };
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task tidak ditemukan." };
  if (task.assigneePersonId !== person.id) {
    return { ok: false, error: "Hanya PIC yang bisa mengubah status task ini." };
  }
  if (status === "BLOCKED" && !task.description) {
    return {
      ok: false,
      error: "Task blocked butuh tindak lanjut; minta admin melengkapi.",
    };
  }
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  return { ok: true };
}
