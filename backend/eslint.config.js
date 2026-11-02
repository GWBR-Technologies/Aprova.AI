import tseslint from 'typescript-eslint';

// Regras de dependência entre camadas (§4.1 do guia de implementação do back-end).
const layer = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

const infraLibs = ['bullmq', 'ioredis', 'pg', 'drizzle-orm', 'drizzle-orm/*', 'openai', 'fastify', '@fastify/*', 'pino'];

export default tseslint.config(
  { ignores: ['node_modules', 'migrations'] },
  ...tseslint.configs.recommended,
  layer(['src/domain/**'], [
    { group: ['**/application/**', '**/infrastructure/**', '**/api/**', '**/workers/**', '**/bootstrap/**', '@contracts/*', 'zod', ...infraLibs], message: 'domain só importa domain.' },
  ]),
  layer(['src/application/**'], [
    { group: ['**/infrastructure/**', '**/api/**', '**/workers/**', '**/bootstrap/**', ...infraLibs], message: 'application só importa domain e contracts.' },
  ]),
  layer(['src/infrastructure/**'], [
    { group: ['**/api/**', '**/workers/**', '**/bootstrap/**', '**/application/commands/**', '**/application/queries/**', '**/application/events/**'], message: 'infrastructure só importa application/ports, domain e contracts.' },
  ]),
  layer(['src/api/**'], [{ group: ['**/infrastructure/**', '**/domain/**', '**/workers/**', '**/bootstrap/**'], message: 'api só importa application e contracts.' }]),
  layer(['src/workers/**'], [{ group: ['**/infrastructure/**', '**/api/**', '**/bootstrap/**', ...infraLibs], message: 'workers só importam application e contracts.' }]),
);
