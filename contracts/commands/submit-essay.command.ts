export type SubmitEssayPayload = {
  essayId: string; // UUID gerado no app
  text: string;
  // Tema e limites de tamanho do texto são definidos com o produto.
};
