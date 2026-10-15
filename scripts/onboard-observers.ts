// One-time onboarding for OBSERVER ("Pantau") accounts.
//
// Usage: npm run onboard:observers
// Creates OBSERVER accounts via the SAME service as /people
// (createUserWithTemporaryPassword): Zod validation, Argon2id hash,
// USER_CREATED audit, and auto-link to a Person profile by displayName.
// Idempotent: existing usernames are skipped.
// Generated temporary passwords are DISCARDED (never printed) — access
// goes through personal invite links from /broadcast, where each user
// sets their own password on first login.
//
// Requires: migration 20261015193600_add_observer_role applied.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/username";
import { createUserWithTemporaryPassword } from "@server/services/user-service";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else loadDotenv();

const OBSERVERS: { displayName: string; username: string; congregation: string }[] = [
  { displayName: "Axcellent", username: "axcellent", congregation: "Imanuel Jakarta Barat" },
  { displayName: "Cantika", username: "cantika", congregation: "Imanuel Jakarta Barat" },
  { displayName: "Lorenzo", username: "lorenzo", congregation: "Eben Haezer Cikarang" },
];

async function main(): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, username: true },
  });
  if (!admin) {
    console.error("Tidak ada akun ADMIN aktif untuk audit actor.");
    process.exit(1);
  }
  let created = 0;
  let skipped = 0;
  for (const o of OBSERVERS) {
    const username = normalizeUsername(o.username);
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      if (existing.role !== "OBSERVER") {
        console.error(`- ${username}: sudah ada dengan role ${existing.role}, dilewati (cek manual).`);
        process.exitCode = 1;
      } else {
        console.log(`- ${username}: sudah ada, dilewati.`);
      }
      skipped += 1;
      continue;
    }
    const result = await createUserWithTemporaryPassword(admin.id, {
      username,
      displayName: o.displayName,
      role: "OBSERVER",
    });
    if (!result.ok) {
      console.error(`- ${username}: GAGAL (${result.error})`);
      process.exitCode = 1;
      continue;
    }
    await prisma.person.updateMany({
      where: { userId: result.user.id },
      data: { congregation: o.congregation, isConfirmed: true },
    });
    console.log(`- ${username}: dibuat + profil "${o.congregation}" tertaut.`);
    created += 1;
  }
  const linked = await prisma.person.count({
    where: {
      user: { username: { in: OBSERVERS.map((o) => o.username) } },
    },
  });
  console.log(
    `Selesai: ${created} dibuat, ${skipped} dilewati, ${linked}/${OBSERVERS.length} profil tertaut.`,
  );
}

main()
  .catch((error) => {
    console.error("Onboarding observer gagal.");
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
