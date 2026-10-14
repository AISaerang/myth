import "server-only";
import type { MaterialCategory, SongStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type {
  ArrangementVersionInput,
  AssignmentInput,
  MaterialInput,
  SongInput,
} from "@/lib/validation/song";

export async function listSongs(eventId: string) {
  return prisma.song.findMany({
    where: { eventId },
    include: {
      activeVersion: { select: { id: true, versionLabel: true } },
      assignments: {
        include: {
          person: { select: { id: true, displayName: true } },
          instrumentSkill: { select: { id: true, name: true } },
        },
        orderBy: { person: { displayName: "asc" } },
      },
      batchItems: {
        include: { batch: { select: { id: true, name: true, status: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { title: "asc" }],
  });
}

// Lagu untuk personel: yang dipublikasi DAN ditugaskan ke profilnya.
export async function listMySongs(userId: string, eventId: string) {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) return [];
  return prisma.song.findMany({
    where: {
      eventId,
      isPublished: true,
      assignments: { some: { personId: person.id } },
    },
    include: {
      activeVersion: true,
      assignments: {
        where: { personId: person.id },
        include: { instrumentSkill: true },
      },
      materials: { where: { isActive: true }, orderBy: { category: "asc" } },
      batchItems: { include: { batch: { select: { name: true } } } },
    },
    orderBy: { title: "asc" },
  });
}

export async function getSong(id: string) {
  return prisma.song.findUnique({
    where: { id },
    include: {
      activeVersion: true,
      versions: { orderBy: { createdAt: "desc" } },
      materials: { orderBy: [{ category: "asc" }, { createdAt: "desc" }] },
      assignments: {
        include: {
          person: { select: { id: true, displayName: true, isActive: true } },
          instrumentSkill: { select: { id: true, name: true } },
        },
        orderBy: { person: { displayName: "asc" } },
      },
      batchItems: { include: { batch: true } },
      event: { select: { id: true, name: true } },
    },
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
