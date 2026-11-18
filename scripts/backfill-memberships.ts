// Backfill EventMembership untuk akun lama yang belum punya membership.
//
// Jangan jalankan ulang SQL migrasi 20261103000010_event_type_membership.
// SQL itu menambahkan setiap akun aktif ke event REGIONAL terbaru, termasuk
// akun yang sudah hanya anggota INTERNAL_GEHC.
//
// Skrip ini hanya menambahkan membership Regional untuk akun aktif yang
// belum punya EventMembership sama sekali. Akun yang sudah anggota event
// mana pun tidak disentuh.
//
// Usage:
//   npm run backfill:memberships
//   npm run backfill:memberships -- --apply
//   npm run backfill:memberships -- --apply --allow-prod
//
// Default dry-run. --apply menulis. Bila prefix user DB adalah rGq,
// --apply ditolak kecuali --allow-prod ikut diberikan.
// Host dan prefix user DB dicetak sebelum koneksi dipakai.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { databaseTargetFromUrl } from "@/lib/intro-migration";
import {
  membershipApplyIsBlocked,
  planMembershipBackfill,
  PROD_DB_USER_PREFIX,
  type BackfillEvent,
  type MembershipBackfillInsert,
} from "@/lib/membership-backfill";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else if (existsSync(".env")) loadDotenv();

const apply = process.argv.includes("--apply");
const allowProd = process.argv.includes("--allow-prod");
let usedDatabase = false;

function formatDate(value: Date | null): string {
  if (!value) return "tanpa tanggal";
  return value.toISOString().slice(0, 10);
}

async function applyInserts(
  actorUserId: string | undefined,
  target: BackfillEvent,
  inserts: readonly MembershipBackfillInsert[],
): Promise<{ created: MembershipBackfillInsert[]; skipped: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const created: MembershipBackfillInsert[] = [];
    let skipped = 0;
    const event = await tx.event.findUnique({
      where: { id: target.id },
      select: { id: true, eventType: true, eventStatus: true },
    });
    if (
      !event ||
      event.eventType !== "REGIONAL" ||
      event.eventStatus === "CANCELLED"
    ) {
      throw new Error(
        "Event regional target tidak lagi valid. Tidak ada membership yang ditulis.",
      );
    }

    for (const row of inserts) {
      const membershipCount = await tx.eventMembership.count({
        where: { userId: row.userId },
      });
      if (membershipCount > 0) {
        skipped += 1;
        continue;
      }
      await tx.eventMembership.create({
        data: {
          eventId: event.id,
          userId: row.userId,
          role: row.eventRole,
        },
      });
      created.push(row);
    }
    return { created, skipped };
  });

  for (const row of result.created) {
    console.log(`- ${row.username}: ditambahkan sebagai ${row.eventRole}`);
    await writeAudit({
      actorUserId,
      action: AuditAction.EVENT_MEMBERSHIP_ADDED,
      entityType: "EventMembership",
      entityId: `${target.id}:${row.userId}`,
      summary: `${row.username} ditambahkan ke "${target.name}" sebagai ${row.eventRole} (backfill akun tanpa membership).`,
      metadata: {
        eventId: target.id,
        username: row.username,
        role: row.eventRole,
        via: "backfill:memberships",
      },
    });
  }
  if (result.skipped > 0) {
    console.log(
      `${result.skipped} akun dilewati karena sudah punya membership saat ditulis.`,
    );
  }

  return result;
}

async function main(): Promise<void> {
  let targetDb: ReturnType<typeof databaseTargetFromUrl>;
  try {
    targetDb = databaseTargetFromUrl(process.env.DATABASE_URL);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  console.log(`Host: ${targetDb.host}`);
  console.log(`DB user prefix: ${targetDb.userPrefix || "(kosong)"}`);

  if (membershipApplyIsBlocked(targetDb.userPrefix, { apply, allowProd })) {
    console.error(
      `Menolak --apply: prefix user DB adalah ${PROD_DB_USER_PREFIX}. Tambahkan --allow-prod bila ini memang disengaja.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);

  usedDatabase = true;
  const [users, events] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        _count: { select: { memberships: true } },
      },
    }),
    prisma.event.findMany({
      select: {
        id: true,
        name: true,
        eventType: true,
        eventStatus: true,
        eventDate: true,
        updatedAt: true,
      },
    }),
  ]);

  const plan = planMembershipBackfill({
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      membershipCount: user._count.memberships,
    })),
    events,
  });

  if (!plan.targetEvent) {
    console.error(
      "Tidak ada event REGIONAL non-CANCELLED. Tidak ada membership yang ditulis.",
    );
    if (plan.unassignedActiveCount > 0) {
      console.error(
        `${plan.unassignedActiveCount} akun aktif tanpa membership tidak ditambahkan.`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Event regional target: "${plan.targetEvent.name}" (${plan.targetEvent.id}) — ${formatDate(plan.targetEvent.eventDate)}`,
  );
  console.log(
    `${plan.inserts.length} akun aktif tanpa membership akan ditambahkan; ${plan.skippedMemberCount} akun yang sudah punya membership tidak disentuh; ${plan.skippedInactiveCount} akun nonaktif tanpa membership dilewati.`,
  );
  for (const row of plan.inserts) {
    console.log(
      `- ${row.username}: ${row.globalRole} → ${row.eventRole}`,
    );
  }

  if (!apply) {
    console.log(
      "Dry-run selesai. Tidak ada yang ditulis. Ulangi dengan --apply untuk menulis.",
    );
    return;
  }

  if (plan.inserts.length === 0) {
    console.log("Tidak ada yang ditulis.");
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true },
  });
  if (admin) {
    console.log(`Audit actor: ${admin.username}.`);
  } else {
    console.log("Tidak ada ADMIN aktif; audit ditulis tanpa actor.");
  }

  const result = await applyInserts(
    admin?.id,
    plan.targetEvent,
    plan.inserts,
  );
  console.log(
    `Selesai: ${result.created.length} ditambahkan, ${result.skipped} lewati karena sudah punya membership.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "Backfill membership gagal:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!usedDatabase) return;
    await prisma.$disconnect();
  });
