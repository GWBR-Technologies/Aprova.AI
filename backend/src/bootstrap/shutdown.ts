import type { Logger } from '../application/ports/logger.port.ts';

/** Encerramento ordenado em SIGTERM e SIGINT, e registro de falhas que escaparam dos handlers. */
export function onShutdown(logger: Logger, close: () => Promise<void>) {
  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'Encerrando o processo');
    try {
      await close();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Falha ao encerrar o processo');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'uncaughtException'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
}
