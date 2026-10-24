// One-off: selaraskan semua tanggal portal ke Ibadah Pemuda Wilayah
// Sabtu 14 Nov 2026 (WIB). Event, rehearsal (per tipe) dan batch
// (urutan manggung = createdAt asc, B1..B4). Lagu tidak disentuh.
// Default dry-run; jalankan dengan APPLY=1.
//   npx tsx prisma/realign-event-2026-11-14.ts         (dry-run)
//   APPLY=1 npx tsx prisma/realign-event-2026-11-14.ts (tulis ke DB)
import { prisma } from "../src/lib/db";

const w = (v: string) => new Date(`${v}+07:00`);

const EVENT_DATE = w("2026-11-14T00:00:00");

// Review + latihan mandiri per batch, berurutan mengikuti urutan lagu,
// semua selesai sebelum full rehearsal 7 Nov.
const BATCH_PLAN = [
  { releaseAt: w("2026-10-25T00:00:00"), targetReviewAt: w("2026-10-29T00:00:00") }, // B1
  { releaseAt: w("2026-10-26T00:00:00"), targetReviewAt: w("2026-10-31T00:00:00") }, // B2
  { releaseAt: w("2026-10-27T00:00:00"), targetReviewAt: w("2026-11-03T00:00:00") }, // B3
  { releaseAt: w("2026-10-28T00:00:00"), targetReviewAt: w("2026-11-05T00:00:00") }, // B4
];

const REHEARSAL_PLAN: Record<string, { startsAt: Date; endsAt: Date }> = {
  ONLINE_MONITORING: { startsAt: w("2026-10-28T19:00:00"), endsAt: w("2026-10-28T21:00:00") },
  ONSITE_SECTIONAL: { startsAt: w("2026-10-31T10:00:00"), endsAt: w("2026-10-31T14:00:00") },
  FULL_REHEARSAL: { startsAt: w("2026-11-07T10:00:00"), endsAt: w("2026-11-07T15:00:00") },
  TECHNICAL_REHEARSAL: { startsAt: w("2026-11-13T15:00:00"), endsAt: w("2026-11-13T20:00:00") },
  EVENT_DAY_SOUNDCHECK: { startsAt: w("2026-11-14T07:00:00"), endsAt: w("2026-11-14T09:00:00") },
};

const iso = (d: Date | null | undefined) => d?.toISOString() ?? "-";

async function main() {
  const apply = process.env.APPLY === "1";
  const event = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
  if (!event) throw new Error("Event tidak ditemukan.");

  console.log(`Event ${event.name}: ${iso(event.eventDate)} ==> ${iso(EVENT_DATE)}`);
  if (apply) await prisma.event.update({ where: { id: event.id }, data: { eventDate: EVENT_DATE } });

  const rehearsals = await prisma.rehearsal.findMany({
    where: { eventId: event.id },
    orderBy: { startsAt: "asc" },
  });
  for (const r of rehearsals) {
    const plan = REHEARSAL_PLAN[r.type];
    if (!plan) { console.log(`Lewati rehearsal (tipe ${r.type}): ${r.title}`); continue; }
    console.log(`Rehearsal ${r.title} [${r.type}]: ${iso(r.startsAt)}→${iso(r.endsAt)} ==> ${iso(plan.startsAt)}→${iso(plan.endsAt)}`);
    if (apply) await prisma.rehearsal.update({ where: { id: r.id }, data: plan });
  }

  const batches = await prisma.songBatch.findMany({
    where: { eventId: event.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
  });
  for (const [i, b] of batches.entries()) {
    const plan = BATCH_PLAN[i];
    if (!plan) { console.log(`Lewati batch (di luar rencana): ${b.name}`); continue; }
    console.log(`Batch ${b.name}: ${iso(b.releaseAt)}→${iso(b.targetReviewAt)} ==> ${iso(plan.releaseAt)}→${iso(plan.targetReviewAt)}`);
    if (apply) await prisma.songBatch.update({ where: { id: b.id }, data: plan });
  }
  console.log(apply ? "Diterapkan." : "Dry-run, tidak ada perubahan.");
}
main().finally(() => prisma.$disconnect());
