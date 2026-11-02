import { randomBytes, randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';

import type { RefreshTokenRepository, UserRepository } from '../../application/ports/auth.port.ts';
import { sha256 } from './canonical-json.ts';
import type { Executor } from './database.ts';
import { refreshTokens, users } from './schema.ts';

export function userRepository(db: Executor): UserRepository {
  return {
    async findOrCreate(provider, subject) {
      const inserted = await db
        .insert(users)
        .values({ id: randomUUID(), provider, providerSub: subject })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (inserted[0]) return inserted[0].id;

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.provider, provider), eq(users.providerSub, subject)));
      if (!existing) throw new Error('Usuário não encontrado depois do conflito de inserção');
      return existing.id;
    },
  };
}

// O banco guarda só o SHA-256 do refresh token; o valor em si existe apenas com o cliente (§13.2 do guia).
export function refreshTokenRepository(db: Executor): RefreshTokenRepository {
  return {
    async create(userId, familyId, expiresAt) {
      const token = randomBytes(32).toString('base64url');
      await db.insert(refreshTokens).values({ id: randomUUID(), userId, familyId, tokenHash: sha256(token), expiresAt });
      return token;
    },

    async findForUpdate(token) {
      const [row] = await db
        .select({
          id: refreshTokens.id,
          userId: refreshTokens.userId,
          familyId: refreshTokens.familyId,
          expiresAt: refreshTokens.expiresAt,
          revokedAt: refreshTokens.revokedAt,
        })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, sha256(token)))
        .for('update');
      return row ?? null;
    },

    async revoke(id, at) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: at })
        .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
    },

    async revokeFamily(familyId, at) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: at })
        .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
    },
  };
}
