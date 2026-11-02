import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { oidcIdentityProvider } from '../../src/infrastructure/auth/oidc.identity-provider.adapter.ts';

// Um provedor falso local serve o JWKS; nenhuma chamada sai para o Google ou a Apple.
let server: Server;
let jwksUrl: string;
let privateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  jwksUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/keys`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const sign = (claims: { iss?: string; aud?: string; sub?: string; expiresIn?: string }) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(claims.iss ?? 'https://accounts.google.com')
    .setAudience(claims.aud ?? 'google-client')
    .setSubject(claims.sub ?? 'google-sub-1')
    .setIssuedAt()
    .setExpirationTime(claims.expiresIn ?? '5m')
    .sign(privateKey);

function provider() {
  return oidcIdentityProvider(
    { googleClientIds: ['google-client'], appleClientId: 'apple-client' },
    {
      google: { jwksUrl, issuers: ['https://accounts.google.com'] },
      apple: { jwksUrl, issuers: ['https://appleid.apple.com'] },
    },
  );
}

describe('oidcIdentityProvider', () => {
  it('aceita idToken válido e devolve o sub', async () => {
    await expect(provider().verify('google', await sign({}))).resolves.toBe('google-sub-1');
  });

  it('recusa aud, iss e exp errados', async () => {
    const p = provider();
    await expect(p.verify('google', await sign({ aud: 'outro-app' }))).resolves.toBeNull();
    await expect(p.verify('google', await sign({ iss: 'https://evil.example' }))).resolves.toBeNull();
    await expect(p.verify('google', await sign({ expiresIn: '-1m' }))).resolves.toBeNull();
  });

  it('não aceita token do Google como token da Apple', async () => {
    await expect(provider().verify('apple', await sign({}))).resolves.toBeNull();
  });

  it('recusa texto que não é JWT', async () => {
    await expect(provider().verify('google', 'lixo')).resolves.toBeNull();
  });
});
