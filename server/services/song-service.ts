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
    where: {
      eventId,
      song: { archivedAt: null },
    },
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
      song: { archivedAt: null },
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
    where: {
      eventId,
      isPublished: true,
      song: { archivedAt: null },
    },
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

export async function listSongLibrary(includeArchived = false) {
  return prisma.song.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    include: { _count: { select: { eventSongs: true } } },
    orderBy: [{ archivedAt: "asc" }, { title: "asc" }, { artistOrAuthor: "asc" }],
  });
}

export async function listAvailableSongsForEvent(eventId: string) {
  return prisma.song.findMany({
    where: {
      archivedAt: null,
      eventSongs: { none: { eventId } },
    },
    select: { id: true, title: true, artistOrAuthor: true, key: true },
    orderBy: [{ title: "asc" }, { artistOrAuthor: "asc" }],
  });
}

export async function addSongFromLibraryToEvent(
  actorUserId: string,
  eventId: string,
  songId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true },
    });
    if (!event) return { ok: false as const, error: "Event tidak ditemukan." };
    const song = await tx.song.findUnique({
      where: { id: songId },
      select: { id: true, title: true },
    });
    if (!song) return { ok: false as const, error: "Lagu pustaka tidak ditemukan." };

    await tx.$queryRaw`SELECT id FROM Event WHERE id = ${eventId} FOR UPDATE`;
    const existing = await tx.eventSong.findUnique({
      where: { eventId_songId: { eventId, songId } },
      select: { id: true },
    });
    if (existing) {
      return { ok: false as const, error: "Lagu sudah ada di setlist event ini." };
    }
    const maxOrder = await tx.eventSong.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });
    await tx.eventSong.create({
      data: {
        eventId,
        songId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return {
      ok: true as const,
      eventName: event.name,
      songTitle: song.title,
    };
  });
  if (!result.ok) return result;

  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_SONG_ADDED,
    entityType: "EventSong",
    entityId: `${eventId}:${songId}`,
    summary: `"${result.songTitle}" ditambahkan ke setlist "${result.eventName}".`,
    metadata: { eventId, songId },
  });
  return { ok: true };
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
  const maxOrder = await prisma.eventSong.aggregate({
    where: { eventId: input.eventId },
    _max: { sortOrder: true },
  });
  const song = await prisma.song.create({
    data: {
      title: input.title,
      artistOrAuthor: input.artistOrAuthor || null,
      key: input.key,
      bpm: input.bpm,
      timeSignature: input.timeSignature,
      estimatedDurationSeconds: input.estimatedDurationSeconds,
      originalReferenceUrl: input.originalReferenceUrl,
      createdById: actorUserId,
      eventSongs: {
        create: {
          eventId: input.eventId,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
          liturgicalFunction: input.liturgicalFunction || null,
          eventKey: input.key,
          notes: input.arrangementNotes || null,
          status: input.status as SongStatus,
        },
      },
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_CREATED,
    entityType: "Song",
    entityId: song.id,
    summary: `Lagu "${song.title}" dibuat (${input.status}).`,
    metadata: { title: song.title, status: input.status, eventId: input.eventId },
  });
  return { ok: true, id: song.id };
}

export async function updateSong(
  actorUserId: string,
  id: string,
  eventId: string,
  input: Omit<SongInput, "eventId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId: id } },
    include: { song: true },
  });
  if (!existing) return { ok: false, error: "Lagu tidak ditemukan di event ini." };
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
  await prisma.$transaction([
    prisma.song.update({
      where: { id },
      data: {
        title: input.title,
        artistOrAuthor: input.artistOrAuthor || null,
        key: input.key,
        bpm: input.bpm,
        timeSignature: input.timeSignature,
        estimatedDurationSeconds: input.estimatedDurationSeconds,
        originalReferenceUrl: input.originalReferenceUrl,
        // introChords/introNotation/introNote sengaja tidak disentuh:
        // form lagu tidak lagi mengeditnya, dan menyimpan null di sini
        // akan menghapus data sebelum skrip migrasi sempat menyalinnya.
      },
    }),
    prisma.eventSong.update({
      where: { id: existing.id },
      data: {
        eventKey: input.key,
        liturgicalFunction: input.liturgicalFunction || null,
        notes: input.arrangementNotes || null,
        status: input.status as SongStatus,
      },
    }),
  ]);
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
  eventId: string,
  isPublished: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId: id } },
    include: { song: { select: { title: true } } },
  });
  if (!existing) return { ok: false, error: "Lagu tidak ditemukan." };
  await prisma.eventSong.update({ where: { id: existing.id }, data: { isPublished } });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_PUBLISHED,
    entityType: "Song",
    entityId: id,
    summary: `Lagu "${existing.song.title}" ${isPublished ? "dipublikasi" : "ditarik"}.`,
    metadata: { title: existing.song.title, eventId },
  });
  return { ok: true };
}

