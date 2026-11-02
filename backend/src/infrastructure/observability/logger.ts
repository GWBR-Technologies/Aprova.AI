import pino from 'pino';

// JSON no stdout, coletado pelo Docker (§15.1 do guia). Texto de redação, tokens e chaves nunca
// aparecem em log: os caminhos abaixo são substituídos mesmo se alguém os registrar por engano.
const redactPaths = [
  'req.headers.authorization',
  'text',
  '*.text',
  'idToken',
  '*.idToken',
  'refreshToken',
  '*.refreshToken',
  'accessToken',
  '*.accessToken',
];

export function createLogger(service: string, level = 'info') {
  return pino({
    level,
    base: { service },
    redact: { paths: redactPaths, censor: '[omitido]' },
  });
}
