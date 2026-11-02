import { errors, jwtVerify, SignJWT } from 'jose';

import type { AccessTokenPort } from '../../application/ports/auth.port.ts';

type Config = { secret: string; issuer: string; audience: string; ttlSeconds: number };

// HS256 basta porque só a própria API emite e verifica o token de acesso (§13.2 do guia).
export function jwtAccessTokens(config: Config): AccessTokenPort {
  const key = new TextEncoder().encode(config.secret);
  if (key.byteLength < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 bytes');

  return {
    async issue(userId, now) {
      const issuedAt = Math.floor(now.getTime() / 1000);
      const expiresAt = issuedAt + config.ttlSeconds;
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuer(config.issuer)
        .setAudience(config.audience)
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt)
        .sign(key);
      return { token, expiresAt: new Date(expiresAt * 1000) };
    },

    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          issuer: config.issuer,
          audience: config.audience,
          algorithms: ['HS256'],
        });
        return typeof payload.sub === 'string' ? payload.sub : null;
      } catch (err) {
        if (err instanceof errors.JOSEError) return null;
        throw err;
      }
    },
  };
}
