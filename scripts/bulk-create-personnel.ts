// One-time bulk onboarding for the 8 seeded personnel (docs/12).
//
// Usage: npm run onboard:personnel
// Creates USER accounts via the SAME service as /people
// (createUserWithTemporaryPassword): Zod validation, Argon2id hash,
// USER_CREATED audit, and auto-link to the seeded Person profile by
// displayName. Idempotent: existing usernames are skipped.
// Generated temporary passwords are DISCARDED (never printed) — access
// goes through personal invite links from /broadcast, where each user
// sets their own password on first login.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/username";
import { createUserWithTemporaryPassword } from "@server/services/user-service";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else loadDotenv();

const PERSONNEL: { displayName: string; username: string }[] = [
  { displayName: "Kevinsy Monding", username: "kevinmonding" },
  { displayName: "Jeremiah Matoneng", username: "jeremiahmatoneng" },
  { displayName: "Hendy Lethulur", username: "hendylethulur" },
  { displayName: "Benyamin Toar Rembet", username: "toarrembet" },
  { displayName: "Nathanael Mewengkang", username: "nathanmewengkang" },
  { displayName: "Rebeca Mantiri", username: "rebecamantiri" },
  { displayName: "Kevin Kamagi", username: "kevinkamagi" },
  { displayName: "Holly K", username: "hollyk" },
];

async function main(): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { username: "aisaerang", role: "ADMIN", isActive: true },
    select: { id: true, username: true },
  });
  if (!admin) {
    console.error("Akun admin aisaerang tidak ditemukan/aktif.");
    process.exit(1);
  }
  let created = 0;
  let skipped = 0;
  for (const p of PERSONNEL) {
    const username = normalizeUsername(p.username);
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`- ${username}: sudah ada, dilewati.`);
      skipped += 1;
      continue;
    }
    const result = await createUserWithTemporaryPassword(admin.id, {
      username,
      displayName: p.displayName,
      role: "USER",
    });
    if (!result.ok) {
      console.error(`- ${username}: GAGAL (${result.error})`);
      process.exitCode = 1;
      continue;
    }
    console.log(`- ${username}: dibuat + profil tertaut.`);
    created += 1;
  }
  // Verify: every onboarded username has a linked Person profile.
  const linked = await prisma.person.count({
    where: {
      user: { username: { in: PERSONNEL.map((p) => p.username) } },
    },
  });
  console.log(
    `Selesai: ${created} dibuat, ${skipped} dilewati, ${linked}/8 profil tertaut.`,
  );
}

main()
  .catch((error) => {
    console.error("Onboarding gagal.");
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
