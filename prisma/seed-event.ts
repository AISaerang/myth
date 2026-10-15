// Event seed (DATA LOKAL — file ini boleh di-commit, datanya TIDAK).
//
// Usage:
//   1. Copy STRUKTUR dari prisma/seed-data.local.json (file itu di-gitignore).
//   2. npm run db:migrate && npm run bootstrap:admin
//   3. npm run seed:event
//
// Idempoten: mencari berdasarkan nama/judul dulu, hanya membuat yang
// belum ada, dan mengaktifkan versi/materi yang hilang. Aman di-run ulang.
// Tidak ada password di sini — akun login dibuat terpisah lewat UI /people.

import { existsSync, readFileSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import type { EventStatus, SongStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createEvent } from "@server/services/event-service";
import {
  assignSkill,
  createPerson,
  createSkill,
  listSkills,
} from "@server/services/personnel-service";
import {
  activateVersion,
  addMaterial,
  assignPerson,
  createSong,
  createVersion,
} from "@server/services/song-service";
import {
  addSongToBatch,
  createBatch,
} from "@server/services/batch-service";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else loadDotenv();

const DATA_PATH = "prisma/seed-data.local.json";

interface SeedSong {
  title: string;
  artistOrAuthor?: string;
  liturgicalFunction?: string;
  status: string;
  key?: string;
  bpm?: number;
  timeSignature?: string;
  estimatedDurationSeconds?: number;
  arrangementNotes?: string;
  originalReferenceUrl?: string;
  chordChart?: { originalKey: string; label?: string; content: string };
}

interface SeedBatch {
  name: string;
  description?: string;
  assignBand: boolean;
  assignSingers: boolean;
  songs: SeedSong[];
}

interface SeedPerson {
  displayName: string;
  username: string;
  congregation?: string;
  skills: string[];
  notes?: string;
}

interface SeedData {
  event: { name: string; description?: string; eventDate?: string; eventStatus: string; notes?: string };
  skills: string[];
  persons: SeedPerson[];
  bandUsernames: string[];
  singerUsernames: string[];
  batches: SeedBatch[];
}

const SONG_STATUSES: SongStatus[] = [
  "DRAFT",
  "SOURCE_SHARED",
  "ARRANGEMENT_IN_PROGRESS",
  "REFERENCE_READY",
  "PRACTICING",
  "NEEDS_REVIEW",
  "READY_FOR_REHEARSAL",
  "REHEARSAL_READY",
  "FINAL_LOCKED",
];

const EVENT_STATUSES: EventStatus[] = [
  "DRAFT",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

function parseSongStatus(value: string): SongStatus {
  if ((SONG_STATUSES as string[]).includes(value)) return value as SongStatus;
  throw new Error(`Status lagu tidak valid di seed: ${value}`);
}

function parseEventStatus(value: string): EventStatus {
  if ((EVENT_STATUSES as string[]).includes(value)) {
    return value as EventStatus;
  }
  throw new Error(`Status event tidak valid di seed: ${value}`);
}

async function findAdminId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    throw new Error("Belum ada admin aktif. Jalankan bootstrap:admin dulu.");
  }
  return admin.id;
}

async function ensureSkill(name: string): Promise<string> {
  const existing = await prisma.instrumentSkill.findFirst({
    where: { name: { equals: name } },
  });
  if (existing) return existing.id;
  const result = await createSkill(name);
  if (!result.ok) throw new Error(`Skill gagal: ${result.error}`);
  return result.id;
}

async function ensurePerson(
  actorId: string,
  p: SeedPerson,
  skillIds: Map<string, string>,
): Promise<string> {
  const existing = await prisma.person.findFirst({
    where: { displayName: { equals: p.displayName } },
  });
  const personId =
    existing?.id ??
    (await (async () => {
      const created = await createPerson(actorId, {
        displayName: p.displayName,
        congregation: p.congregation,
        notes: p.notes,
        isConfirmed: false,
      });
      if (!created.ok) throw new Error(`Person gagal: ${created.error}`);
      return created.id;
    })());
  for (const skillName of p.skills) {
    const skillId = skillIds.get(skillName);
    if (skillId) await assignSkill(personId, skillId).catch(() => {});
  }
  return personId;
}

