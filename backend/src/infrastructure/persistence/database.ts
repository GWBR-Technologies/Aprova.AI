import { drizzle, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import pg from 'pg';

export function createDatabase(url: string, maxConnections = 10) {
  const pool = new pg.Pool({ connectionString: url, max: maxConnections });
  return drizzle({ client: pool });
}

export type Database = ReturnType<typeof createDatabase>;

/** O banco ou uma transação aberta: os repositórios funcionam sobre qualquer um dos dois. */
export type Executor = PgDatabase<NodePgQueryResultHKT>;
