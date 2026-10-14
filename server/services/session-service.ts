import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashSessionToken,
} from "@/lib/session-token";

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

// Returns the session user only if the session exists, is unexpired,
// and the account is still active.
export async function findSessionUser(
  token: string,
): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          mustChangePassword: true,
          isActive: true,
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
  const { id, username, displayName, role, mustChangePassword } = session.user;
  return { id, username, displayName, role, mustChangePassword };
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session
    .delete({ where: { tokenHash: hashSessionToken(token) } })
    .catch(() => {});
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
