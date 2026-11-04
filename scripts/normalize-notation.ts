// Normalisasi not angka dan label intro pada lagu yang sudah tersimpan.
//
// - `.6` / `..6` (oktaf bawah, titik di depan) menjadi bentuk kanonik `6,` / `6,,`
// - bagian intro yang masih berlabel "Bagian n" menjadi "Intro"
//
// String lama tetap bisa dirender; skrip ini hanya merapikan data.
// Kolom tidak di-drop. Default dry-run, mencetak diff per lagu.
//
// Usage:
//   npm run normalize:notation
//   npm run normalize:notation -- --apply
//   npm run normalize:notation -- --apply --allow-prod
//
// Bila prefix user DB adalah rGq, --apply ditolak kecuali --allow-prod.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import type { ChartSectionType } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  databaseTargetFromUrl,
  introApplyIsBlocked,
  PROD_DB_USER_PREFIX,
} from "@/lib/intro-migration";
import {
  formatNotationDiff,
  planNotationNormalization,
  type NotationSongPlan,
} from "@/lib/notation-normalize";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else if (existsSync(".env")) loadDotenv();

const apply = process.argv.includes("--apply");
const allowProd = process.argv.includes("--allow-prod");
let usedDatabase = false;

async function applyPlan(
  actorUserId: string,
  songId: string,
  songTitle: string,
  plan: NotationSongPlan,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (plan.introNotation) {
      await tx.song.update({
        where: { id: songId },
        data: { introNotation: plan.introNotation.after },
      });
    }
    for (const section of plan.sections) {
      await tx.chartSection.update({
        where: { id: section.id },
        data: {
          label: section.labelAfter,
          type: section.typeAfter as ChartSectionType,
          content: section.contentAfter,
        },
      });
    }
    for (const item of plan.overrides) {
      await tx.chartArrangementItem.update({
        where: { id: item.id },
        data: { labelOverride: null },
      });
    }
  });

  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_SECTION_UPDATED,
    entityType: "Song",
    entityId: songId,
    summary: `Notasi dan label intro dinormalisasi untuk "${songTitle}".`,
    metadata: {
      song: songTitle,
      sections: String(plan.sections.length),
      introNotation: plan.introNotation ? "updated" : "unchanged",
    },
  });
}

async function main(): Promise<void> {
  let target: ReturnType<typeof databaseTargetFromUrl>;
  try {
    target = databaseTargetFromUrl(process.env.DATABASE_URL);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  console.log(`Host: ${target.host}`);
  console.log(`DB user prefix: ${target.userPrefix || "(kosong)"}`);

  if (introApplyIsBlocked(target.userPrefix, { apply, allowProd })) {
    console.error(
      `Menolak --apply: prefix user DB adalah ${PROD_DB_USER_PREFIX}. Tambahkan --allow-prod bila ini memang disengaja.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);

  usedDatabase = true;
  const songs = await prisma.song.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      introNotation: true,
      chartSections: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, type: true, content: true },
      },
      chartArrangements: {
        select: {
          items: {
            select: { id: true, sectionId: true, labelOverride: true },
          },
        },
      },
    },
  });

  const plans = songs.flatMap((song) => {
    const plan = planNotationNormalization({
      title: song.title,
      introNotation: song.introNotation,
      sections: song.chartSections.map((section) => ({
        id: section.id,
        label: section.label,
        type: section.type,
        content: section.content,
      })),
      overrides: song.chartArrangements.flatMap((arrangement) =>
        arrangement.items.map((item) => ({
          id: item.id,
          sectionId: item.sectionId,
          labelOverride: item.labelOverride,
        })),
      ),
    });
    return plan ? [{ songId: song.id, plan }] : [];
  });

  if (plans.length === 0) {
    console.log("Tidak ada lagu yang perlu dinormalisasi.");
    return;
  }

  console.log(`${plans.length} lagu berubah:`);
  for (const entry of plans) console.log(formatNotationDiff(entry.plan));

  if (!apply) {
    console.log("Dry-run selesai. Tidak ada yang ditulis. Ulangi dengan --apply untuk menulis.");
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true },
  });
  if (!admin) {
    console.error("Tidak ada akun ADMIN aktif untuk audit actor.");
    process.exitCode = 1;
    return;
  }
  console.log(`Menulis sebagai ${admin.username}.`);

  let updated = 0;
  let failed = 0;
  for (const entry of plans) {
    try {
      await applyPlan(admin.id, entry.songId, entry.plan.title, entry.plan);
      updated += 1;
      console.log(`- ${entry.plan.title}: OK`);
    } catch (error) {
      failed += 1;
      process.exitCode = 1;
      console.error(
        `- ${entry.plan.title}: GAGAL (${error instanceof Error ? error.message : "error"})`,
      );
    }
  }
  console.log(`Selesai: ${updated} diperbarui, ${failed} gagal.`);
}

main()
  .catch((error: unknown) => {
    console.error("Normalisasi notasi gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!usedDatabase) return;
    await prisma.$disconnect();
  });
