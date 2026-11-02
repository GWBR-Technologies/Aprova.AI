import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDatabase } from '../infrastructure/persistence/database.ts';
import { requireEnv } from './env.ts';

// Executado antes da API, dos Workers e do relay. As migrações só avançam (expandir e depois
// contrair): drizzle-kit não gera reversões.
const db = createDatabase(requireEnv('DATABASE_URL'), 1);
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../migrations', import.meta.url)) });
  console.log('Migrações aplicadas');
} finally {
  await db.$client.end();
}
