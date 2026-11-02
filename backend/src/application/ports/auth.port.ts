import type { IdentityProvider } from '@contracts/auth/auth.ts';

export interface IdentityProviderPort {
  /** Valida o idToken do provedor e devolve o `sub`; null quando o token é inválido. */
  verify(provider: IdentityProvider, idToken: string): Promise<string | null>;
}

export interface AccessTokenPort {
  issue(userId: string, now: Date): Promise<{ token: string; expiresAt: Date }>;
  /** Devolve o userId do token ou null quando é inválido ou expirou. */
  verify(token: string): Promise<string | null>;
}

export interface UserRepository {
  findOrCreate(provider: IdentityProvider, subject: string): Promise<string>;
}

export type StoredRefreshToken = {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface RefreshTokenRepository {
  /** Gera um token opaco, guarda só o hash e devolve o token. */
  create(userId: string, familyId: string, expiresAt: Date): Promise<string>;
  /** Busca pelo hash do token e bloqueia a linha até o fim da transação. */
  findForUpdate(token: string): Promise<StoredRefreshToken | null>;
  revoke(id: string, at: Date): Promise<void>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
}
