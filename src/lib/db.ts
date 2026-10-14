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

function getOrCreateClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

// Lazily create the client on first use (not at import time) so that
// `next build` / typecheck succeed even when DATABASE_URL is not set
// (e.g. Vercel build before env vars are configured). A real
// DATABASE_URL is still required before the first query runs.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
