import { describe, expect, it } from 'vitest';

import { jwtAccessTokens } from '../../src/infrastructure/auth/jwt.access-token.adapter.ts';

const config = { secret: 'x'.repeat(32), issuer: 'aprovaai-test', audience: 'aprovaai-app', ttlSeconds: 900 };

describe('jwtAccessTokens', () => {
  it('emite e verifica o token de acesso', async () => {
    const tokens = jwtAccessTokens(config);
    const { token, expiresAt } = await tokens.issue('user-1', new Date());

    await expect(tokens.verify(token)).resolves.toBe('user-1');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('recusa token expirado, de outro emissor ou adulterado', async () => {
    const tokens = jwtAccessTokens(config);
    const expired = await tokens.issue('user-1', new Date(Date.now() - 3_600_000));
    const otherIssuer = await jwtAccessTokens({ ...config, issuer: 'outro' }).issue('user-1', new Date());
    const valid = await tokens.issue('user-1', new Date());

    await expect(tokens.verify(expired.token)).resolves.toBeNull();
    await expect(tokens.verify(otherIssuer.token)).resolves.toBeNull();
    await expect(tokens.verify(`${valid.token}x`)).resolves.toBeNull();
    await expect(tokens.verify('nem-é-jwt')).resolves.toBeNull();
  });

  it('exige segredo com pelo menos 32 bytes', () => {
    expect(() => jwtAccessTokens({ ...config, secret: 'curto' })).toThrow();
  });
});
