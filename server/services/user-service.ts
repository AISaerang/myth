import "server-only";
import type { Role } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import { normalizeUsername } from "@/lib/username";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const publicSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  mustChangePassword: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

// Verify credentials. Returns the user on success, null otherwise.
// Callers MUST return a generic error regardless of the reason.
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
    select: { ...publicSelect, passwordHash: true },
  });
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function touchLastLogin(userId: string): Promise<void> {
  await prisma.user
    .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    .catch(() => {});
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return { ok: false, error: "Akun tidak ditemukan atau nonaktif." };
  }
  const matches = await verifyPassword(user.passwordHash, currentPassword);
  if (!matches) {
    return { ok: false, error: "Password saat ini salah." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
    },
  });
  // Rotation: changing password invalidates all existing sessions.
  const { destroyAllUserSessions } = await import("./session-service");
  await destroyAllUserSessions(userId);
  await writeAudit({
    actorUserId: userId,
    action: AuditAction.PASSWORD_CHANGED,
    entityType: "User",
    entityId: userId,
    summary: `Password diubah oleh ${user.username}.`,
  });
  return { ok: true };
}

export interface CreateUserInput {
  username: string; // already normalized by Zod transform
  displayName: string;
  role: Role;
}

// Creates a user with a one-time temporary password. The plaintext is
// returned ONCE so the admin can share it privately; only the hash
// is stored.
export async function createUserWithTemporaryPassword(
  actorUserId: string,
  input: CreateUserInput,
): Promise<
  | { ok: true; user: PublicUser; temporaryPassword: string }
  | { ok: false; error: string }
> {
  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (existing) {
    return { ok: false, error: "Username sudah dipakai." };
  }
  const temporaryPassword = generateTemporaryPassword();
  const user = await prisma.user.create({
    data: {
      username: input.username,
      displayName: input.displayName,
      role: input.role,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      isActive: true,
    },
    select: publicSelect,
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.USER_CREATED,
    entityType: "User",
    entityId: user.id,
    summary: `Akun ${user.username} (${user.role}) dibuat.`,
    metadata: { username: user.username, role: user.role },
  });
  // Setiap login identity mendapat operational identity (docs/05).
  const { ensurePersonForUser } = await import("./personnel-service");
  await ensurePersonForUser(user.id, user.displayName);
  return { ok: true, user, temporaryPassword };
}

export async function resetUserPassword(
  actorUserId: string,
  targetUserId: string,
): Promise<
  | { ok: true; username: string; temporaryPassword: string }
  | { ok: false; error: string }
> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target) return { ok: false, error: "Akun tidak ditemukan." };
  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
  });
  const { destroyAllUserSessions } = await import("./session-service");
  await destroyAllUserSessions(targetUserId);
  await writeAudit({
    actorUserId,
    action: AuditAction.PASSWORD_RESET,
    entityType: "User",
    entityId: targetUserId,
    summary: `Password ${target.username} di-reset; sesi lama dicabut.`,
    metadata: { username: target.username },
  });
  return { ok: true, username: target.username, temporaryPassword };
}

export async function setUserActive(
  actorUserId: string,
  targetUserId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actorUserId === targetUserId) {
    return { ok: false, error: "Tidak dapat menonaktifkan akun sendiri." };
  }
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target) return { ok: false, error: "Akun tidak ditemukan." };
  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
  });
  if (!isActive) {
    const { destroyAllUserSessions } = await import("./session-service");
    await destroyAllUserSessions(targetUserId);
  }
  // Histori progres/komentar dipertahankan; profil personel ikut
  // nonaktif/aktif agar keluar dari roster (docs/03).
  const { syncPersonActiveForUser } = await import("./personnel-service");
  await syncPersonActiveForUser(targetUserId, isActive);
  await writeAudit({
    actorUserId,
    action: isActive
      ? AuditAction.USER_ACTIVATED
      : AuditAction.USER_DEACTIVATED,
    entityType: "User",
    entityId: targetUserId,
    summary: `Akun ${target.username} ${isActive ? "diaktifkan" : "dinonaktifkan"}.`,
    metadata: { username: target.username },
  });
  return { ok: true };
}

export async function updateUserProfile(
  actorUserId: string,
  targetUserId: string,
  input: { displayName: string; role: Role },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target) return { ok: false, error: "Akun tidak ditemukan." };
  if (actorUserId === targetUserId && input.role !== target.role) {
    return { ok: false, error: "Tidak dapat mengubah role sendiri." };
  }
  await prisma.user.update({
    where: { id: targetUserId },
    data: { displayName: input.displayName, role: input.role },
  });
  // Nama roster mengikuti nama akun, kecuali admin sudah mengkustom
  // nama personel secara terpisah (divergen = jangan timpa).
  const linked = await prisma.person.findUnique({
    where: { userId: targetUserId },
  });
  if (linked && linked.displayName === target.displayName) {
    await prisma.person
      .update({ where: { id: linked.id }, data: { displayName: input.displayName } })
      .catch(() => {});
  }
  if (input.role !== target.role) {
    await writeAudit({
      actorUserId,
      action: AuditAction.ROLE_CHANGED,
      entityType: "User",
      entityId: targetUserId,
      summary: `Role ${target.username}: ${target.role} → ${input.role}.`,
      metadata: { username: target.username, from: target.role, to: input.role },
    });
  }
  return { ok: true };
}

export async function listUsers(): Promise<PublicUser[]> {
  return prisma.user.findMany({
    select: publicSelect,
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
  });
}