async function ensureSong(
  actorId: string,
  eventId: string,
  s: SeedSong,
): Promise<string> {
  const existing = await prisma.song.findFirst({
    where: { eventId, title: { equals: s.title } },
  });
  const targetStatus = parseSongStatus(s.status);
  const songId =
    existing?.id ??
    (await (async () => {
      const created = await createSong(actorId, {
        eventId,
        title: s.title,
        artistOrAuthor: s.artistOrAuthor,
        liturgicalFunction: s.liturgicalFunction,
        key: s.key,
        bpm: s.bpm,
        timeSignature: s.timeSignature,
        estimatedDurationSeconds: s.estimatedDurationSeconds,
        arrangementNotes: s.arrangementNotes,
        originalReferenceUrl: s.originalReferenceUrl,
        status: targetStatus,
      });
      if (!created.ok) throw new Error(`Lagu gagal: ${created.error}`);
      return created.id;
    })());

  // Sync metadata lagu yang sudah ada (non-destruktif; final lock dihormati).
  if (existing) {
    const want = {
      artistOrAuthor: s.artistOrAuthor || null,
      liturgicalFunction: s.liturgicalFunction || null,
      key: s.key || undefined,
      bpm: s.bpm,
      timeSignature: s.timeSignature || undefined,
      estimatedDurationSeconds: s.estimatedDurationSeconds,
      arrangementNotes: s.arrangementNotes || null,
      originalReferenceUrl: s.originalReferenceUrl || undefined,
    };
    const differs =
      (existing.artistOrAuthor ?? null) !== want.artistOrAuthor ||
      (existing.liturgicalFunction ?? null) !== want.liturgicalFunction ||
      (existing.key ?? undefined) !== want.key ||
      (existing.bpm ?? undefined) !== want.bpm ||
      (existing.timeSignature ?? undefined) !== want.timeSignature ||
      (existing.estimatedDurationSeconds ?? undefined) !==
        want.estimatedDurationSeconds ||
      (existing.arrangementNotes ?? null) !== want.arrangementNotes ||
      (existing.originalReferenceUrl ?? undefined) !== want.originalReferenceUrl ||
      existing.status !== targetStatus;
    if (differs && !existing.isFinalLocked) {
      const { updateSong } = await import("@server/services/song-service");
      const updated = await updateSong(actorId, songId, {
        title: existing.title,
        artistOrAuthor: s.artistOrAuthor,
        liturgicalFunction: s.liturgicalFunction,
        key: s.key,
        bpm: s.bpm,
        timeSignature: s.timeSignature,
        estimatedDurationSeconds: s.estimatedDurationSeconds,
        arrangementNotes: s.arrangementNotes,
        originalReferenceUrl: s.originalReferenceUrl,
        status: targetStatus,
      });
      if (!updated.ok) console.log(` Lewati sync ${s.title}: ${updated.error}`);
    }
  }

  if (s.originalReferenceUrl) {
    let version = await prisma.arrangementVersion.findFirst({
      where: { songId, versionLabel: "v01" },
    });
    if (!version) {
      const created = await createVersion(actorId, {
        songId,
        versionLabel: "v01",
        changeSummary: "Referensi awal dari YouTube.",
        referenceUrl: s.originalReferenceUrl,
      });
      if (!created.ok) throw new Error(`Versi gagal: ${created.error}`);
      version = await prisma.arrangementVersion.findUnique({
        where: { id: created.id },
      });
    }
    if (version && !version.isActive) {
      await activateVersion(actorId, version.id).catch(() => {});
    }
    const material = await prisma.songMaterial.findFirst({
      where: {
        songId,
        category: "ORIGINAL",
        url: s.originalReferenceUrl,
      },
    });
    if (!material) {
      await addMaterial(actorId, {
        songId,
        title: `${s.title} — Original (YouTube)`,
        category: "ORIGINAL",
        url: s.originalReferenceUrl,
        versionLabel: "v01",
      }).catch(() => {});
    }
  }

  if (s.chordChart) {
    const { saveChordChart, getActiveChordChart } = await import(
      "@server/services/chord-service"
    );
    const active = await getActiveChordChart(songId);
    if (!active) {
      const saved = await saveChordChart(actorId, {
        songId,
        content: s.chordChart.content,
        originalKey: s.chordChart.originalKey,
        label: s.chordChart.label,
      });
      if (!saved.ok) throw new Error(`Chord chart gagal: ${saved.error}`);
    }
  }
  return songId;
}

