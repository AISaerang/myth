import "server-only";
import type {
  MaterialCategory,
  Prisma,
  SongStatus,
} from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { eventSongDisplayKey } from "@/lib/event-song";
import type {
  ArrangementVersionInput,
  AssignmentInput,
  MaterialInput,
  SongInput,
} from "@/lib/validation/song";

function eventSongReadInclude(eventId: string) {
  return {
    event: { select: { id: true, name: true } },
    song: {
      include: {
        activeVersion: true,
        versions: { orderBy: { createdAt: "desc" } },
        materials: {
          where: {
            OR: [{ eventId: null }, { eventId }],
          },
          orderBy: [{ category: "asc" }, { createdAt: "desc" }],
        },
      },
    },
    assignments: {
      include: {
        person: { select: { id: true, displayName: true, isActive: true } },
        instrumentSkill: { select: { id: true, name: true } },
      },
      orderBy: { person: { displayName: "asc" } },
    },
    batchItems: {
      include: { batch: true },
      orderBy: { sortOrder: "asc" },
    },
  } satisfies Prisma.EventSongInclude;
}

type EventSongRead = Prisma.EventSongGetPayload<{
  include: ReturnType<typeof eventSongReadInclude>;
}>;

function toEventSongView(eventSong: EventSongRead) {
  return {
    ...eventSong.song,
    eventId: eventSong.eventId,
    event: eventSong.event,
    eventSongId: eventSong.id,
    eventKey: eventSong.eventKey,
    sortOrder: eventSong.sortOrder,
    key: eventSongDisplayKey(eventSong.eventKey, eventSong.song.key),
    liturgicalFunction: eventSong.liturgicalFunction,
    arrangementNotes: eventSong.notes,
    status: eventSong.status,
    isPublished: eventSong.isPublished,
    isFinalLocked: eventSong.isFinalLocked,
    assignments: eventSong.assignments,
    batchItems: eventSong.batchItems,
  };
}

export async function listSongs(eventId: string) {
  const eventSongs = await prisma.eventSong.findMany({
    where: { eventId },
    include: eventSongReadInclude(eventId),
    orderBy: [{ sortOrder: "asc" }, { song: { title: "asc" } }],
  });
  return eventSongs.map(toEventSongView);
}

// Member event melihat semua lagu yang sudah dipublikasi di setlist itu.
export async function listPublishedSongsForMember(eventId: string) {
  const eventSongs = await prisma.eventSong.findMany({
    where: {
      eventId,
      isPublished: true,
    },
    include: eventSongReadInclude(eventId),
    orderBy: [{ sortOrder: "asc" }, { song: { title: "asc" } }],
  });
  return eventSongs.map(toEventSongView);
}

// Lagu untuk pemantau: semua yang sudah Publish (tanpa perlu
// assignment). DRAFT internal tidak pernah bocor ke observer.
export async function listPublishedSongsForObserver(eventId: string) {
  const eventSongs = await prisma.eventSong.findMany({
    where: { eventId, isPublished: true },
    include: eventSongReadInclude(eventId),
    orderBy: [{ sortOrder: "asc" }, { song: { title: "asc" } }],
  });
  return eventSongs.map(toEventSongView);
}

export async function getSong(id: string, eventId: string) {
  const eventSong = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId: id } },
    include: eventSongReadInclude(eventId),
  });
  return eventSong ? toEventSongView(eventSong) : null;
}

export async function listSongLibrary() {
  return prisma.song.findMany({
    include: { _count: { select: { eventSongs: true } } },
    orderBy: [{ title: "asc" }, { artistOrAuthor: "asc" }],
  });
}

export async function createSong(
  actorUserId: string,
  input: SongInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.status === "FINAL_LOCKED") {
    return {
      ok: false,
      error: "Lagu baru tidak bisa langsung final; gunakan kunci final.",
    };
  }
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  const song = await prisma.song.create({
    data: {
      eventId: input.eventId,
      title: input.title,
      artistOrAuthor: input.artistOrAuthor || null,
      liturgicalFunction: input.liturgicalFunction || null,
      key: input.key,
      bpm: input.bpm,
      timeSignature: input.timeSignature,
      estimatedDurationSeconds: input.estimatedDurationSeconds,
      originalReferenceUrl: input.originalReferenceUrl,
      arrangementNotes: input.arrangementNotes || null,
      status: input.status as SongStatus,
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_CREATED,
    entityType: "Song",
    entityId: song.id,
    summary: `Lagu "${song.title}" dibuat (${song.status}).`,
    metadata: { title: song.title, status: song.status },
  });
  return { ok: true, id: song.id };
}

