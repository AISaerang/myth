// One-time bootstrap admin (docs/06-AUTHENTICATION-RBAC.md).
//
// Usage: npm run bootstrap:admin
// Reads BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD from
// .env.local (.env fallback). Idempotent: if the username already
// exists, nothing changes. The password is hashed immediately and
// NEVER printed or logged. Disable/remove these env vars after setup.

import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { normalizeUsername } from "@/lib/username";
import { usernameSchema } from "@/lib/validation/auth";
import { AuditAction, writeAudit } from "@/lib/audit";

if (existsSync(".env.local")) loadDotenv({ path: ".env.local" });
else loadDotenv();

async function main(): Promise<void> {
  const rawUsername = process.env.BOOTSTRAP_ADMIN_USERNAME ?? "";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";

  const parsedUsername = usernameSchema.safeParse(rawUsername);
  if (!parsedUsername.success) {
    console.error("BOOTSTRAP_ADMIN_USERNAME tidak valid.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error(
      "BOOTSTRAP_ADMIN_PASSWORD minimal 12 karakter atau belum diisi.",
    );
    process.exit(1);
  }

  const username = normalizeUsername(parsedUsername.data);
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin ${username} sudah ada; tidak ada perubahan.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      displayName: username,
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      isActive: true,
    },
  });
  await writeAudit({
    action: AuditAction.USER_CREATED,
    entityType: "User",
    entityId: user.id,
    summary: `Akun bootstrap ADMIN ${username} dibuat.`,
    metadata: { username, via: "bootstrap" },
  });
  console.log(
    `Admin ${username} dibuat. Login lalu ganti password sementara.`,
  );
}

main()
  .catch((error) => {
    console.error("Bootstrap gagal.");
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
