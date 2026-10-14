import "server-only";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  INVITE_TTL_MS,
  generateInviteToken,
  hashInviteToken,
} from "@/lib/invite-token";
import {
  clearLoginThrottle,
  isLoginThrottled,
  recordFailedLogin,
} from "./login-throttle";
import { createSession } from "./session-service";
import { touchLastLogin } from "./user-service";

export const INVITE_REDEEM_THROTTLE_PREFIX = "invite";

export function inviteRedeemThrottleKey(ip: string): string {
  return `${INVITE_REDEEM_THROTTLE_PREFIX}::${ip}`;
}

export const INVITE_GENERIC_ERROR = "Link undangan tidak valid atau kedaluwarsa.";

// Issues a personal login link for a user. Only the latest unused invite
// stays valid; the plaintext token is returned ONCE (shown to the admin),
// only its hash is stored.
export async function createInviteLink(
  actorUserId: string,
  targetUserId: string,
): Promise<
  | { ok: true; username: string; inviteToken: string }
  | { ok: false; error: string }
> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, isActive: true },
  });
  if (!target) return { ok: false, error: "Akun tidak ditemukan." };
  if (!target.isActive) {
    return {
      ok: false,
      error: "Akun nonaktif; aktifkan dulu sebelum membuat undangan.",
    };
  }
  const inviteToken = generateInviteToken();
  await prisma.loginToken.deleteMany({
    where: { userId: target.id, usedAt: null },
  });
  await prisma.loginToken.create({
    data: {
      tokenHash: hashInviteToken(inviteToken),
      userId: target.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.INVITE_CREATED,
    entityType: "User",
    entityId: target.id,
    summary: `Link undangan dibuat untuk ${target.username}.`,
    metadata: { username: target.username },
  });
  return { ok: true, username: target.username, inviteToken };
}

// Consumes a personal invite token and opens a standard session.
// Callers MUST return the generic error regardless of the reason so no
// one learns whether a token exists, is used, expired, or revoked.
export async function redeemInviteToken(
  rawToken: string,
  ip: string,
): Promise<
  | { ok: true; sessionToken: string; mustChangePassword: boolean }
  | { ok: false; error: string }
> {
  const key = inviteRedeemThrottleKey(ip);
  if (isLoginThrottled(key)) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
    };
  }
  const now = new Date();
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashInviteToken(rawToken) },
    include: {
      user: { select: { id: true, isActive: true, mustChangePassword: true } },
    },
  });
  if (
    !row ||
    row.usedAt ||
    row.expiresAt.getTime() <= now.getTime() ||
    !row.user.isActive
  ) {
    recordFailedLogin(key);
    return { ok: false, error: INVITE_GENERIC_ERROR };
  }
  // Atomic single-use claim: concurrent redeems race on usedAt.
  const claimed = await prisma.loginToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) {
    recordFailedLogin(key);
    return { ok: false, error: INVITE_GENERIC_ERROR };
  }
  clearLoginThrottle(key);
  const sessionToken = await createSession(row.userId);
  await touchLastLogin(row.userId);
  await writeAudit({
    actorUserId: row.userId,
    action: AuditAction.INVITE_REDEEMED,
    entityType: "User",
    entityId: row.userId,
    summary: "Masuk via link undangan.",
  });
  return {
    ok: true,
    sessionToken,
    mustChangePassword: row.user.mustChangePassword,
  };
}
