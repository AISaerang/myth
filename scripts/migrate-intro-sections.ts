// Salin intro lagu (kolom Song.introChords / introNotation / introNote)
// menjadi bagian master bertipe INTRO, lalu letakkan di urutan pertama
// aransemen aktif. Kolom lama tidak dikosongkan dan tidak di-drop.
//
// Idempoten: lagu yang sudah punya bagian type INTRO dilewati.
//
// Usage:
//   npm run import:intro-sections
//   npm run import:intro-sections -- --apply
//   npm run import:intro-sections -- --apply --allow-prod
//
// Default dry-run. --apply menulis. Bila prefix user DB adalah rGq,
// --apply ditolak kecuali --allow-prod ikut diberikan.
// Host dan prefix user DB dicetak sebelum koneksi dipakai.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { makeUniqueSectionLabel } from "@/lib/chart-arrangement";
import {
  databaseTargetFromUrl,
  introApplyIsBlocked,
  planIntroMigration,
  PROD_DB_USER_PREFIX,
  type IntroMigrationPlan,
} from "@/lib/intro-migration";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else if (existsSync(".env")) loadDotenv();

const apply = process.argv.includes("--apply");
const allowProd = process.argv.includes("--allow-prod");
let usedDatabase = false;

interface SongRow {
  id: string;
  title: string;
  introChords: string | null;
  introNotation: string | null;
  introNote: string | null;
  chartSections: { type: string; label: string; sortOrder: number }[];
  chartArrangements: { id: string; name: string }[];
}

function describePlan(title: string, plan: IntroMigrationPlan): string {
  if (plan.action === "skip-empty") return `- ${title}: lewati (tidak ada kunci/not angka intro)`;
  if (plan.action === "skip-existing") {
    return `- ${title}: lewati (sudah ada bagian master Intro)`;
  }
  const where = plan.activeArrangementName
    ? `disisipkan pertama di aransemen aktif "${plan.activeArrangementName}"`
    : "tidak ada aransemen aktif, bagian master saja";
  return `- ${title}: buat bagian "${plan.label}" (${where})`;
}

async function applyPlan(
  actorUserId: string,
  song: SongRow,
  plan: Extract<IntroMigrationPlan, { action: "create" }>,
): Promise<"created" | "created-unplaced" | "skipped"> {
  const outcome = await prisma.$transaction(async (tx) => {
    const existing = await tx.chartSection.findFirst({
      where: { songId: song.id, type: "INTRO" },
      select: { id: true },
    });
    if (existing) return "skipped" as const;

    const sections = await tx.chartSection.findMany({
      where: { songId: song.id },
      select: { label: true, sortOrder: true },
    });
    const label = makeUniqueSectionLabel(
      "Intro",
      new Set(sections.map((section) => section.label)),
    );
    const minOrder = sections.reduce(
      (min, section) => Math.min(min, section.sortOrder),
      0,
    );
    const created = await tx.chartSection.create({
      data: {
        songId: song.id,
        type: "INTRO",
        label,
        content: plan.content,
        sortOrder: sections.length === 0 ? 0 : minOrder - 1,
        createdById: actorUserId,
      },
    });

    const active = await tx.chartArrangement.findFirst({
      where: { songId: song.id, isActive: true },
      select: { id: true, name: true },
    });
    if (!active) return "created-unplaced" as const;

    const items = await tx.chartArrangementItem.findMany({
      where: { arrangementId: active.id },
      orderBy: { sortOrder: "desc" },
      select: { id: true, sortOrder: true },
    });
    for (const item of items) {
      await tx.chartArrangementItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder + 1 },
      });
    }
    await tx.chartArrangementItem.create({
      data: {
        arrangementId: active.id,
        sectionId: created.id,
        sortOrder: 0,
      },
    });
    return "created" as const;
  });

  if (outcome === "skipped") return outcome;

  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_SECTION_CREATED,
    entityType: "Song",
    entityId: song.id,
    summary:
      outcome === "created"
        ? `Bagian Intro dari kolom intro lama dibuat dan diletakkan pertama di aransemen aktif untuk "${song.title}".`
        : `Bagian Intro dari kolom intro lama dibuat untuk "${song.title}" (tidak ada aransemen aktif).`,
    metadata: {
      song: song.title,
      section: "Intro",
      type: "INTRO",
      placed: outcome === "created" ? "active-arrangement-first" : "section-only",
    },
  });
  return outcome;
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

  const mode = apply ? "apply" : "dry-run";
  console.log(`Mode: ${mode}`);

  usedDatabase = true;
  const songs = await prisma.song.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      introChords: true,
      introNotation: true,
      introNote: true,
      chartSections: {
        select: { type: true, label: true, sortOrder: true },
      },
      chartArrangements: {
        where: { isActive: true },
        select: { id: true, name: true },
      },
    },
  });

  const plans = songs.map((song) => ({
    song,
    plan: planIntroMigration({
      fields: {
        introChords: song.introChords,
        introNotation: song.introNotation,
        introNote: song.introNote,
      },
      sections: song.chartSections,
      activeArrangementName: song.chartArrangements[0]?.name ?? null,
    }),
  }));

  const actionable = plans.filter((entry) => entry.plan.action === "create");
  const skippedExisting = plans.filter((entry) => entry.plan.action === "skip-existing");

  if (actionable.length === 0 && skippedExisting.length === 0) {
    console.log("Tidak ada lagu dengan kunci atau not angka intro.");
    return;
  }

  console.log(
    `${actionable.length} lagu akan dibuatkan bagian Intro${
      skippedExisting.length > 0
        ? `; ${skippedExisting.length} sudah punya bagian Intro`
        : ""
    }:`,
  );
  for (const entry of plans) {
    if (entry.plan.action === "skip-empty") continue;
    console.log(describePlan(entry.song.title, entry.plan));
  }

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

  let created = 0;
  let unplaced = 0;
  let skipped = 0;
  let failed = 0;
  for (const entry of actionable) {
    const plan = entry.plan;
    if (plan.action !== "create") continue;
    try {
      const outcome = await applyPlan(admin.id, entry.song, plan);
      if (outcome === "created") {
        created += 1;
        console.log(`- ${entry.song.title}: OK (pertama di aransemen aktif)`);
      } else if (outcome === "created-unplaced") {
        unplaced += 1;
        console.log(`- ${entry.song.title}: OK (bagian master, tanpa aransemen aktif)`);
      } else {
        skipped += 1;
        console.log(`- ${entry.song.title}: lewati (sudah ada bagian Intro)`);
      }
    } catch (error) {
      failed += 1;
      process.exitCode = 1;
      console.error(
        `- ${entry.song.title}: GAGAL (${error instanceof Error ? error.message : "error"})`,
      );
    }
  }
  console.log(
    `Selesai: ${created} disisipkan, ${unplaced} bagian saja, ${skipped} lewati, ${failed} gagal.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Migrasi intro gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!usedDatabase) return;
    await prisma.$disconnect();
  });