export async function updateSong(
  actorUserId: string,
  id: string,
  input: Omit<SongInput, "eventId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.song.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Lagu tidak ditemukan." };
  if (existing.isFinalLocked) {
    return {
      ok: false,
      error: "Lagu terkunci final; buka kunci dulu untuk mengubah.",
    };
  }
  if (input.status === "FINAL_LOCKED") {
    return {
      ok: false,
      error: "Gunakan aksi kunci final yang disengaja, bukan edit status.",
    };
  }
  await prisma.song.update({
    where: { id },
    data: {
      title: input.title,
      artistOrAuthor: input.artistOrAuthor || null,
      liturgicalFunction: input.liturgicalFunction || null,
      key: input.key,
      bpm: input.bpm,
      timeSignature: input.timeSignature,
      estimatedDurationSeconds: input.estimatedDurationSeconds,
      originalReferenceUrl: input.originalReferenceUrl,
      arrangementNotes: input.arrangementNotes || null,
      status: input.status as SongStatus,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_UPDATED,
    entityType: "Song",
    entityId: id,
    summary: `Lagu "${input.title}" diubah (${existing.status} → ${input.status}).`,
    metadata: { title: input.title, from: existing.status, to: input.status },
  });
  return { ok: true };
}

export async function setSongPublished(
  actorUserId: string,
  id: string,
  isPublished: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.song.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Lagu tidak ditemukan." };
  await prisma.song.update({ where: { id }, data: { isPublished } });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_PUBLISHED,
    entityType: "Song",
    entityId: id,
    summary: `Lagu "${existing.title}" ${isPublished ? "dipublikasi" : "ditarik"}.`,
    metadata: { title: existing.title },
  });
  return { ok: true };
}

export async function assignPerson(
  actorUserId: string,
  input: AssignmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const song = await prisma.song.findUnique({ where: { id: input.songId } });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  const person = await prisma.person.findUnique({
    where: { id: input.personId },
  });
  if (!person || !person.isActive) {
    return { ok: false, error: "Personel tidak aktif." };
  }
  if (input.instrumentSkillId) {
    const skill = await prisma.instrumentSkill.findUnique({
      where: { id: input.instrumentSkillId },
    });
    if (!skill) return { ok: false, error: "Skill tidak ditemukan." };
  }
  const existing = await prisma.songAssignment.findUnique({
    where: { songId_personId: { songId: input.songId, personId: input.personId } },
  });
  if (existing) return { ok: false, error: "Personel sudah ditugaskan di lagu ini." };
  await prisma.songAssignment.create({
    data: {
      songId: input.songId,
      personId: input.personId,
      instrumentSkillId: input.instrumentSkillId,
      assignmentNote: input.assignmentNote || null,
      isPrimary: input.isPrimary,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.ASSIGNMENT_CREATED,
    entityType: "Song",
    entityId: input.songId,
    summary: `${person.displayName} ditugaskan ke "${song.title}".`,
    metadata: { song: song.title, person: person.displayName },
  });
  return { ok: true };
}

export interface BatchAssignRow {
  personId: string;
  instrumentSkillId?: string;
}

export interface BatchAssignResult {
  personId: string;
  displayName: string;
  created: number;
  skipped: number;
}

// Assign sebatch: apply several personnel (each with own part) to songs
// of one batch in a single submit. Same rules as assignPerson: personnel
// must be active, skills must exist, existing pairs are skipped (not an
// error). One ASSIGNMENT_CREATED audit per created row, identical to the
// manual flow, so history reads the same.
export async function assignBatchMembers(
  actorUserId: string,
  batchId: string,
  rows: BatchAssignRow[],
  songIds: string[],
): Promise<
  | { ok: true; results: BatchAssignResult[] }
  | { ok: false; error: string }
> {
  const batch = await prisma.songBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        select: {
          song: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!batch) return { ok: false, error: "Batch tidak ditemukan." };
  const batchSongIds = new Set(batch.items.map((i) => i.song.id));
  const targetSongIds = songIds.filter((id) => batchSongIds.has(id));
  if (targetSongIds.length === 0) {
    return { ok: false, error: "Lagu terpilih tidak ada di batch ini." };
  }
  const songsById = new Map(batch.items.map((i) => [i.song.id, i.song]));
  const people = await prisma.person.findMany({
    where: { id: { in: rows.map((r) => r.personId) } },
    select: { id: true, displayName: true, isActive: true },
  });
  const peopleById = new Map(people.map((p) => [p.id, p]));
  for (const row of rows) {
    const person = peopleById.get(row.personId);
    if (!person) return { ok: false, error: "Personel tidak ditemukan." };
    if (!person.isActive) {
      return {
        ok: false,
        error: `Personel ${person.displayName} nonaktif.`,
      };
    }
  }
  const skillIds = [...new Set(rows.map((r) => r.instrumentSkillId).filter(Boolean))] as string[];
  if (skillIds.length > 0) {
    const skills = await prisma.instrumentSkill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true },
    });
    if (skills.length !== skillIds.length) {
      return { ok: false, error: "Part/instrumen tidak ditemukan." };
    }
  }
  const existing = await prisma.songAssignment.findMany({
    where: {
      songId: { in: targetSongIds },
      personId: { in: rows.map((r) => r.personId) },
    },
    select: { songId: true, personId: true },
  });
  const existingPairs = new Set(existing.map((e) => `${e.songId}::${e.personId}`));
  const toCreate = rows.flatMap((row) =>
    targetSongIds
      .filter((songId) => !existingPairs.has(`${songId}::${row.personId}`))
      .map((songId) => ({
        songId,
        personId: row.personId,
        instrumentSkillId: row.instrumentSkillId || null,
        isPrimary: true,
      })),
  );
  if (toCreate.length > 0) {
    await prisma.songAssignment.createMany({ data: toCreate });
  }
  const createdPairs = new Set(toCreate.map((c) => `${c.songId}::${c.personId}`));
  const results: BatchAssignResult[] = rows.map((row) => {
    const person = peopleById.get(row.personId);
    const displayName = person?.displayName ?? row.personId;
    let created = 0;
    let skipped = 0;
    for (const songId of targetSongIds) {
      if (createdPairs.has(`${songId}::${row.personId}`)) created += 1;
      else skipped += 1;
    }
    return { personId: row.personId, displayName, created, skipped };
  });
  for (const row of toCreate) {
    const song = songsById.get(row.songId);
    const person = peopleById.get(row.personId);
    if (!song || !person) continue;
    await writeAudit({
      actorUserId,
      action: AuditAction.ASSIGNMENT_CREATED,
      entityType: "Song",
      entityId: row.songId,
      summary: `${person.displayName} ditugaskan ke "${song.title}" (sebatch).`,
      metadata: { song: song.title, person: person.displayName, via: "batch" },
    });
  }
  return { ok: true, results };
}

