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
  liturgicalFunction?: string;
  status: string;
  originalReferenceUrl?: string;
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
  const songId =
    existing?.id ??
    (await (async () => {
      const created = await createSong(actorId, {
        eventId,
        title: s.title,
        liturgicalFunction: s.liturgicalFunction,
        originalReferenceUrl: s.originalReferenceUrl,
        status: parseSongStatus(s.status),
      });
      if (!created.ok) throw new Error(`Lagu gagal: ${created.error}`);
      return created.id;
    })());

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

  console.log(
    `Seed selesai: event "${event.name}", ${data.persons.length} personel, ${songCount} entri lagu, ${data.batches.length} batch.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed gagal.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
