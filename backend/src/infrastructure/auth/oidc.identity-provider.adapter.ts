import { createRemoteJWKSet, errors, jwtVerify } from 'jose';

import type { IdentityProviderPort } from '../../application/ports/auth.port.ts';

import type { IdentityProvider } from '@contracts/auth/auth.ts';

// Endereços de chaves e emissores conforme a documentação do Google e da Apple; reconfirmar a
// cada mudança dos provedores (§13.1 do guia).
export type ProviderEndpoints = Record<IdentityProvider, { jwksUrl: string; issuers: string[] }>;

const providers: ProviderEndpoints = {
  google: {
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
  },
  apple: {
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
  },
};

type Config = { googleClientIds: string[]; appleClientId: string };

export function oidcIdentityProvider(config: Config, endpoints: ProviderEndpoints = providers): IdentityProviderPort {
  const keys = {
    google: createRemoteJWKSet(new URL(endpoints.google.jwksUrl)),
    apple: createRemoteJWKSet(new URL(endpoints.apple.jwksUrl)),
  };
  const audiences: Record<IdentityProvider, string[]> = {
    google: config.googleClientIds,
    apple: [config.appleClientId],
  };

  return {
    async verify(provider, idToken) {
      try {
        const { payload } = await jwtVerify(idToken, keys[provider], {
          issuer: endpoints[provider].issuers,
          audience: audiences[provider],
          algorithms: ['RS256'],
        });
        return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
      } catch (err) {
        // Token inválido é recusa do usuário; falha ao buscar as chaves do provedor é indisponibilidade.
        if (err instanceof errors.JOSEError && !(err instanceof errors.JWKSTimeout)) return null;
        throw err;
      }
    },
  };
}
