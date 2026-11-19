import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log(
    `[vercel-build] Skipping prisma migrate deploy in ${process.env.VERCEL_ENV ?? "non-production"} environment.`,
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