export async function assignPerson(
  actorUserId: string,
  eventSongId: string,
  input: AssignmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!eventSong || eventSong.songId !== input.songId) {
    return { ok: false, error: "Lagu tidak ditemukan di event ini." };
  }
  const song = eventSong.song;
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
  if (existing) {
    return {
      ok: false,
      error:
        existing.eventSongId === eventSongId
          ? "Personel sudah ditugaskan di lagu ini."
          : "Personel sudah ditugaskan ke lagu pustaka di event lain.",
    };
  }
  await prisma.songAssignment.create({
    data: {
      songId: input.songId,
      eventSongId,
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
          eventSongId: true,
          song: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!batch) return { ok: false, error: "Batch tidak ditemukan." };
  const eventSongBySongId = new Map(
    batch.items
      .filter((item) => item.eventSongId)
      .map((item) => [item.song.id, item.eventSongId as string]),
  );
  const batchSongIds = new Set(eventSongBySongId.keys());
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
    select: { eventSongId: true, songId: true, personId: true },
  });
  if (
    existing.some(
      (assignment) =>
        assignment.eventSongId !== eventSongBySongId.get(assignment.songId),
    )
  ) {
    return {
      ok: false,
      error: "Personel sudah ditugaskan ke lagu pustaka di event lain.",
    };
  }
  const existingPairs = new Set(existing.map((e) => `${e.eventSongId}::${e.personId}`));
  const toCreate = rows.flatMap((row) =>
    targetSongIds
      .filter((songId) => !existingPairs.has(`${eventSongBySongId.get(songId)}::${row.personId}`))
      .map((songId) => ({
        songId,
        eventSongId: eventSongBySongId.get(songId)!,
        personId: row.personId,
        instrumentSkillId: row.instrumentSkillId || null,
        isPrimary: true,
      })),
  );
  if (toCreate.length > 0) {
    await prisma.songAssignment.createMany({ data: toCreate });
  }
  const createdPairs = new Set(toCreate.map((c) => `${c.eventSongId}::${c.personId}`));
  const results: BatchAssignResult[] = rows.map((row) => {
    const person = peopleById.get(row.personId);
    const displayName = person?.displayName ?? row.personId;
    let created = 0;
    let skipped = 0;
    for (const songId of targetSongIds) {
      if (createdPairs.has(`${eventSongBySongId.get(songId)}::${row.personId}`)) created += 1;
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
  eventSongId: string,
  personId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const assignment = await prisma.songAssignment.findFirst({
    where: { eventSongId, personId },
    include: {
      song: { select: { id: true, title: true } },
      person: { select: { displayName: true } },
    },
  });
  if (!assignment) return { ok: false, error: "Assignment tidak ditemukan." };
  await prisma.songAssignment.delete({ where: { id: assignment.id } });
  await writeAudit({
    actorUserId,
    action: AuditAction.ASSIGNMENT_REMOVED,
    entityType: "Song",
    entityId: assignment.song.id,
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
  eventSongId: string,
  versionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    include: { song: { select: { id: true, title: true } } },
  });
  const version = await prisma.arrangementVersion.findUnique({
    where: { id: versionId },
  });
  if (!eventSong || !version || eventSong.songId !== version.songId) {
    return { ok: false, error: "Versi tidak valid untuk lagu event ini." };
  }
  await prisma.eventSong.update({
    where: { id: eventSongId },
    data: { isFinalLocked: true, status: "FINAL_LOCKED" },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.FINAL_LOCKED,
    entityType: "Song",
    entityId: eventSong.songId,
    summary: `"${eventSong.song.title}" dikunci final pada ${version.versionLabel}.`,
    metadata: { song: eventSong.song.title, version: version.versionLabel, eventId: eventSong.eventId },
  });
  return { ok: true };
}

export async function unlockFinal(
  actorUserId: string,
  eventSongId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!eventSong) return { ok: false, error: "Lagu tidak ditemukan." };
  if (!eventSong.isFinalLocked) return { ok: false, error: "Lagu tidak terkunci." };
  await prisma.eventSong.update({
    where: { id: eventSongId },
    data: { isFinalLocked: false, status: "REHEARSAL_READY" },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.FINAL_UNLOCKED,
    entityType: "Song",
    entityId: eventSong.songId,
    summary: `Kunci final "${eventSong.song.title}" dibuka; status kembali lolos rehearsal.`,
    metadata: { song: eventSong.song.title, eventId: eventSong.eventId },
  });
  return { ok: true };
}

export const MATERIAL_SAVE_FAILED =
  "Materi gagal disimpan. Coba lagi, atau hubungi admin bila masalah berlanjut.";

export async function addMaterial(
  actorUserId: string,
  input: MaterialInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const song = await prisma.song.findUnique({ where: { id: input.songId } });
    if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
    // docs/13 §4.2: null = materi pustaka. Kolom ini FK ke Event, jadi
    // sentinel "library" melanggar constraint dan menggagalkan seluruh simpan.
    const eventId = input.eventId ?? null;
    if (eventId) {
      const eventSong = await prisma.eventSong.findUnique({
        where: {
          eventId_songId: { eventId, songId: input.songId },
        },
        select: { id: true },
      });
      if (!eventSong) {
        return {
          ok: false,
          error: "Materi event harus terkait lagu di setlist event tersebut.",
        };
      }
    }
    if (input.arrangementVersionId) {
      const version = await prisma.arrangementVersion.findUnique({
        where: { id: input.arrangementVersionId },
      });
      if (!version || version.songId !== input.songId) {
        return { ok: false, error: "Versi aransemen tidak cocok dengan lagu." };
      }
    }
    // Satu materi aktif per (lagu, kategori, ruang lingkup event/pustaka).
    const category = input.category as MaterialCategory;
    await prisma.$transaction([
      prisma.songMaterial.updateMany({
        where: {
          songId: input.songId,
          category,
          eventId,
        },
        data: { isActive: false },
      }),
      prisma.songMaterial.create({
        data: {
          songId: input.songId,
          eventId,
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
      metadata: {
        song: song.title,
        category: input.category,
        eventId: eventId ?? "library",
      },
    });
    return { ok: true };
  } catch (error) {
    console.error("add-material-failed", error);
    return { ok: false, error: MATERIAL_SAVE_FAILED };
  }
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
        where: {
          songId: material.songId,
          category: material.category,
          eventId: material.eventId,
        },
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
      metadata: {
        song: material.song.title,
        title: material.title,
        eventId: material.eventId ?? "library",
      },
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

export async function archiveSong(
  actorUserId: string,
  songId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId } },
    include: { song: { select: { title: true } } },
  });
  if (!eventSong) return { ok: false, error: "Lagu tidak ditemukan di event ini." };
  await prisma.song.update({
    where: { id: songId },
    data: {
      archivedAt: new Date(),
      archivedById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_UPDATED,
    entityType: "Song",
    entityId: songId,
    summary: `"${eventSong.song.title}" diarsipkan (soft archive).`,
    metadata: { songId, eventId },
  });
  return { ok: true };
}

export async function restoreSong(
  actorUserId: string,
  songId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId } },
    include: { song: { select: { title: true } } },
  });
  if (!eventSong) return { ok: false, error: "Lagu tidak ditemukan di event ini." };
  await prisma.song.update({
    where: { id: songId },
    data: {
      archivedAt: null,
      archivedById: null,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_UPDATED,
    entityType: "Song",
    entityId: songId,
    summary: `"${eventSong.song.title}" dipulihkan dari arsip.`,
    metadata: { songId, eventId },
  });
  return { ok: true };
}
