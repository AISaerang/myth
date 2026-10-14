import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL ?? "";
  // TiDB Cloud speaks the MySQL protocol over TLS (port 4000).
  // Credentials are parsed here so they never appear in code or logs.
  const url = new URL(raw);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 4000,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    connectionLimit: 5,
    // TiDB Serverless can cold-start; allow generous connect time.
    connectTimeout: 30_000,
    acquireTimeout: 30_000,
    ssl: true,
  });
  return new PrismaClient({ adapter });
}

// Reuse a single client across hot-reloads in development.
// Production (serverless) creates one client per module instance, cached here.
// NOTE: a real DATABASE_URL is required before the first query runs;
// build/typecheck do not connect.
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
