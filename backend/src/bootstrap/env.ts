// Leitura das variáveis de ambiente do §18 do guia. Valores nunca entram no repositório nem nos
// logs: uma variável ausente ou inválida derruba o processo na partida citando apenas o nome.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function requirePositiveInt(name: string): number {
  return parsePositive(name, requireEnv(name), Number.isInteger);
}

export function intEnv(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  return raw === undefined ? fallback : parsePositive(name, raw, Number.isInteger);
}

export function numberEnv(name: string): number | undefined {
  const raw = optionalEnv(name);
  return raw === undefined ? undefined : parsePositive(name, raw, Number.isFinite);
}

function parsePositive(name: string, raw: string, check: (n: number) => boolean): number {
  const value = Number(raw);
  if (!check(value) || value <= 0) throw new Error(`Variável de ambiente inválida: ${name}`);
  return value;
}
