// Import chart ChordPro lama menjadi master bagian + aransemen aktif.
//
// Usage:
//   npm.cmd run import:charts -- --dry-run   # lihat daftar lagu saja
//   npm.cmd run import:charts               # import semua yang belum punya bagian
//
// Aman dijalankan ulang: lagu yang sudah punya ChartSection/ChartArrangement
// dilewati. Admin tetap mereview hasil import di /songs/[id]/chart.
// Requires: migration 20261021120000_chart_sections applied.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { prisma } from "@/lib/db";
import { importLegacyChart } from "@server/services/chart-arrangement-service";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else loadDotenv();

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true },
  });
  if (!admin) {
    console.error("Tidak ada akun ADMIN aktif untuk audit actor.");
    process.exit(1);
  }

  const songs = await prisma.song.findMany({
    where: {
      chordCharts: { some: { isActive: true } },
      chartSections: { none: {} },
      chartArrangements: { none: {} },
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  if (songs.length === 0) {
    console.log("Tidak ada lagu yang perlu diimpor.");
    return;
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}${songs.length} lagu akan diimpor oleh ${admin.username}:`,
  );
  for (const song of songs) {
    console.log(`- ${song.title}`);
  }
  if (dryRun) return;

  let imported = 0;
  let failed = 0;
  for (const song of songs) {
    const result = await importLegacyChart(admin.id, song.id);
    if (result.ok) {
      imported += 1;
      console.log(`- ${song.title}: OK`);
    } else {
      failed += 1;
      process.exitCode = 1;
      console.error(`- ${song.title}: GAGAL (${result.error})`);
    }
  }
  console.log(`Selesai: ${imported} diimpor, ${failed} gagal.`);
}

main()
  .catch((error: unknown) => {
    console.error("Import chart gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
