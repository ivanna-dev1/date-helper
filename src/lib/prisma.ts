import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 does not talk to the database on its own. It needs a driver
// adapter — a normal Node database driver. For PostgreSQL that is `pg`,
// wrapped by PrismaPg.
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Check your .env file.");
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// In dev mode Next.js reloads files after every change. Each reload would
// run createPrismaClient() again and open a new pool of database connections.
// Old pools stay open, so after many reloads the database says
// "too many connections". To avoid this we keep one client on globalThis,
// because globalThis survives a reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In production the app starts once, so we don't need this.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
