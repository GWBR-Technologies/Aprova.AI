import type { EssayQuotaExceededDetails } from '@contracts/api-error.ts';

// Erros de regra que a camada api traduz para o ApiError do §1.7. Lançá-los dentro de
// UnitOfWork.run desfaz a transação inteira, inclusive a reivindicação do commandId.

export class PremiumRequired extends Error {
  constructor() {
    super('Plano Premium necessário');
  }
}

export class EssayQuotaExceeded extends Error {
  readonly details: EssayQuotaExceededDetails;

  constructor(details: EssayQuotaExceededDetails) {
    super('Cota mensal de correções esgotada');
    this.details = details;
  }
}

export class CommandIdConflict extends Error {
  constructor() {
    super('commandId reutilizado com payload diferente');
  }
}

export class NotFound extends Error {
  constructor() {
    super('Recurso não encontrado');
  }
}

export class Unauthenticated extends Error {
  constructor() {
    super('Credencial ausente, inválida ou expirada');
  }
}

/** Comando válido no formato, mas incoerente com o estado (por exemplo, essayId já usado). */
export class InvalidCommand extends Error {}
