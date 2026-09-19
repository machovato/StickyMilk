import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 requires a driver adapter at runtime (the schema no longer
// carries a connection URL — see prisma/schema.prisma and prisma.config.ts).
// Swapping to Postgres later means swapping this adapter (e.g.
// @prisma/adapter-pg) and the `provider` in schema.prisma; nothing else
// in the app touches the database directly.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
