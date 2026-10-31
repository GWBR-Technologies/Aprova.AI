import { and, eq, sql } from 'drizzle-orm';

import { CommandIdConflict } from '../../application/errors.ts';
import type { CommandLogRepository } from '../../application/ports/command-log.port.ts';
import { canonicalJson, sha256 } from './canonical-json.ts';
import type { Executor } from './database.ts';
import { commandLog } from './schema.ts';

export function commandLogRepository(db: Executor): CommandLogRepository {
  return {
    async claim(userId, cmd, type) {
      const payloadHash = sha256(canonicalJson(cmd.payload));
      // Se outra transação reivindicou o mesmo commandId e ainda não terminou, o INSERT espera por
      // ela no índice único; só então devolve "nada inserido" (§6 do guia).
      const inserted = await db
        .insert(commandLog)
        .values({ userId, commandId: cmd.commandId, commandType: type, payloadHash, response: sql`'{}'::jsonb` })
        .onConflictDoNothing()
        .returning({ commandId: commandLog.commandId });
      if (inserted.length > 0) return { replayed: false };

      const [existing] = await db
        .select({ commandType: commandLog.commandType, payloadHash: commandLog.payloadHash, response: commandLog.response })
        .from(commandLog)
        .where(and(eq(commandLog.userId, userId), eq(commandLog.commandId, cmd.commandId)));
      if (!existing || existing.commandType !== type || !existing.payloadHash.equals(payloadHash)) {
        throw new CommandIdConflict();
      }
      return { replayed: true, response: existing.response };
    },

    async complete(userId, commandId, response) {
      await db
        .update(commandLog)
        .set({ response })
        .where(and(eq(commandLog.userId, userId), eq(commandLog.commandId, commandId)));
    },
  };
}
