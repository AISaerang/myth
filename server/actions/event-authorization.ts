import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import {
  canManageEvent,
  canWriteEventData,
  decideSongEdit,
  isAdmin,
} from "@/lib/permissions";
import { getEventRole } from "@server/services/event-access";

export type SongContentChild =
  | { kind: "chordChart"; id: string }
  | { kind: "chartSection"; id: string }
  | { kind: "chartArrangement"; id: string }
  | { kind: "arrangementVersion"; id: string };

export function optionalEventId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type EventScopedEntity =
  | "batch"
  | "equipment"
  | "rehearsal"
  | "task";

export async function requireEventMember(
  user: SessionUser,
  eventId: string,
): Promise<void> {
  if (!(await getEventRole(user, eventId))) throw new Error("Forbidden");
}

export async function requireEventManager(
  user: SessionUser,
  eventId: string,
): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, accessClosedAt: true },
  });
  if (!event) throw new Error("Not found");

  const role = await getEventRole(user, event.id);
  if (!canWriteEventData(role, Boolean(event.accessClosedAt), isAdmin(user))) {
    throw new Error("Forbidden");
  }
}

// P7: hanya EVENT_ADMIN event ini atau global ADMIN boleh menutup/membuka
// akses. Berbeda dari requireEventManager: tetap diizinkan saat event
// sudah tertutup (agar bisa dibuka kembali), dan MEMBER/OBSERVER
// selalu ditolak (getEventRole memberi null saat tertutup).
export async function requireEventAccessManager(
  user: SessionUser,
  eventId: string,
): Promise<void> {
  const role = await getEventRole(user, eventId);
  if (!canManageEvent(role)) throw new Error("Forbidden");
}

export async function requireEventManagerForEntity(
  user: SessionUser,
  entity: EventScopedEntity,
  id: string,
): Promise<string> {
  const record =
    entity === "batch"
      ? await prisma.songBatch.findUnique({
          where: { id },
          select: { eventId: true },
        })
      : entity === "equipment"
        ? await prisma.equipmentItem.findUnique({
            where: { id },
            select: { eventId: true },
          })
        : entity === "rehearsal"
          ? await prisma.rehearsal.findUnique({
              where: { id },
              select: { eventId: true },
            })
          : await prisma.task.findUnique({
              where: { id },
              select: { eventId: true },
            });
  if (!record) throw new Error("Not found");
  await requireEventManager(user, record.eventId);
  return record.eventId;
}

export async function requireEventMemberForTask(
  user: SessionUser,
  taskId: string,
): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { eventId: true },
  });
  if (!task) throw new Error("Not found");
  await requireEventMember(user, task.eventId);
  return task.eventId;
}

export async function requireEventManagerForEventSong(
  user: SessionUser,
  eventSongId: string,
): Promise<{ id: string; eventId: string; songId: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    select: { id: true, eventId: true, songId: true },
  });
  if (!eventSong) throw new Error("Not found");
  await requireEventManager(user, eventSong.eventId);
  return eventSong;
}

export async function requireEventMemberForEventSong(
  user: SessionUser,
  eventSongId: string,
): Promise<{ id: string; eventId: string; songId: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    select: { id: true, eventId: true, songId: true },
  });
  if (!eventSong) throw new Error("Not found");
  await requireEventMember(user, eventSong.eventId);
  return eventSong;
}

export async function requireEventManagerForSong(
  user: SessionUser,
  songId: string,
  eventId: string,
): Promise<{ id: string; eventId: string; songId: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId } },
    select: { id: true, eventId: true, songId: true },
  });
  if (!eventSong) throw new Error("Not found");
  await requireEventManager(user, eventSong.eventId);
  return eventSong;
}

async function songContentChildSongId(
  child: SongContentChild,
): Promise<string | null> {
  if (child.kind === "chordChart") {
    const row = await prisma.chordChart.findUnique({
      where: { id: child.id },
      select: { songId: true },
    });
    return row?.songId ?? null;
  }
  if (child.kind === "chartSection") {
    const row = await prisma.chartSection.findUnique({
      where: { id: child.id },
      select: { songId: true },
    });
    return row?.songId ?? null;
  }
  if (child.kind === "chartArrangement") {
    const row = await prisma.chartArrangement.findUnique({
      where: { id: child.id },
      select: { songId: true },
    });
    return row?.songId ?? null;
  }
  const row = await prisma.arrangementVersion.findUnique({
    where: { id: child.id },
    select: { songId: true },
  });
  return row?.songId ?? null;
}

// Editor konten lagu. Lihat decideSongEdit untuk aturan event vs pustaka
// dan lagu yang dipakai lebih dari satu event. child memastikan chart,
// bagian, aransemen, atau versi yang dikirim benar-benar milik songId.
export async function requireSongContentEditor(
  user: SessionUser,
  songId: string,
  eventId: string | null,
  child?: SongContentChild,
): Promise<void> {
  const scopedEventId = eventId?.trim() || null;
  let songLinkedToEvent = false;
  let accessClosed = false;
  let eventRole: Awaited<ReturnType<typeof getEventRole>> = null;
  if (scopedEventId) {
    const [eventSong, event] = await Promise.all([
      prisma.eventSong.findUnique({
        where: { eventId_songId: { eventId: scopedEventId, songId } },
        select: { id: true },
      }),
      prisma.event.findUnique({
        where: { id: scopedEventId },
        select: { accessClosedAt: true },
      }),
    ]);
    songLinkedToEvent = Boolean(eventSong && event);
    accessClosed = Boolean(event?.accessClosedAt);
    if (songLinkedToEvent) {
      eventRole = await getEventRole(user, scopedEventId);
    }
  } else if (!isAdmin(user)) {
    throw new Error("Forbidden");
  } else {
    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { id: true },
    });
    if (!song) throw new Error("Not found");
  }

  const decision = decideSongEdit({
    globalAdmin: isAdmin(user),
    eventRole,
    accessClosed,
    eventId: scopedEventId,
    songLinkedToEvent,
  });
  if (!decision.ok) {
    throw new Error(decision.reason === "not-in-event" ? "Not found" : "Forbidden");
  }

  if (!child) return;
  const ownerSongId = await songContentChildSongId(child);
  if (ownerSongId !== songId) throw new Error("Not found");
}

export async function requireGlobalAdmin(user: SessionUser): Promise<void> {
  if (!isAdmin(user)) throw new Error("Forbidden");
}

export async function requireMaterialManager(
  user: SessionUser,
  materialId: string,
  eventId?: string | null,
): Promise<void> {
  const material = await prisma.songMaterial.findUnique({
    where: { id: materialId },
    select: { eventId: true, songId: true },
  });
  if (!material) throw new Error("Not found");
  if (material.eventId) {
    await requireEventManager(user, material.eventId);
    return;
  }
  // Library material on a setlist song: EVENT_ADMIN of the open event in
  // context may manage it. Without eventId, only global ADMIN (Pustaka).
  const scopedEventId = eventId?.trim() || "";
  if (!scopedEventId) {
    await requireGlobalAdmin(user);
    return;
  }
  await requireEventManagerForSong(user, material.songId, scopedEventId);
}
