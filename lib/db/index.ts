import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "@/lib/db/schema";

const globalForNeon = globalThis as typeof globalThis & { neonPool?: Pool };

function verifiedConnectionString(value: string | undefined) {
  if (!value) throw new Error("DATABASE_URL is required to connect to the club database.");
  const url = new URL(value);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export const pool =
  globalForNeon.neonPool ??
  new Pool({
    connectionString: verifiedConnectionString(process.env.DATABASE_URL),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForNeon.neonPool = pool;
}

export const db = drizzle(pool, { schema });