export async function unassignPerson(
  actorUserId: string,
  songId: string,
  personId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const assignment = await prisma.songAssignment.findUnique({
    where: { songId_personId: { songId, personId } },
    include: {
      song: { select: { title: true } },
      person: { select: { displayName: true } },
    },
  });
  if (!assignment) return { ok: false, error: "Assignment tidak ditemukan." };
  await prisma.songAssignment.delete({ where: { id: assignment.id } });
  await writeAudit({
    actorUserId,
    action: AuditAction.ASSIGNMENT_REMOVED,
    entityType: "Song",
    entityId: songId,
    summary: `${assignment.person.displayName} dilepas dari "${assignment.song.title}".`,
    metadata: {
      song: assignment.song.title,
      person: assignment.person.displayName,
    },
  });
  return { ok: true };
}

export async function createVersion(
  actorUserId: string,
  input: ArrangementVersionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const song = await prisma.song.findUnique({ where: { id: input.songId } });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  if (song.isFinalLocked) {
    return {
      ok: false,
      error: "Lagu terkunci final; buka kunci dulu untuk versi baru.",
    };
  }
  const version = await prisma.arrangementVersion.create({
    data: {
      songId: input.songId,
      versionLabel: input.versionLabel,
      changeSummary: input.changeSummary,
      key: input.key,
      bpm: input.bpm,
      grooveNotes: input.grooveNotes || null,
      structureNotes: input.structureNotes || null,
      referenceUrl: input.referenceUrl,
      isActive: false,
      isFinal: false,
      createdById: actorUserId,
    },
  });
  return { ok: true, id: version.id };
}

// Satu versi aktif per lagu (transaksional): versi lama otomatis
// nonaktif. Pengaktifan dicatat di audit.
export async function activateVersion(
  actorUserId: string,
  versionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const version = await prisma.arrangementVersion.findUnique({
    where: { id: versionId },
    include: { song: true },
  });
  if (!version) return { ok: false, error: "Versi tidak ditemukan." };
  if (version.song.isFinalLocked) {
    return { ok: false, error: "Lagu terkunci final." };
  }
  await prisma.$transaction([
    prisma.arrangementVersion.updateMany({
      where: { songId: version.songId },
      data: { isActive: false },
    }),
    prisma.arrangementVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    }),
    prisma.song.update({
      where: { id: version.songId },
      data: { activeArrangementVersionId: versionId },
    }),
  ]);
  await writeAudit({
    actorUserId,
    action: AuditAction.VERSION_ACTIVATED,
    entityType: "Song",
    entityId: version.songId,
    summary: `Versi ${version.versionLabel} diaktifkan untuk "${version.song.title}".`,
    metadata: { song: version.song.title, version: version.versionLabel },
  });
  return { ok: true };
}

