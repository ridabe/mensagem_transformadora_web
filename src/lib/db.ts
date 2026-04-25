import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __mtPgPool?: Pool };

export function getDbPool(): Pool {
  if (globalForPg.__mtPgPool) return globalForPg.__mtPgPool;

  const connectionString = process.env.CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("CONNECTION_STRING não configurada no .env");
  }

  globalForPg.__mtPgPool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
  });

  return globalForPg.__mtPgPool;
}
