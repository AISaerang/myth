import "server-only";
import type { Event } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  evaluateShareLink,
  type ShareLinkInvalidReason,
} from "@/lib/share-link";
import {
  SHARE_GUEST_TTL_MS,
  generateShareToken,
  hashShareToken,
  isShareTokenShape,
} from "@/lib/share-token";
import type { ShareLinkCreateInput } from "@/lib/validation/share";
import {
  clearLoginThrottle,
  isLoginThrottled,
  recordFailedLogin,
} from "./login-throttle";

export const SHARE_THROTTLE_PREFIX = "share";

export function shareLookupThrottleKey(ip: string): string {
  return `${SHARE_THROTTLE_PREFIX}::${ip}`;
}

export interface ResolvedShareLink {
  id: string;
  eventId: string;
  includeDrafts: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
  maxUses: number | null;
  useCount: number;
  event: Event;
}

export type ShareLinkResolution =
  | { ok: true; link: ResolvedShareLink }
  | { ok: false; reason: ShareLinkInvalidReason }
  | { ok: false; reason: null; throttled: true };

const linkInclude = { event: true } as const;

function toResolvedLink(row: {
  id: string;
  eventId: string;
  includeDrafts: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
  maxUses: number | null;
  useCount: number;
  event: Event;
}): ResolvedShareLink {
  return {
    id: row.id,
    eventId: row.eventId,
    includeDrafts: row.includeDrafts,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    maxUses: row.maxUses,
    useCount: row.useCount,
    event: row.event,
  };
}

export async function findShareLinkByToken(
  rawToken: string,
): Promise<ShareLinkResolution> {
  if (!isShareTokenShape(rawToken)) return { ok: false, reason: "unknown" };
  const row = await prisma.shareLink.findUnique({
    where: { tokenHash: hashShareToken(rawToken) },
    include: linkInclude,
  });
  const validity = evaluateShareLink({
    link: row
      ? {
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
          maxUses: row.maxUses,
          useCount: row.useCount,
        }
      : null,
    event: row
      ? {
          eventStatus: row.event.eventStatus,
          accessClosedAt: row.event.accessClosedAt,
        }
      : null,
  });
  if (!validity.ok) return { ok: false, reason: validity.reason };
  return { ok: true, link: toResolvedLink(row!) };
}

// Token lookups are throttled per IP. Failed/invalid tokens count as
// attempts; a successful lookup clears the bucket.
export async function resolveShareLinkGuarded(
  rawToken: string,
  ip: string,
): Promise<ShareLinkResolution> {
  const key = shareLookupThrottleKey(ip);
  if (isLoginThrottled(key)) {
    return { ok: false, reason: null, throttled: true };
  }
  const result = await findShareLinkByToken(rawToken);
  if (!result.ok) {
    recordFailedLogin(key);
    return result;
  }
  clearLoginThrottle(key);
  return result;
}

// Identity lookup only (no validity checks). Used to bind a guest session
// cookie to the link in the current /e/{token} path.
export async function findShareLinkIdByToken(
  rawToken: string,
): Promise<string | null> {
  if (!isShareTokenShape(rawToken)) return null;
  const row = await prisma.shareLink.findUnique({
    where: { tokenHash: hashShareToken(rawToken) },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function createShareLink(
  actorUserId: string,
  eventId: string,
  input: ShareLinkCreateInput,
): Promise<
  | { ok: true; id: string; token: string; eventName: string }
  | { ok: false; error: string }
> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true },
  });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };

  const token = generateShareToken();
  const link = await prisma.shareLink.create({
    data: {
      tokenHash: hashShareToken(token),
      eventId,
      label: input.label?.trim() || null,
      includeDrafts: input.includeDrafts,
      expiresAt: input.expiresAt ?? null,
      maxUses: input.maxUses ?? null,
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SHARE_LINK_CREATED,
    entityType: "ShareLink",
    entityId: link.id,
    summary: `Tautan event dibuat untuk "${event.name}".`,
    metadata: {
      eventId,
      eventName: event.name,
      includeDrafts: input.includeDrafts ? "true" : "false",
      label: input.label?.trim() || "",
    },
  });
  return { ok: true, id: link.id, token, eventName: event.name };
}