// Kunci final yang disengaja: mengunci lagu + menandai versi final.
// Perubahan setelah ini harus lewat buka-kunci yang tercatat.
export async function lockFinal(
  actorUserId: string,
  versionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const version = await prisma.arrangementVersion.findUnique({
    where: { id: versionId },
    include: { song: true },
  });
  if (!version) return { ok: false, error: "Versi tidak ditemukan." };
  await prisma.$transaction([
    prisma.arrangementVersion.updateMany({
      where: { songId: version.songId },
      data: { isActive: false, isFinal: false },
    }),
    prisma.arrangementVersion.update({
      where: { id: versionId },
      data: { isActive: true, isFinal: true },
    }),
    prisma.song.update({
      where: { id: version.songId },
      data: {
        activeArrangementVersionId: versionId,
        isFinalLocked: true,
        status: "FINAL_LOCKED",
      },
    }),
  ]);
  await writeAudit({
    actorUserId,
    action: AuditAction.FINAL_LOCKED,
    entityType: "Song",
    entityId: version.songId,
    summary: `"${version.song.title}" dikunci final pada ${version.versionLabel}.`,
    metadata: { song: version.song.title, version: version.versionLabel },
  });
  return { ok: true };
}

export async function unlockFinal(
  actorUserId: string,
  songId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  if (!song.isFinalLocked) return { ok: false, error: "Lagu tidak terkunci." };
  await prisma.$transaction([
    prisma.arrangementVersion.updateMany({
      where: { songId },
      data: { isFinal: false },
    }),
    prisma.song.update({
      where: { id: songId },
      data: { isFinalLocked: false, status: "REHEARSAL_READY" },
    }),
  ]);
  await writeAudit({
    actorUserId,
    action: AuditAction.FINAL_UNLOCKED,
    entityType: "Song",
    entityId: songId,
    summary: `Kunci final "${song.title}" dibuka; status kembali lolos rehearsal.`,
    metadata: { song: song.title },
  });
  return { ok: true };
}

export async function addMaterial(
  actorUserId: string,
  input: MaterialInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const song = await prisma.song.findUnique({ where: { id: input.songId } });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  if (input.arrangementVersionId) {
    const version = await prisma.arrangementVersion.findUnique({
      where: { id: input.arrangementVersionId },
    });
    if (!version || version.songId !== input.songId) {
      return { ok: false, error: "Versi aransemen tidak cocok dengan lagu." };
    }
  }
  // Satu materi aktif per (lagu, kategori): nonaktifkan yang lama.
  const category = input.category as MaterialCategory;
  await prisma.$transaction([
    prisma.songMaterial.updateMany({
      where: { songId: input.songId, category },
      data: { isActive: false },
    }),
    prisma.songMaterial.create({
      data: {
        songId: input.songId,
        arrangementVersionId: input.arrangementVersionId,
        title: input.title,
        category,
        url: input.url,
        versionLabel: input.versionLabel || null,
        description: input.description || null,
        isActive: true,
        createdById: actorUserId,
      },
    }),
  ]);
  await writeAudit({
    actorUserId,
    action: AuditAction.MATERIAL_ADDED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Materi "${input.title}" (${input.category}) ditambahkan ke "${song.title}".`,
    metadata: { song: song.title, category: input.category },
  });
  return { ok: true };
}

export async function setMaterialActive(
  actorUserId: string,
  materialId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const material = await prisma.songMaterial.findUnique({
    where: { id: materialId },
    include: { song: { select: { title: true } } },
  });
  if (!material) return { ok: false, error: "Materi tidak ditemukan." };
  if (isActive) {
    await prisma.$transaction([
      prisma.songMaterial.updateMany({
        where: { songId: material.songId, category: material.category },
        data: { isActive: false },
      }),
      prisma.songMaterial.update({
        where: { id: materialId },
        data: { isActive: true },
      }),
    ]);
    await writeAudit({
      actorUserId,
      action: AuditAction.MATERIAL_ACTIVATED,
      entityType: "Song",
      entityId: material.songId,
      summary: `Materi "${material.title}" diaktifkan untuk "${material.song.title}".`,
      metadata: { song: material.song.title, title: material.title },
    });
  } else {
    await prisma.songMaterial.update({
      where: { id: materialId },
      data: { isActive: false },
    });
  }
  return { ok: true };
}

export async function deleteMaterial(
  materialId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const material = await prisma.songMaterial.findUnique({
    where: { id: materialId },
  });
  if (!material) return { ok: false, error: "Materi tidak ditemukan." };
  await prisma.songMaterial.delete({ where: { id: materialId } });
  return { ok: true };
}
