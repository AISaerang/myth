// One-off (USULAN, belum dijalankan): selaraskan tanggal + status batch ke
// jadwal 14 Nov 2026. Sab 24 Okt = batas akhir semua batch, materi sudah
// dibagikan → status PUBLISHED. Default dry-run; jalankan dengan APPLY=1.
//   npx tsx prisma/realign-batches-2026-10-24.ts         (dry-run)
//   APPLY=1 npx tsx prisma/realign-batches-2026-10-24.ts (tulis ke DB)
import { prisma } from "../src/lib/db";

const d = (v: string) => new Date(`${v}T00:00:00+07:00`);
// Urutan = createdAt asc (urutan manggung B1..B4).
const PLAN = [
  { releaseAt: d("2026-10-15"), targetReviewAt: d("2026-10-19") }, // B1 (tetap)
  { releaseAt: d("2026-10-17"), targetReviewAt: d("2026-10-24") }, // B2: 26→24 Okt
  { releaseAt: d("2026-10-22"), targetReviewAt: d("2026-10-24") }, // B3: 24 Okt–2 Nov → 22–24 Okt
  { releaseAt: d("2026-10-22"), targetReviewAt: d("2026-10-24") }, // B4: 31 Okt–9 Nov → 22–24 Okt
];

async function main() {
  const apply = process.env.APPLY === "1";
  const event = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
  if (!event) throw new Error("Event tidak ditemukan.");
  const batches = await prisma.songBatch.findMany({
    where: { eventId: event.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
  });
  for (const [i, b] of batches.entries()) {
    const plan = PLAN[i];
    if (!plan) { console.log(`Lewati (di luar rencana): ${b.name}`); continue; }
    console.log(`${b.name}: ${b.status} ${b.releaseAt?.toISOString()}→${b.targetReviewAt?.toISOString()}  ==>  PUBLISHED ${plan.releaseAt.toISOString()}→${plan.targetReviewAt.toISOString()}`);
    if (apply) {
      await prisma.songBatch.update({ where: { id: b.id }, data: { ...plan, status: "PUBLISHED" } });
    }
  }
  console.log(apply ? "Diterapkan." : "Dry-run, tidak ada perubahan.");
}
main().finally(() => prisma.$disconnect());