export async function listShareLinks(eventId: string) {
  return prisma.shareLink.findMany({
    where: { eventId },
    select: {
      id: true,
      label: true,
      includeDrafts: true,
      expiresAt: true,
      revokedAt: true,
      maxUses: true,
      useCount: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeShareLink(
  actorUserId: string,
  eventId: string,
  linkId: string,
): Promise<{ ok: true; changed: boolean } | { ok: false; error: string }> {
  const link = await prisma.shareLink.findFirst({
    where: { id: linkId, eventId },
    include: { event: { select: { name: true } } },
  });
  if (!link) return { ok: false, error: "Tautan tidak ditemukan." };
  if (link.revokedAt) return { ok: true, changed: false };
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SHARE_LINK_REVOKED,
    entityType: "ShareLink",
    entityId: link.id,
    summary: `Tautan event "${link.event.name}" ditarik.`,
    metadata: { eventId, eventName: link.event.name },
  });
  return { ok: true, changed: true };
}

export async function createGuestSession(
  link: ResolvedShareLink,
  displayName?: string,
): Promise<string> {
  const token = generateShareToken();
  const now = Date.now();
  const expiresAt = new Date(
    Math.min(
      now + SHARE_GUEST_TTL_MS,
      link.expiresAt ? link.expiresAt.getTime() : Number.POSITIVE_INFINITY,
    ),
  );
  await prisma.shareGuestSession.create({
    data: {
      tokenHash: hashShareToken(token),
      shareLinkId: link.id,
      displayName: displayName?.trim() || null,
      expiresAt,
    },
  });
  await writeAudit({
    action: AuditAction.SHARE_LINK_GUEST_STARTED,
    entityType: "ShareLink",
    entityId: link.id,
    summary: `Tamu membuka tautan event "${link.event.name}".`,
    metadata: {
      eventId: link.eventId,
      eventName: link.event.name,
      displayName: displayName?.trim() || "",
    },
  });
  return token;
}

export interface GuestSessionContext {
  session: {
    id: string;
    displayName: string | null;
    expiresAt: Date;
  };
  link: ResolvedShareLink;
}

export type GuestSessionResolution =
  | { ok: true; context: GuestSessionContext }
  | { ok: false; reason: ShareLinkInvalidReason | "session" };

// Re-checks the link and event on every guest request. An expired session,
// revoked link, closed event, or cancelled event invalidates the guest.
export async function resolveGuestSession(
  rawToken: string,
): Promise<GuestSessionResolution> {
  if (!isShareTokenShape(rawToken)) {
    return { ok: false, reason: "session" };
  }
  const session = await prisma.shareGuestSession.findUnique({
    where: { tokenHash: hashShareToken(rawToken) },
    include: { shareLink: { include: linkInclude } },
  });
  if (!session) return { ok: false, reason: "session" };
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.shareGuestSession
      .delete({ where: { id: session.id } })
      .catch(() => {});
    return { ok: false, reason: "session" };
  }
  // An existing guest session already consumed its use, so the maxUses cap
  // stops new redemptions only; it must not lock out the guest mid-visit.
  const validity = evaluateShareLink({
    link: {
      expiresAt: session.shareLink.expiresAt,
      revokedAt: session.shareLink.revokedAt,
      maxUses: null,
      useCount: session.shareLink.useCount,
    },
    event: {
      eventStatus: session.shareLink.event.eventStatus,
      accessClosedAt: session.shareLink.event.accessClosedAt,
    },
  });
  if (!validity.ok) return { ok: false, reason: validity.reason };

  await prisma.shareGuestSession
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});

  return {
    ok: true,
    context: {
      session: {
        id: session.id,
        displayName: session.displayName,
        expiresAt: session.expiresAt,
      },
      link: toResolvedLink(session.shareLink),
    },
  };
}

// Increment only after a successful guest start or logged-in resolution.
// Skips silently if the link has since been revoked/exhausted.
export async function recordShareLinkUse(linkId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const link = await tx.shareLink.findUnique({
      where: { id: linkId },
      select: {
        expiresAt: true,
        revokedAt: true,
        maxUses: true,
        useCount: true,
      },
    });
    if (!link || link.revokedAt) return false;
    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return false;
    if (link.maxUses != null && link.useCount >= link.maxUses) return false;
    await tx.shareLink.update({
      where: { id: linkId },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    return true;
  });
}

// Logged-in account opening a valid link becomes a MEMBER of that event,
// once. No SongAssignment and no User.role change.
export async function ensureShareLinkMembership(
  userId: string,
  link: ResolvedShareLink,
): Promise<{ created: boolean }> {
  const existing = await prisma.eventMembership.findUnique({
    where: { eventId_userId: { eventId: link.eventId, userId } },
    select: { id: true },
  });
  if (existing) return { created: false };
  try {
    await prisma.eventMembership.create({
      data: { eventId: link.eventId, userId, role: "MEMBER" },
    });
  } catch {
    // Unique race: another request already added the membership.
    return { created: false };
  }
  await writeAudit({
    actorUserId: userId,
    action: AuditAction.EVENT_MEMBERSHIP_ADDED,
    entityType: "Event",
    entityId: link.eventId,
    summary: `Bergabung ke event "${link.event.name}" via tautan event.`,
    metadata: {
      eventId: link.eventId,
      eventName: link.event.name,
      source: "SHARE_LINK",
      role: "MEMBER",
    },
  });
  return { created: true };
}
