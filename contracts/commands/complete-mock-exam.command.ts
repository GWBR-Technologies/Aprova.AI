// Além do identificador, os campos de negócio são definidos com o produto e guardados como recebidos.
export type CompleteMockExamPayload = {
  mockExamId: string; // UUID gerado no app
  [field: string]: unknown;
};
