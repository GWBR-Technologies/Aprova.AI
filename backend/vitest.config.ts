import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os testes de integração recriam os esquemas do mesmo banco de teste; arquivos em paralelo
    // derrubariam o esquema um do outro.
    fileParallelism: false,
  },
});
