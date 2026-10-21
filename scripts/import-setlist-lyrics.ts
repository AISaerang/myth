import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { prisma } from "@/lib/db";
import { importLegacyChart, importLyricsChart } from "@server/services/chart-arrangement-service";
import { SETLIST_LYRICS } from "../prisma/setlist-lyrics";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else loadDotenv();

const dryRun = process.argv.includes("--dry-run");

const SETLIST_TITLES = [
  "Mentega & Roti",
  "Satu Anak Tuhan",
  "Bapa Abraham",
  "Kucinta Keluarga Tuhan",
  "Ku Tak Pandang dari Gereja Mana",
  "Sungguh Indah",
  "Bapa Sentuh Hatiku",
  "NNBT No. 20 Kami Bersyukur padaMu Tuhan",
  "Joyful Gathering",
  "Obor Pembangunan",
];

const lyricsByTitle = new Map(SETLIST_LYRICS.map((song) => [song.title, song]));

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
    where: { title: { in: SETLIST_TITLES } },
    select: {
      id: true,
      title: true,
      chordCharts: {
        where: { isActive: true },
        select: { id: true },
        take: 1,
      },
      _count: { select: { chartSections: true, chartArrangements: true } },
    },
  });
  const songsByTitle = new Map(songs.map((song) => [song.title, song]));

  console.log(
    `${dryRun ? "[dry-run] " : ""}${SETLIST_TITLES.length} lagu setlist diproses oleh ${admin.username}:`,
  );

  let imported = 0;
  let planned = 0;
  let skipped = 0;
  let failed = 0;

  for (const title of SETLIST_TITLES) {
    const song = songsByTitle.get(title);
    if (!song) {
      failed += 1;
      console.error(`- ${title}: GAGAL (lagu tidak ditemukan)`);
      continue;
    }

    if (song._count.chartSections > 0 || song._count.chartArrangements > 0) {
      skipped += 1;
      console.log(`- ${title}: dilewati (sudah punya bagian/aransemen)`);
      continue;
    }

    if (song.chordCharts.length > 0) {
      if (dryRun) {
        planned += 1;
        console.log(`- ${title}: akan impor chart lama (lirik + chord)`);
        continue;
      }
      const result = await importLegacyChart(
        admin.id,
        song.id,
        "Aransemen Utama",
      );
      if (result.ok) {
        imported += 1;
        console.log(`- ${title}: OK (chart lama)`);
      } else {
        failed += 1;
        console.error(`- ${title}: GAGAL (${result.error})`);
      }
      continue;
    }

    const lyrics = lyricsByTitle.get(title);
    if (!lyrics) {
      failed += 1;
      console.error(
        `- ${title}: GAGAL (tidak ada chart aktif dan tidak ada data lirik)`,
      );
      continue;
    }

    if (dryRun) {
      planned += 1;
      console.log(
        `- ${title}: akan impor lirik (${lyrics.sections.length} bagian)`,
      );
      continue;
    }

    const result = await importLyricsChart(admin.id, {
      songId: song.id,
      name: lyrics.arrangementName,
      sections: lyrics.sections,
      items: lyrics.items,
    });
    if (result.ok) {
      imported += 1;
      console.log(`- ${title}: OK (${lyrics.sections.length} bagian lirik)`);
    } else {
      failed += 1;
      console.error(`- ${title}: GAGAL (${result.error})`);
    }
  }

  if (dryRun) {
    console.log(
      `Selesai: ${planned} akan diimpor, ${skipped} dilewati, ${failed} gagal.`,
    );
  } else {
    console.log(
      `Selesai: ${imported} diimpor, ${skipped} dilewati, ${failed} gagal.`,
    );
  }
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error("Import lirik gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
