import * as SQLite from 'expo-sqlite';

import { createOutbox, type OutboxDb } from './outbox';
import { apiPost } from '../api/http';

let database: Promise<SQLite.SQLiteDatabase> | null = null;
function open() {
  database ??= SQLite.openDatabaseAsync('aprovaai.db');
  return database;
}

// Abertura preguiçosa: o banco só é aberto no primeiro comando ou consulta ao outbox.
const lazyDb: OutboxDb = {
  execAsync: async (sql) => (await open()).execAsync(sql),
  runAsync: async (sql, params) => {
    const result = await (await open()).runAsync(sql, params);
    return { changes: result.changes };
  },
  getAllAsync: async (sql, params) => (await open()).getAllAsync(sql, params),
  getFirstAsync: async (sql, params) => (await open()).getFirstAsync(sql, params),
};

const outbox = createOutbox({
  db: lazyDb,
  send: (route, envelope) => apiPost(`/v1/commands/${route}`, envelope),
});

export const enqueueCommand = outbox.enqueue;
export const flushOutbox = outbox.flush;
export const observeOutbox = outbox.observe;
export const getOutboxRow = outbox.get;
export const getOutboxRowByResource = outbox.getByResourceId;
export const listOutbox = outbox.list;
export const countPendingCommands = outbox.countPending;
export const discardCommand = outbox.discard;
export const discardAllCommands = outbox.discardAll;
export const purgeReceivedCommands = outbox.purgeReceived;