async function main(): Promise<void> {
  if (!existsSync(DATA_PATH)) {
    throw new Error(
      `File ${DATA_PATH} tidak ada. Lihat dokumentasi seed di docs/12-LOCAL-SETUP.md.`,
    );
  }
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8")) as SeedData;
  const actorId = await findAdminId();

  let event = await prisma.event.findFirst({
    where: { name: { equals: data.event.name } },
  });
  if (!event) {
    const eventDate = data.event.eventDate
      ? new Date(`${data.event.eventDate}T00:00:00+07:00`)
      : undefined;
    if (data.event.eventDate && Number.isNaN(eventDate?.getTime() ?? NaN)) {
      throw new Error(`eventDate tidak valid di seed: ${data.event.eventDate}`);
    }
    event = await createEvent(actorId, {
      name: data.event.name,
      description: data.event.description,
      eventDate,
      eventStatus: parseEventStatus(data.event.eventStatus),
      notes: data.event.notes,
    });
  }

  const skillIds = new Map<string, string>();
  for (const name of data.skills) skillIds.set(name, await ensureSkill(name));
  const allSkills = await listSkills();
  for (const s of allSkills) skillIds.set(s.name, s.id);

  // username -> personId (username hanya untuk mapping assignment).
  const personByUsername = new Map<string, string>();
  for (const p of data.persons) {
    personByUsername.set(
      p.username.toLowerCase(),
      await ensurePerson(actorId, p, skillIds),
    );
  }

  let songCount = 0;
  const activeTitles = new Set<string>();
  for (const b of data.batches) {
    for (const s of b.songs) activeTitles.add(s.title.toLowerCase());
  }
  for (const b of data.batches) {
    let batch = await prisma.songBatch.findFirst({
      where: { eventId: event.id, name: { equals: b.name } },
    });
    if (!batch) {
      const created = await createBatch(actorId, {
        eventId: event.id,
        name: b.name,
        description: b.description,
        status: "DRAFT",
      });
      if (!created.ok) throw new Error(`Batch gagal: ${created.error}`);
      batch = await prisma.songBatch.findUnique({ where: { id: created.id } });
      if (!batch) throw new Error("Batch hilang setelah dibuat.");
    }
    for (const s of b.songs) {
      const songId = await ensureSong(actorId, event.id, s);
      songCount += 1;
      await addSongToBatch(batch.id, songId).catch(() => {});
      const assignees = [
        ...(b.assignBand ? data.bandUsernames : []),
        ...(b.assignSingers ? data.singerUsernames : []),
      ];
      for (const username of assignees) {
        const personId = personByUsername.get(username.toLowerCase());
        if (!personId) continue;
        await assignPerson(actorId, {
          songId,
          personId,
          isPrimary: true,
        }).catch(() => {});
      }
    }
  }

  const archived = await archiveStaleSongs(actorId, event.id, activeTitles);
  await reconcileStaleBatches(actorId, event.id, data.batches.map((b) => b.name));

  console.log(
    `Seed selesai: event "${event.name}", ${data.persons.length} personel, ${songCount} entri lagu, ${data.batches.length} batch, ${archived} lagu diarsipkan.`,
  );
}

// Lagu event yang tak lagi di JSON: lepas assignment + batch, unpublish,
// kembali DRAFT. Histori (progres, versi, materi, audit) dipertahankan.
async function archiveStaleSongs(
  actorId: string,
  eventId: string,
  activeTitles: Set<string>,
): Promise<number> {
  const { AuditAction, writeAudit } = await import("@/lib/audit");
  const songs = await prisma.song.findMany({ where: { eventId } });
  let count = 0;
  for (const song of songs) {
    if (activeTitles.has(song.title.toLowerCase())) continue;
    const [assignments, items] = await Promise.all([
      prisma.songAssignment.count({ where: { songId: song.id } }),
      prisma.songBatchItem.count({ where: { songId: song.id } }),
    ]);
    if (
      !song.isPublished &&
      assignments === 0 &&
      items === 0 &&
      song.status === "DRAFT"
    ) {
      continue; // Sudah arsip.
    }
    await prisma.$transaction([
      prisma.songAssignment.deleteMany({ where: { songId: song.id } }),
      prisma.songBatchItem.deleteMany({ where: { songId: song.id } }),
      prisma.song.update({
        where: { id: song.id },
        data: { isPublished: false, status: "DRAFT" },
      }),
    ]);
    await writeAudit({
      actorUserId: actorId,
      action: AuditAction.SONG_UPDATED,
      entityType: "Song",
      entityId: song.id,
      summary: `"${song.title}" diarsipkan (keluar dari setlist).`,
      metadata: { title: song.title, archived: "true" },
    });
    count += 1;
  }
  return count;
}

// Batch event yang tak lagi di JSON: hapus bila masih DRAFT (scaffolding),
// arsipkan (status ARCHIVED + kosongkan isi) bila sudah diproses lanjut.
async function reconcileStaleBatches(
  actorId: string,
  eventId: string,
  activeNames: string[],
): Promise<void> {
  const { AuditAction, writeAudit } = await import("@/lib/audit");
  const wanted = new Set(activeNames.map((n) => n.toLowerCase()));
  const batches = await prisma.songBatch.findMany({ where: { eventId } });
  for (const batch of batches) {
    if (wanted.has(batch.name.toLowerCase())) continue;
    if (batch.status === "DRAFT") {
      await prisma.songBatchItem.deleteMany({
        where: { songBatchId: batch.id },
      });
      await prisma.songBatch.delete({ where: { id: batch.id } });
      console.log(` Batch lama dihapus: ${batch.name}`);
    } else {
      await prisma.$transaction([
        prisma.songBatchItem.deleteMany({ where: { songBatchId: batch.id } }),
        prisma.songBatch.update({
          where: { id: batch.id },
          data: { status: "ARCHIVED" },
        }),
      ]);
      await writeAudit({
        actorUserId: actorId,
        action: AuditAction.BATCH_STATUS_CHANGED,
        entityType: "SongBatch",
        entityId: batch.id,
        summary: `Batch "${batch.name}" diarsipkan (struktur rundown berubah).`,
        metadata: { name: batch.name, to: "ARCHIVED" },
      });
      console.log(` Batch lama diarsipkan: ${batch.name}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Seed gagal.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
